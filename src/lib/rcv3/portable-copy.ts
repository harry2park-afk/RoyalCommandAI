import { portableDesign } from "../../../rcv3/core.mjs";
import { stateSchema, type CloudState } from "./cloud-state";

// Runtime connections, owner preferences, custom text and assets are deliberately
// absent. New fields added to CloudState cannot silently become exportable.
export function portableRoomState(source: CloudState, name: string, newId: (index: number) => string): CloudState {
  const design = portableDesign(source.design, newId);
  return stateSchema.parse({
    revision: 1, release: "rcv3-1", name,
    design,
    connectedProviders: ["openai"], selectedProviders: ["openai"], secretaryRoomId: null, gmailEnabled: false,
    appearances: {},
    bindings: Object.fromEntries(design.buttons.map((button: { id: string; capability: string }) => [button.id, button.capability])),
  });
}
