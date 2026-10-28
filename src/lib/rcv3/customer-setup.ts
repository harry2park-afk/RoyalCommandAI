import type { RoomDraftInput } from "./room-draft";
import { resolveCustomerAI, verifyCustomerAISelection } from "./customer-ai";
import { verifyCustomerMail } from "./customer-mail";
import { validateCustomerOwnedPhone } from "./customer-phone-account";

// Setup fields only express customer intent. Prove owner-scoped connections
// before checkout, rather than turning contact text into active credentials.
export async function verifyCustomerSetup(ownerId: string, draftId: string, draft: RoomDraftInput, reserveProbe?: () => Promise<void>) {
  if (!draft.onboarding) throw new Error("RCV3_FORM_REQUIRED");
  const setup = draft.onboarding;
  if (!draft.onboarding.country || !draft.providers.length) throw new Error("RCV3_FORM_REQUIRED");
  await verifyCustomerAISelection(ownerId, draft.providers, draft.onboarding.aiSources);
  if (draft.onboarding.phoneRequested || draft.onboarding.phoneOfferId) {
    if(!setup.phoneNumberId || !setup.phoneConsent)throw new Error("RCV3_PHONE_CONSENT_REQUIRED");
    await validateCustomerOwnedPhone(ownerId,setup.phoneNumberId);
  }
  if (draft.onboarding.emailEnabled) await verifyCustomerMail(ownerId,draft.secretarySetup.email);
  if (reserveProbe) {
    // Reserve per call before any provider is contacted. In parallel, one slow
    // provider does not make the entire form take N provider timeouts.
    for (let i=0;i<draft.providers.length;i++) await reserveProbe();
    await Promise.all(draft.providers.map(async provider => {
      const connector = await resolveCustomerAI(ownerId,provider,setup.aiSources[provider] || "platform");
      const result = await connector.complete({messages:[{role:"user",content:"Reply with OK only."}],maxTokens:32});
      if (result.error || !result.content.trim()) throw new Error("RCV3_AI_NOT_CONNECTED");
    }));
  }
}
