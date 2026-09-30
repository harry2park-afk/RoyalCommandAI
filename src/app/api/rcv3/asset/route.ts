import { z } from "zod";
import { access, reply, failure, input } from "@/lib/rcv3/access";
const imageSchema = z.object({ data: z.string().max(1300000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/) }).strict();
export async function POST(request: Request) {
  try {
    const d = z.object({ roomId: z.string().uuid(), image: imageSchema }).strict().parse(await input(request));
    const a = await access(d.roomId), id = crypto.randomUUID();
    const bytes = Buffer.from(d.image.data.split(",")[1], "base64");
    const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    const webp = bytes.toString("ascii",0,4)==="RIFF" && bytes.toString("ascii",8,12)==="WEBP";
    if (!(png || jpeg || webp) || bytes.length > 950000) throw new Error("RCV3_IMAGE");
    await a.store.insert(`assets/${id}.txt`, d.image);
    return reply({ id, image: d.image });
  } catch(e) { return failure(e); }
}
