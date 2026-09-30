import { describe, expect, it } from "vitest";
import { defaultRoom6Button, defaultRoom6Design, room6DesignSchema, room6RevisionName } from "./room6-design";

describe("Room6 locked actions and portable presentation", () => {
  it("starts without an optional secretary and keeps chat usable", () => {
    expect(defaultRoom6Design().buttons.map(b => b.id)).toEqual(["chat", "workspace"]);
    expect(room6DesignSchema.parse(defaultRoom6Design())).toEqual(defaultRoom6Design());
  });
  it("allows moving/renaming a transparent secretary without changing its ID", () => {
    const design = defaultRoom6Design();
    design.buttons.push({ ...defaultRoom6Button("secretary"), x: 85, y: 85, label: "Katie", opacity: 0 });
    expect(room6DesignSchema.parse(design).buttons[2].id).toBe("secretary");
  });
  it("rejects action injection and secret/runtime fields in imported templates", () => {
    const design = defaultRoom6Design();
    expect(room6DesignSchema.safeParse({ ...design, apiKey: "secret" }).success).toBe(false);
    expect(room6DesignSchema.safeParse({ ...design, buttons: [{ ...design.buttons[0], href: "javascript:alert(1)" }] }).success).toBe(false);
    expect(room6DesignSchema.safeParse({ ...design, buttons: [{ ...design.buttons[0], id: "execute-code" }] }).success).toBe(false);
  });
  it("rejects duplicate buttons, removal of chat, unsafe images and offscreen positions", () => {
    const design = defaultRoom6Design();
    for (const bad of [
      { ...design, buttons: [design.buttons[0], design.buttons[0]] },
      { ...design, buttons: [design.buttons[1]] },
      { ...design, background: "image", image: "data:image/svg+xml;base64,PHN2Zz4=" },
      { ...design, buttons: [{ ...design.buttons[0], x: 1000 }] },
    ]) expect(room6DesignSchema.safeParse(bad).success).toBe(false);
  });
  it("orders revision names lexically and rejects exhausted versions", () => {
    expect(room6RevisionName(10) > room6RevisionName(9)).toBe(true);
    expect(() => room6RevisionName(10000000000)).toThrow();
  });
});
