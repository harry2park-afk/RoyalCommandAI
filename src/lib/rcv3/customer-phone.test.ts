import { describe, expect, it } from "vitest";
import { getCustomerPhoneRecommendation, validateCustomerPhoneForCheckout } from "./customer-phone";
const owner = "11111111-1111-4111-8111-111111111111", draft = "22222222-2222-4222-8222-222222222222";
describe("customer direct carrier purchase", () => {
  it.each(["AU", "GB", "US", "CA", "JP"])("recommends documented carrier for %s without asserting activation", country => {
    const value = getCustomerPhoneRecommendation(country);
    expect(value).toMatchObject({ country, provider: "twilio", support: "documented", connected: false, purchased: false });
    expect(new URL(value.purchaseUrl!).origin).toBe("https://console.twilio.com");
    expect(new URL(value.requirementsUrl).hostname).toBe("www.twilio.com");
    expect(value).not.toHaveProperty("price");
    expect(value).toMatchObject({ billingOwner: "customer", billingChannel: "carrier", rcPhoneCharges: false });
  });
  it("does not invent coverage for an unverified country", () => {
    expect(getCustomerPhoneRecommendation("KR")).toMatchObject({ provider: null, support: "unverified", purchaseUrl: null, connected: false });
  });
  it.each(["", "../../US", "us", "AU?redirect=evil.test"])("rejects malformed country %s", country => {
    expect(() => getCustomerPhoneRecommendation(country)).toThrow();
  });
  it("blocks a phone-dependent charge until own account and routing are verified", async () => {
    await expect(validateCustomerPhoneForCheckout(owner, draft, "customer-claims-paid", "AU")).rejects.toThrow("RCV3_PHONE_CUSTOMER_CONNECTION_REQUIRED");
  });
});
