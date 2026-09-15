import { resolveDomainProfile } from "./factory-v2";
import {
  getProfessionalRoomByCatalogId,
  resolveProfessionalRoomTemplate,
  type ProfessionalRoomDirectoryItem,
} from "./professional-room-directory";

export type ProfessionalRoomFactoryPlan = {
  catalogId: string;
  productId: string;
  label: string;
  domain: ProfessionalRoomDirectoryItem["domain"];
  templateId: ProfessionalRoomDirectoryItem["templateId"];
  vault: ProfessionalRoomDirectoryItem["vault"];
  specialtyPacks: boolean;
  crossVaultStorageAllowed: false;
  sharedDataMode: "NONE" | "SHAREGRANT_VIRTUAL_VIEW";
  safetyTier: "regulated";
  adviceBoundary: string;
};

/**
 * Resolve one governed Professional Room catalog entry onto the existing Room
 * Factory v2 Legal/Accounting template primitive without creating a Room or
 * exposing the catalog in UI.
 *
 * Fail closed: unknown catalog IDs or any template/profile mismatch return null.
 */
export function buildProfessionalRoomFactoryPlan(
  catalogId: string,
): ProfessionalRoomFactoryPlan | null {
  const room = getProfessionalRoomByCatalogId(catalogId);
  const binding = resolveProfessionalRoomTemplate(catalogId);

  if (!room || !binding) return null;

  const resolved = resolveDomainProfile(binding.templateId);
  if (
    resolved.template.id !== binding.templateId ||
    resolved.profile.templateId !== binding.templateId ||
    resolved.profile.safetyTier !== "regulated" ||
    !resolved.profile.adviceBoundary
  ) {
    return null;
  }

  return {
    catalogId: room.id,
    productId: binding.productId,
    label: room.label,
    domain: binding.domain,
    templateId: binding.templateId,
    vault: binding.vault,
    specialtyPacks: room.specialtyPacks,
    crossVaultStorageAllowed: false,
    sharedDataMode: binding.sharedDataMode,
    safetyTier: "regulated",
    adviceBoundary: resolved.profile.adviceBoundary,
  };
}
