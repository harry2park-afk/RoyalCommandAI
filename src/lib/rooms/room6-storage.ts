import { createClient } from "@/lib/supabase/server";
import { defaultRoom6Design, room6DesignSchema, room6RevisionName, type Room6Design } from "./room6-design";

export const ROOM6_BUCKET = "matter-documents";
type Client = Awaited<ReturnType<typeof createClient>>;
export function room6Prefix(userId: string, roomId: string) {
  if (![userId, roomId].every(v => /^[0-9a-f-]{36}$/i.test(v))) throw new Error("Invalid owner or room");
  return `${userId}/${roomId}/rc-room6-config-v1`;
}
export async function readRoom6Design(db: Client, userId: string, roomId: string) {
  const prefix = room6Prefix(userId, roomId);
  const bucket = db.storage.from(ROOM6_BUCKET);
  const listed = await bucket.list(prefix, { limit: 1, sortBy: { column: "name", order: "desc" } });
  if (listed.error) throw new Error("ROOM6_STORAGE_READ");
  const file = listed.data?.[0];
  if (!file) return { revision: 0, design: defaultRoom6Design() };
  if (!/^\d{10}\.txt$/.test(file.name)) throw new Error("ROOM6_STORAGE_INVALID");
  const revision = Number(file.name.slice(0, 10));
  if (revision < 1) throw new Error("ROOM6_STORAGE_INVALID");
  const downloaded = await bucket.download(`${prefix}/${file.name}`);
  if (downloaded.error || !downloaded.data || downloaded.data.size > 1_500_000) throw new Error("ROOM6_STORAGE_READ");
  const parsed = room6DesignSchema.safeParse(JSON.parse(await downloaded.data.text()));
  if (!parsed.success) throw new Error("ROOM6_STORAGE_INVALID");
  return { revision, design: parsed.data };
}
export async function writeRoom6Design(db: Client, userId: string, roomId: string, expectedRevision: number, design: Room6Design) {
  const current = await readRoom6Design(db, userId, roomId);
  if (current.revision !== expectedRevision) throw new Error("ROOM6_CONFLICT");
  const revision = current.revision + 1;
  const path = `${room6Prefix(userId, roomId)}/${room6RevisionName(revision)}`;
  const result = await db.storage.from(ROOM6_BUCKET).upload(path, JSON.stringify(room6DesignSchema.parse(design)), {
    contentType: "text/plain", upsert: false, cacheControl: "0",
  });
  if (result.error) {
    if (/duplicate|already exists/i.test(result.error.message)) throw new Error("ROOM6_CONFLICT");
    throw new Error("ROOM6_STORAGE_WRITE");
  }
  return { revision, design };
}
