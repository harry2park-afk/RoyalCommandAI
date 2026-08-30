export const WORK_REVISION_UNIQUE_CONSTRAINT = "room_work_records_room_id_work_id_revision_key";
export const DEFAULT_WORK_REVISION_MAX_ATTEMPTS = 8;

export type WorkRevisionError = {
  code?: string | null;
  message?: string | null;
};

export type RevisionedWorkRecord = {
  workId: string;
  revision: number;
  parentRevision?: number;
};

export type WorkRevisionStore<T extends RevisionedWorkRecord> = {
  persist(record: T): Promise<{ error: WorkRevisionError | null }>;
  findByRequestKey(): Promise<T | null>;
  findLatestRevision(workId: string): Promise<number | null>;
};

export type WorkRevisionPersistResult<T extends RevisionedWorkRecord> =
  | {
      ok: true;
      record: T;
      retries: number;
    }
  | {
      ok: false;
      kind: "initial_error" | "authoritative_missing" | "conflict_unresolved";
      retries: number;
      error?: WorkRevisionError;
    };

export function isWorkRevisionConflict(error: WorkRevisionError | null | undefined) {
  return Boolean(
    error
      && error.code === "23505"
      && error.message?.includes(WORK_REVISION_UNIQUE_CONSTRAINT),
  );
}

export async function persistWithRevisionRetry<T extends RevisionedWorkRecord>(
  initial: T,
  store: WorkRevisionStore<T>,
  maxAttempts = DEFAULT_WORK_REVISION_MAX_ATTEMPTS,
): Promise<WorkRevisionPersistResult<T>> {
  const attempts = Math.max(1, Math.floor(maxAttempts));
  let candidate = initial;
  let sawRevisionConflict = false;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let persistError: WorkRevisionError | null;
    try {
      ({ error: persistError } = await store.persist(candidate));
    } catch (error) {
      return {
        ok: false,
        kind: sawRevisionConflict ? "conflict_unresolved" : "initial_error",
        retries: attempt,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }

    if (!persistError) {
      try {
        const authoritative = await store.findByRequestKey();
        if (authoritative) {
          return {
            ok: true,
            record: authoritative,
            retries: attempt,
          };
        }
      } catch (error) {
        return {
          ok: false,
          kind: sawRevisionConflict ? "conflict_unresolved" : "authoritative_missing",
          retries: attempt,
          error: { message: error instanceof Error ? error.message : String(error) },
        };
      }

      return {
        ok: false,
        kind: sawRevisionConflict ? "conflict_unresolved" : "authoritative_missing",
        retries: attempt,
      };
    }

    if (!isWorkRevisionConflict(persistError)) {
      return {
        ok: false,
        kind: sawRevisionConflict ? "conflict_unresolved" : "initial_error",
        retries: attempt,
        error: persistError,
      };
    }

    sawRevisionConflict = true;

    try {
      const existing = await store.findByRequestKey();
      if (existing) {
        return {
          ok: true,
          record: existing,
          retries: attempt + 1,
        };
      }

      const latestRevision = await store.findLatestRevision(candidate.workId);
      if (!Number.isInteger(latestRevision) || (latestRevision ?? 0) < 1) {
        return {
          ok: false,
          kind: "conflict_unresolved",
          retries: attempt + 1,
          error: persistError,
        };
      }

      candidate = {
        ...candidate,
        parentRevision: latestRevision as number,
        revision: (latestRevision as number) + 1,
      };
    } catch (error) {
      return {
        ok: false,
        kind: "conflict_unresolved",
        retries: attempt + 1,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  return {
    ok: false,
    kind: sawRevisionConflict ? "conflict_unresolved" : "initial_error",
    retries: attempts,
    error: sawRevisionConflict
      ? { code: "23505", message: `retry limit reached for ${WORK_REVISION_UNIQUE_CONSTRAINT}` }
      : undefined,
  };
}
