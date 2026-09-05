import { ROOM_HEADER_LAYOUT_ELEMENT_IDS, RoomHeaderLayoutElementId } from "@/lib/layout-editor";

export const ROOM_HEADER_STYLE_CONFIG_VERSION = 1 as const;

export type RoomHeaderStylePatch = {
  borderColor?: string;
  backgroundColor?: string;
  colourStrength?: number;
  textColor?: string;
  borderWidth?: number;
};

export type RoomHeaderStyleConfig = {
  schemaVersion: typeof ROOM_HEADER_STYLE_CONFIG_VERSION;
  screenId: "ROOM_HEADER_STYLE";
  updatedAt: string;
  elements: Partial<Record<RoomHeaderLayoutElementId, RoomHeaderStylePatch>>;
};

const ELEMENT_IDS = new Set<string>(ROOM_HEADER_LAYOUT_ELEMENT_IDS);
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

function safeColour(value: unknown) {
  if (typeof value !== "string") return undefined;
  const colour = value.trim();
  return HEX_COLOUR.test(colour) ? colour.toUpperCase() : undefined;
}

function safeInteger(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function emptyRoomHeaderStyleConfig(): RoomHeaderStyleConfig {
  return {
    schemaVersion: ROOM_HEADER_STYLE_CONFIG_VERSION,
    screenId: "ROOM_HEADER_STYLE",
    updatedAt: new Date(0).toISOString(),
    elements: {},
  };
}

export function sanitiseRoomHeaderStyleConfig(value: unknown): RoomHeaderStyleConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (input.screenId !== "ROOM_HEADER_STYLE") return undefined;
  const rawElements = input.elements;
  if (!rawElements || typeof rawElements !== "object" || Array.isArray(rawElements)) return undefined;

  const elements: RoomHeaderStyleConfig["elements"] = {};
  for (const [id, rawPatch] of Object.entries(rawElements as Record<string, unknown>)) {
    if (!ELEMENT_IDS.has(id) || !rawPatch || typeof rawPatch !== "object" || Array.isArray(rawPatch)) continue;
    const raw = rawPatch as Record<string, unknown>;
    const patch: RoomHeaderStylePatch = {};
    const borderColor = safeColour(raw.borderColor);
    const backgroundColor = safeColour(raw.backgroundColor);
    const textColor = safeColour(raw.textColor);
    const colourStrength = safeInteger(raw.colourStrength, 1, 10);
    const borderWidth = safeInteger(raw.borderWidth, 1, 5);
    if (borderColor !== undefined) patch.borderColor = borderColor;
    if (backgroundColor !== undefined) patch.backgroundColor = backgroundColor;
    if (textColor !== undefined) patch.textColor = textColor;
    if (colourStrength !== undefined) patch.colourStrength = colourStrength;
    if (borderWidth !== undefined) patch.borderWidth = borderWidth;
    elements[id as RoomHeaderLayoutElementId] = patch;
  }

  return {
    schemaVersion: ROOM_HEADER_STYLE_CONFIG_VERSION,
    screenId: "ROOM_HEADER_STYLE",
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt.length <= 64
      ? input.updatedAt
      : new Date(0).toISOString(),
    elements,
  };
}
