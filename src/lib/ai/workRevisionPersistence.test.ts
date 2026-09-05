import { describe, expect, it } from "vitest";
import {
  WORK_REVISION_UNIQUE_CONSTRAINT,
  isWorkRevisionConflict,
  persistWithRevisionRetry,
  type RevisionedWorkRecord,
  type WorkRevisionStore,
} from "./workRevisionPersistence";

type TestRecord = RevisionedWorkRecord & {
  title: string;
};

function createSharedStore() {
  const byRequest = new Map<string, TestRecord>();
  const byRevision = new Map<string, TestRecord>();

  const storeFor = (requestKey: string): WorkRevisionStore<TestRecord> => ({
    async persist(record) {
      // Yield once so Promise.all callers exercise the shared uniqueness boundary.
      await Promise.resolve();

      if (byRequest.has(requestKey)) return { error: null };

      const revisionKey = `${record.workId}:${record.revision}`;
      if (byRevision.has(revisionKey)) {
        return {
          error: {
            code: "23505",
            message: `duplicate key value violates unique constraint "${WORK_REVISION_UNIQUE_CONSTRAINT}"`,
          },
        };
      }

      const persisted = { ...record };
      byRequest.set(requestKey, persisted);
      byRevision.set(revisionKey, persisted);
      return { error: null };
    },

    async findByRequestKey() {
      const record = byRequest.get(requestKey);
      return record ? { ...record } : null;
    },

    async findLatestRevision(workId) {
      let latest: number | null = null;
      for (const record of byRevision.values()) {
        if (record.workId !== workId) continue;
        latest = latest === null ? record.revision : Math.max(latest, record.revision);
      }
      return latest;
    },
  });

  return {
    storeFor,
    rowCount: () => byRequest.size,
  };
}

describe("work revision persistence", () => {
  it("recognizes only the room work revision unique conflict", () => {
    expect(isWorkRevisionConflict({
      code: "23505",
      message: `duplicate key value violates unique constraint "${WORK_REVISION_UNIQUE_CONSTRAINT}"`,
    })).toBe(true);

    expect(isWorkRevisionConflict({
      code: "23505",
      message: "duplicate key value violates unique constraint room_work_records_room_id_request_key_key",
    })).toBe(false);

    expect(isWorkRevisionConflict({
      code: "42501",
      message: `permission denied near ${WORK_REVISION_UNIQUE_CONSTRAINT}`,
    })).toBe(false);
  });

  it("assigns distinct sequential revisions to parallel distinct continuations", async () => {
    const db = createSharedStore();
    const initialA: TestRecord = {
      workId: "RC-20260830-TEST",
      revision: 2,
      parentRevision: 1,
      title: "Continuation A",
    };
    const initialB: TestRecord = {
      workId: "RC-20260830-TEST",
      revision: 2,
      parentRevision: 1,
      title: "Continuation B",
    };

    const [resultA, resultB] = await Promise.all([
      persistWithRevisionRetry(initialA, db.storeFor("request-a")),
      persistWithRevisionRetry(initialB, db.storeFor("request-b")),
    ]);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    if (!resultA.ok || !resultB.ok) return;

    const records = [resultA.record, resultB.record]
      .sort((left, right) => left.revision - right.revision);

    expect(records.map((record) => record.revision)).toEqual([2, 3]);
    expect(records[0].parentRevision).toBe(1);
    expect(records[1].parentRevision).toBe(2);
    expect(db.rowCount()).toBe(2);
  });

  it("keeps an exact repeated request idempotent", async () => {
    const db = createSharedStore();
    const initial: TestRecord = {
      workId: "RC-20260830-IDEMPOTENT",
      revision: 2,
      parentRevision: 1,
      title: "Same request",
    };
    const store = db.storeFor("same-request-key");

    const [first, second] = await Promise.all([
      persistWithRevisionRetry(initial, store),
      persistWithRevisionRetry(initial, store),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.record.revision).toBe(2);
    expect(second.record.revision).toBe(2);
    expect(first.record.parentRevision).toBe(1);
    expect(second.record.parentRevision).toBe(1);
    expect(db.rowCount()).toBe(1);
  });

  it("does not reinterpret unrelated database failures as revision conflicts", async () => {
    const store: WorkRevisionStore<TestRecord> = {
      async persist() {
        return { error: { code: "42501", message: "permission denied" } };
      },
      async findByRequestKey() {
        return null;
      },
      async findLatestRevision() {
        return null;
      },
    };

    const result = await persistWithRevisionRetry({
      workId: "RC-20260830-PERMISSION",
      revision: 1,
      title: "Permission failure",
    }, store);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("initial_error");
    expect(result.retries).toBe(0);
  });

  it("fails closed when a revision conflict cannot be reconciled within the retry bound", async () => {
    const store: WorkRevisionStore<TestRecord> = {
      async persist() {
        return {
          error: {
            code: "23505",
            message: `duplicate key value violates unique constraint "${WORK_REVISION_UNIQUE_CONSTRAINT}"`,
          },
        };
      },
      async findByRequestKey() {
        return null;
      },
      async findLatestRevision() {
        return 2;
      },
    };

    const result = await persistWithRevisionRetry({
      workId: "RC-20260830-EXHAUST",
      revision: 2,
      parentRevision: 1,
      title: "Retry exhaustion",
    }, store, 2);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("conflict_unresolved");
    expect(result.retries).toBe(2);
  });
});
