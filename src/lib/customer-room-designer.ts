import { ROOM_HEADER_LAYOUT_ELEMENT_IDS, RoomHeaderLayoutElementId } from "@/lib/layout-editor";

export const CUSTOMER_ROOM_DESIGN_VERSION = 1 as const;

export type CustomerRoomDesignPatch = {
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  label?: string;
  borderColor?: string;
  backgroundColor?: string;
  colourStrength?: number;
  textColor?: string;
  borderWidth?: number;
};

export type CustomerRoomDesignConfig = {
  schemaVersion: typeof CUSTOMER_ROOM_DESIGN_VERSION;
  screenId: "ROOM_HEADER";
  updatedAt: string;
  elements: Partial<Record<RoomHeaderLayoutElementId, CustomerRoomDesignPatch>>;
};

const ELEMENT_IDS = new Set<string>(ROOM_HEADER_LAYOUT_ELEMENT_IDS);
const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

function finiteNumber(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, Math.round(value * 10) / 10));
}

function safeColour(value: unknown) {
  if (typeof value !== "string") return undefined;
  const colour = value.trim();
  return HEX_COLOUR.test(colour) ? colour.toUpperCase() : undefined;
}

export function emptyCustomerRoomDesignConfig(): CustomerRoomDesignConfig {
  return {
    schemaVersion: CUSTOMER_ROOM_DESIGN_VERSION,
    screenId: "ROOM_HEADER",
    updatedAt: new Date(0).toISOString(),
    elements: {},
  };
}

export function sanitiseCustomerRoomDesignConfig(value: unknown): CustomerRoomDesignConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (input.screenId !== "ROOM_HEADER") return undefined;
  const rawElements = input.elements;
  if (!rawElements || typeof rawElements !== "object" || Array.isArray(rawElements)) return undefined;

  const elements: CustomerRoomDesignConfig["elements"] = {};
  for (const [id, rawPatch] of Object.entries(rawElements as Record<string, unknown>)) {
    if (!ELEMENT_IDS.has(id) || !rawPatch || typeof rawPatch !== "object" || Array.isArray(rawPatch)) continue;
    const raw = rawPatch as Record<string, unknown>;
    const patch: CustomerRoomDesignPatch = {};

    const offsetX = finiteNumber(raw.offsetX, -1200, 1200);
    const offsetY = finiteNumber(raw.offsetY, -92, 92);
    const width = finiteNumber(raw.width, 24, 520);
    const height = finiteNumber(raw.height, 20, 92);
    const fontSize = finiteNumber(raw.fontSize, 8, 32);
    const borderColor = safeColour(raw.borderColor);
    const backgroundColor = safeColour(raw.backgroundColor);
    const colourStrength = finiteNumber(raw.colourStrength, 1, 10);
    const textColor = safeColour(raw.textColor);
    const borderWidth = finiteNumber(raw.borderWidth, 1, 5);

    if (offsetX !== undefined) patch.offsetX = offsetX;
    if (offsetY !== undefined) patch.offsetY = offsetY;
    if (width !== undefined) patch.width = width;
    if (height !== undefined) patch.height = height;
    if (fontSize !== undefined) patch.fontSize = fontSize;
    if (borderColor !== undefined) patch.borderColor = borderColor;
    if (backgroundColor !== undefined) patch.backgroundColor = backgroundColor;
    if (colourStrength !== undefined) patch.colourStrength = Math.round(colourStrength);
    if (textColor !== undefined) patch.textColor = textColor;
    if (borderWidth !== undefined) patch.borderWidth = Math.round(borderWidth);
    if (typeof raw.label === "string") {
      const label = raw.label.trim().replace(/\s+/g, " ").slice(0, 80);
      if (label) patch.label = label;
    }

    elements[id as RoomHeaderLayoutElementId] = patch;
  }

  return {
    schemaVersion: CUSTOMER_ROOM_DESIGN_VERSION,
    screenId: "ROOM_HEADER",
    updatedAt: typeof input.updatedAt === "string" && input.updatedAt.length <= 64
      ? input.updatedAt
      : new Date(0).toISOString(),
    elements,
  };
}
