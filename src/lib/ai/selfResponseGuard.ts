import type { AIProviderId, AIProviderResponse } from "./types";
import { PROVIDER_LABELS } from "./types";

const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string) {
  return value.replace(ESCAPE_RE, "\\$&");
}

/**
 * Narrow host-side guard for a specific failure mode: one provider sometimes
 * emits a bundle of multiple provider answers under markdown headings.
 *
 * We only intervene when two or more known provider headings are present AND
 * the current provider has its own heading. Ordinary prose that merely names
 * or compares other providers is left untouched.
 */
export function keepOnlyCurrentProviderSection(response: AIProviderResponse): AIProviderResponse {
  if (response.error || !response.content.trim()) return response;

  const labels = Object.values(PROVIDER_LABELS);
  const headingPattern = new RegExp(
    `^#{1,6}\\s+(${labels.map(escapeRegExp).join("|")})\\s*$`,
    "gim",
  );

  const matches = [...response.content.matchAll(headingPattern)];
  if (matches.length < 2) return response;

  const ownLabel = PROVIDER_LABELS[response.provider as AIProviderId];
  const ownIndex = matches.findIndex((match) => match[1]?.toLowerCase() === ownLabel.toLowerCase());
  if (ownIndex < 0) return response;

  const ownMatch = matches[ownIndex]!;
  const sectionStart = (ownMatch.index ?? 0) + ownMatch[0].length;
  const nextMatch = matches[ownIndex + 1];
  const sectionEnd = nextMatch?.index ?? response.content.length;
  const ownContent = response.content.slice(sectionStart, sectionEnd).trim();

  if (!ownContent) return response;

  return {
    ...response,
    content: ownContent,
    raw: response.raw && typeof response.raw === "object"
      ? { ...(response.raw as Record<string, unknown>), rcSelfResponseGuardApplied: true }
      : { rcSelfResponseGuardApplied: true },
  };
}
