import {
  ACCOUNTING_PROFESSIONAL_ROOMS,
  LEGAL_PROFESSIONAL_ROOMS,
  PROFESSIONAL_ROOM_CATALOG,
  type ProfessionalDomain,
  type ProfessionalRoomDefinition,
} from "./professional-room-core";

export type ProfessionalRoomDirectoryItem = {
  id: string;
  productId: string;
  label: string;
  domain: ProfessionalDomain;
  templateId: "legal" | "accounting";
  vault: ProfessionalRoomDefinition["vault"];
  specialtyPacks: boolean;
};

function toDirectoryItem(room: ProfessionalRoomDefinition): ProfessionalRoomDirectoryItem {
  return {
    id: room.catalogId,
    productId: room.productId,
    label: room.name,
    domain: room.domain,
    templateId: room.domain === "legal" ? "legal" : "accounting",
    vault: room.vault,
    specialtyPacks: room.specialtyPacks,
  };
}

export const LEGAL_PROFESSIONAL_DIRECTORY: readonly ProfessionalRoomDirectoryItem[] =
  LEGAL_PROFESSIONAL_ROOMS.map(toDirectoryItem);

export const ACCOUNTING_PROFESSIONAL_DIRECTORY: readonly ProfessionalRoomDirectoryItem[] =
  ACCOUNTING_PROFESSIONAL_ROOMS.map(toDirectoryItem);

export const PROFESSIONAL_ROOM_DIRECTORY: readonly ProfessionalRoomDirectoryItem[] =
  PROFESSIONAL_ROOM_CATALOG.map(toDirectoryItem);

export function professionalDirectoryForDomain(domain: ProfessionalDomain) {
  return PROFESSIONAL_ROOM_DIRECTORY.filter((room) => room.domain === domain);
}

export function getProfessionalRoomByCatalogId(catalogId: string) {
  return PROFESSIONAL_ROOM_DIRECTORY.find((room) => room.id === catalogId) ?? null;
}

export function getProfessionalRoomsByProductId(productId: string) {
  return PROFESSIONAL_ROOM_DIRECTORY.filter((room) => room.productId === productId);
}

export function resolveProfessionalRoomTemplate(catalogId: string) {
  const room = getProfessionalRoomByCatalogId(catalogId);
  if (!room) return null;
  return {
    templateId: room.templateId,
    productId: room.productId,
    vault: room.vault,
    domain: room.domain,
  } as const;
}
