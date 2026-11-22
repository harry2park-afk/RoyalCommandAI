import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), complete: vi.fn(), supportsInlineImages: true }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/ai/connectors", () => ({
  getAvailableProviderIds: () => ["openai", "google"],
  getConnector: () => ({ supportsInlineImages: mocks.supportsInlineImages, complete: mocks.complete }),
}));
vi.mock("@/lib/ai/independentReceipt", () => ({ signIndependentReceipt: () => "test-receipt" }));
vi.mock("@/config/countryResolver", () => ({ isDomainFeatureReady: () => true }));
vi.mock("@/lib/runtime/serverDomainContext", () => ({ getServerDomainRuntimeContext: async () => ({ locale: "ko" }) }));
import { POST } from "./route";

const png = { mime: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z1sAAAAASUVORK5CYII=" };
const input = { requestId: "mock-request", provider: "google", selectedProviders: ["google"], prompt: "이 사진은?", history: [{ role: "user", content: "Earlier", images: [png] }] };
const post = (patch: object) => POST(new Request("https://example.test/api/ai/independent", { method: "POST", body: JSON.stringify({ ...input, ...patch }) }));

describe("RCA screenshot requests", () => {
  beforeEach(() => {
    mocks.user.mockResolvedValue({ id: "test-owner", defaultLanguage: "ko" });
    mocks.supportsInlineImages = true;
    mocks.complete.mockReset().mockResolvedValue({ model: "mock", content: "Read image", latencyMs: 1 });
  });

  it("sends only validated current-image bytes to the selected connector; prior turns stay text", async () => {
    expect((await post({ images: [png] })).status).toBe(200);
    const call = mocks.complete.mock.calls[0][0];
    expect(call.images).toEqual([png]);
    expect(call.messages.slice(-2)).toEqual([{ role: "user", content: "Earlier" }, { role: "user", content: "이 사진은?" }]);
  });

  it("preserves the old text-only request; unauthenticated or unselected requests cannot send", async () => {
    expect((await post({})).status).toBe(200);
    expect(mocks.complete.mock.calls[0][0]).not.toHaveProperty("images");
    mocks.complete.mockClear();
    expect((await post({ selectedProviders: ["openai"], images: [png] })).status).toBe(403);
    mocks.user.mockResolvedValue(null);
    expect((await post({ images: [png] })).status).toBe(401);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("rejects malformed, mislabeled, too-many and unsupported images without sending them", async () => {
    expect((await post({ images: [{ ...png, mime: "image/jpeg" }] })).status).toBe(400);
    expect((await post({ images: [{ ...png, base64: "not base64" }] })).status).toBe(400);
    expect((await post({ images: Array(5).fill(png) })).status).toBe(413);
    mocks.supportsInlineImages = false;
    expect((await post({ images: [png] })).status).toBe(422);
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it("returns a stable error without leaking provider response content if an image fails", async () => {
    mocks.complete.mockResolvedValue({ model: "mock", content: png.base64, error: "provider response may echo " + png.base64 });
    const resp = await post({ images: [png] });
    expect(resp.status).toBe(502);
    const body = await resp.text();
    expect(body).toContain("IMAGE_PROVIDER_FAILED");
    expect(body).not.toContain(png.base64);
  });
});
