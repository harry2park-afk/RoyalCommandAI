import { z } from "zod";
import { access, reply, failure, input } from "@/lib/rcv3/access";
const fileSchema = z.object({ id: z.string().uuid(), name: z.string().min(1).max(150), text: z.string().max(100000) }).strict();
export async function GET(request: Request) {
  try {
    const a = await access(new URL(request.url).searchParams.get("room") ?? "");
    const list = await a.store.list("files", 100);
    return reply({ files: (await Promise.all(list.map(f => a.store.read(`files/${f.name}`)))).map(f => fileSchema.parse(f)) });
  } catch(e) { return failure(e); }
}
export async function POST(request: Request) {
  try {
    const d = z.object({ roomId: z.string().uuid(), file: fileSchema }).strict().parse(await input(request, 150000));
    const a = await access(d.roomId);
    if ((await a.store.list("files",100)).length >= 100) throw new Error("RCV3_LIMIT");
    await a.store.insert(`files/${d.file.id}.txt`, d.file);
    return reply({ file: d.file });
  } catch(e) { return failure(e); }
}
