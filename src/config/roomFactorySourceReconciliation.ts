import { DOMAIN_PROFILES } from "../lib/rooms/factory-v2";
import { ROOM_TEMPLATES } from "../lib/rooms/templates";

export type RoomFactorySourceReconciliation = {
  consistent: boolean;
  hostedTemplateIds: string[];
  sourceTemplateIds: string[];
  sourceDomainProfileIds: string[];
  hostedTemplatesMissingFromSource: string[];
  sourceTemplatesMissingDomainProfiles: string[];
  sourceDomainProfilesMissingTemplates: string[];
};

function normaliseIds(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort();
}

/**
 * READ-ONLY source reconciliation for Room Factory launch evidence.
 *
 * Hosted manifests may be created by a Preview/candidate branch that is newer
 * than the country-rollout candidate. A country release must not treat that
 * Hosted state as compatible unless every Hosted template ID exists in the
 * candidate source and the candidate template/profile registries are a complete
 * one-to-one set. A template without a Domain Profile, or a Domain Profile
 * without a matching template, fails closed.
 *
 * This helper has no side effects and does not authorize Room creation, Hosted
 * mutation, country activation, or Production promotion.
 */
export function evaluateRoomFactorySourceReconciliation(
  hostedTemplateIds: string[],
): RoomFactorySourceReconciliation {
  const hosted = normaliseIds(hostedTemplateIds);
  const sourceTemplates = normaliseIds(ROOM_TEMPLATES.map((template) => template.id));
  const sourceProfiles = normaliseIds(Object.keys(DOMAIN_PROFILES));
  const sourceTemplateSet = new Set(sourceTemplates);
  const sourceProfileSet = new Set(sourceProfiles);

  const hostedTemplatesMissingFromSource = hosted.filter((templateId) => !sourceTemplateSet.has(templateId));
  const sourceTemplatesMissingDomainProfiles = sourceTemplates.filter((templateId) => !sourceProfileSet.has(templateId));
  const sourceDomainProfilesMissingTemplates = sourceProfiles.filter((profileId) => !sourceTemplateSet.has(profileId));

  return {
    consistent:
      hostedTemplatesMissingFromSource.length === 0 &&
      sourceTemplatesMissingDomainProfiles.length === 0 &&
      sourceDomainProfilesMissingTemplates.length === 0,
    hostedTemplateIds: hosted,
    sourceTemplateIds: sourceTemplates,
    sourceDomainProfileIds: sourceProfiles,
    hostedTemplatesMissingFromSource,
    sourceTemplatesMissingDomainProfiles,
    sourceDomainProfilesMissingTemplates,
  };
}
