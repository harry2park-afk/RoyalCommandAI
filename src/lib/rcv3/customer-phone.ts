import { z } from "zod";

export const PHONE_NOT_READY = "RCV3_PHONE_CUSTOMER_CONNECTION_REQUIRED";
const countrySchema = z.string().regex(/^[A-Z]{2}$/);
const availabilityUrl = "https://www.twilio.com/docs/phone-numbers/api/availablephonenumber-resource";
const purchaseUrl = "https://console.twilio.com/us1/develop/phone-numbers/manage/search";
// Provider country documentation checked 2026-09-20. This is a suitable-provider
// catalogue, not a ranking or a guarantee of stock, eligibility or live routing.
const countries: Record<string, string> = {
  AU: "https://www.twilio.com/en-us/guidelines/au/regulatory",
  GB: "https://www.twilio.com/en-us/guidelines/gb/regulatory",
  US: "https://www.twilio.com/en-us/voice/pricing/us",
  CA: "https://www.twilio.com/en-us/voice/pricing/ca",
  JP: "https://www.twilio.com/en-us/voice/pricing/jp",
};
export type CustomerPhoneRecommendation = {
  country: string;
  provider: "twilio" | null;
  label: string;
  support: "documented" | "unverified";
  purchaseUrl: string | null;
  requirementsUrl: string;
  connected: false;
  purchased: false;
  billingOwner: "customer";
  billingChannel: "carrier";
  rcPhoneCharges: false;
  reason: typeof PHONE_NOT_READY;
};
export function getCustomerPhoneRecommendation(country: string): CustomerPhoneRecommendation {
  countrySchema.parse(country);
  const source = countries[country];
  return {
    country, provider: source ? "twilio" : null, label: source ? "Twilio" : "Check phone availability",
    support: source ? "documented" : "unverified", purchaseUrl: source ? purchaseUrl : null,
    requirementsUrl: source || availabilityUrl, connected: false, purchased: false,
    billingOwner: "customer", billingChannel: "carrier", rcPhoneCharges: false, reason: PHONE_NOT_READY,
  };
}

// The customer buys directly from their carrier. No RC resale price, owner
// credential, purchased flag or typed number establishes a working connection.
// A future connection must verify the customer's own account/number, bind the
// room-specific voice agent and prove routing before this guard can pass.
export async function validateCustomerPhoneForCheckout(ownerId: string, draftId: string, _legacyOfferId: string, country: string): Promise<never> {
  z.uuid().parse(ownerId); z.uuid().parse(draftId); countrySchema.parse(country);
  throw new Error(PHONE_NOT_READY);
}
