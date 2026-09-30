import { z } from "zod";

// Presentation only. No URLs, code, provider credentials or action overrides.
export const ROOM6_BUTTONS = ["chat", "secretary", "workspace"] as const;
export type Room6ButtonId = typeof ROOM6_BUTTONS[number];
const colour = z.string().regex(/^#[0-9a-f]{6}$/i);
const button = z.object({
  id: z.enum(ROOM6_BUTTONS), label: z.string().trim().min(1).max(40),
  x: z.number().min(0).max(85), y: z.number().min(0).max(85),
  width: z.number().min(90).max(280), height: z.number().min(44).max(120),
  colour, background: colour, opacity: z.number().min(0).max(1),
}).strict();
export const room6DesignSchema = z.object({
  version: z.literal(1),
  background: z.enum(["plain", "navy", "warm", "image"]),
  image: z.string().max(1_400_000).regex(/^$|^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
  buttons: z.array(button).min(1).max(ROOM6_BUTTONS.length),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.buttons.map(b => b.id)).size !== value.buttons.length || !value.buttons.some(b => b.id === "chat")) {
    ctx.addIssue({ code: "custom", message: "Chat is required and button IDs must be unique." });
  }
  if (value.background === "image" && !value.image) ctx.addIssue({ code: "custom", message: "Background image required." });
});
export type Room6Design = z.infer<typeof room6DesignSchema>;
export const ROOM6_LABELS: Record<Room6ButtonId, string> = { chat: "AI 대화", secretary: "비서", workspace: "기존 업무방" };
export function defaultRoom6Button(id: Room6ButtonId, index = ROOM6_BUTTONS.indexOf(id)): Room6Design["buttons"][number] {
  return { id, label: ROOM6_LABELS[id], x: 8 + index * 26, y: 42, width: 150, height: 56, colour: "#FFE18A", background: "#173663", opacity: 0.95 };
}
export function defaultRoom6Design(): Room6Design {
  return { version: 1, background: "plain", image: "", buttons: [defaultRoom6Button("chat"), defaultRoom6Button("workspace", 1)] };
}
export function room6RevisionName(revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > 9999999999) throw new Error("Invalid revision");
  return `${String(revision).padStart(10, "0")}.txt`;
}
