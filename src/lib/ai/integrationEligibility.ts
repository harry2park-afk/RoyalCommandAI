export type IntegrationCandidate = {
  provider: string;
  providerName: string;
  content?: string;
  error?: string | null;
  receipt?: { terminal?: boolean };
};

export function getIntegrationEligibility<T extends IntegrationCandidate>(
  selectedProviders: string[],
  frozenResults: Record<string, T>,
) {
  const selectedResults = selectedProviders.map((id) => frozenResults[id]).filter(Boolean);
  const successfulResults = selectedResults.filter(
    (result) => Boolean(result.content?.trim()) && !result.error && result.receipt?.terminal === true,
  );
  const failedResults = selectedResults.filter(
    (result) => Boolean(result.error) || (result.receipt?.terminal === true && !result.content?.trim()),
  );

  return { successfulResults, failedResults, canIntegrate: successfulResults.length > 0 };
}
