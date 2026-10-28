import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConnector, isProviderConfigured } from "@/lib/ai/connectors";
import { AI_PROVIDER_IDS, PROVIDER_LABELS, type AIConnector, type AIProviderId, type AIRequest } from "@/lib/ai/types";

export const PERSONAL_AI_PROVIDERS = ["openai", "anthropic", "google", "xai"] as const;
export type PersonalAIProvider = typeof PERSONAL_AI_PROVIDERS[number];
export type AISource = "platform" | "personal";
const table = "rcv3_customer_ai_credentials";
const ownerSchema = z.string().uuid();
const providerSchema = z.enum(PERSONAL_AI_PROVIDERS);
const keySchema = z.string().trim().min(16).max(2048).regex(/^[\x21-\x7e]+$/);
const models: Record<PersonalAIProvider, string> = { openai: "gpt-4.1-mini", anthropic: "claude-haiku-4-5", google: "gemini-3.6-flash", xai: "grok-4.5" };

function encryptionKey() {
  const value = process.env.RCV3_CREDENTIAL_ENCRYPTION_KEY || "";
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw new Error("RCV3_PERSONAL_AI_UNAVAILABLE");
  return Buffer.from(value, "hex");
}
function aad(owner: string, provider: PersonalAIProvider) {
  return Buffer.from(`rcv3-customer-ai:v1:${ownerSchema.parse(owner)}:${providerSchema.parse(provider)}`);
}
export function sealCustomerAIKey(owner: string, provider: PersonalAIProvider, value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(aad(owner, provider));
  const encrypted = Buffer.concat([cipher.update(keySchema.parse(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}
export function openCustomerAIKey(owner: string, provider: PersonalAIProvider, value: string) {
  try {
    const data = Buffer.from(value, "base64url");
    if (data.length < 44 || data.length > 2100) throw new Error();
    const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
    cipher.setAAD(aad(owner, provider)); cipher.setAuthTag(data.subarray(12, 28));
    return keySchema.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"));
  } catch { throw new Error("RCV3_PERSONAL_AI_RECONNECT"); }
}

// A request-scoped connector: never modifies process.env, shared instances or
// falls back to the platform account when a customer's own credential fails.
export function personalAIConnector(provider: PersonalAIProvider, apiKey: string): AIConnector {
  providerSchema.parse(provider); keySchema.parse(apiKey);
  const model = models[provider];
  return { id: provider, displayName: PROVIDER_LABELS[provider], isConfigured: () => true,
    async complete(request: AIRequest) {
      const started = Date.now();
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        let url: string, body: Record<string, unknown>;
        const maxTokens = Math.min(4096, Math.max(16, request.maxTokens || 1500));
        const system = request.messages.filter(m => m.role === "system").map(m => m.content).join("\n");
        if (provider === "anthropic") {
          url = "https://api.anthropic.com/v1/messages";
          headers["x-api-key"] = apiKey; headers["anthropic-version"] = "2023-06-01";
          body = { model, max_tokens: maxTokens, system, messages: request.messages.filter(m => m.role !== "system") };
        } else if (provider === "google") {
          url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
          headers["x-goog-api-key"] = apiKey;
          body = { systemInstruction: { parts: [{ text: system }] }, contents: request.messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: maxTokens } };
        } else {
          url = provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.x.ai/v1/chat/completions";
          headers.Authorization = `Bearer ${apiKey}`;
          body = { model, messages: request.messages, [provider === "openai" ? "max_completion_tokens" : "max_tokens"]: maxTokens };
        }
        const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const content = provider === "anthropic"
          ? z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })) }).parse(data).content.filter(p => p.type === "text").map(p => p.text || "").join("")
          : provider === "google"
            ? z.object({ candidates: z.array(z.object({ content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })) }) })) }).parse(data).candidates[0]?.content.parts.filter(p => !p.thought).map(p => p.text || "").join("")
            : z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })) }).parse(data).choices[0]?.message.content;
        if (!content?.trim()) throw new Error();
        return { provider, model, content: content.slice(0, 50000), latencyMs: Date.now() - started };
      } catch { return { provider, model, content: "", latencyMs: Date.now() - started, error: "RCV3_PERSONAL_AI_RESPONSE" }; }
    },
  };
}

async function personalRow(ownerId: string, provider: PersonalAIProvider) {
  const { data, error } = await createAdminClient().from(table).select("ciphertext,verified_at").eq("owner_id", ownerSchema.parse(ownerId)).eq("provider", provider).maybeSingle();
  if (error) throw new Error("RCV3_PERSONAL_AI_UNAVAILABLE");
  if (!data) throw new Error("RCV3_PERSONAL_AI_RECONNECT");
  return data;
}
export async function customerAIStatus(ownerId: string) {
  ownerSchema.parse(ownerId);
  let personalAvailable = false;
  let rows: { provider: string; verified_at: string }[] = [];
  try {
    encryptionKey();
    const { data, error } = await createAdminClient().from(table).select("provider,verified_at").eq("owner_id", ownerId);
    if (error) throw new Error();
    rows = data || []; personalAvailable = true;
  } catch { /* Unprovisioned personal storage does not disable platform AI. */ }
  return { personalAvailable, providers: AI_PROVIDER_IDS.map(id => ({ id, platform: isProviderConfigured(id), personalSupported: PERSONAL_AI_PROVIDERS.some(p => p === id), personal: personalAvailable && rows.some(row => row.provider === id) })) };
}
export async function resolveCustomerAI(ownerId: string, provider: AIProviderId, source: AISource = "platform"): Promise<AIConnector> {
  ownerSchema.parse(ownerId); z.enum(AI_PROVIDER_IDS).parse(provider);
  if (source === "platform") {
    if (!isProviderConfigured(provider)) throw new Error("RCV3_AI_NOT_CONNECTED");
    return getConnector(provider);
  }
  if (source !== "personal") throw new Error("RCV3_PERSONAL_AI_RECONNECT");
  const personalProvider = providerSchema.parse(provider), row = await personalRow(ownerId, personalProvider);
  return personalAIConnector(personalProvider, openCustomerAIKey(ownerId, personalProvider, row.ciphertext));
}
export async function verifyCustomerAISelection(ownerId: string, providers: AIProviderId[], sources: Partial<Record<AIProviderId, AISource>> = {}) {
  for (const provider of providers) await resolveCustomerAI(ownerId, provider, sources[provider] || "platform");
}

// Atomic unique slots limit failed and successful save attempts across instances.
async function reserveCredentialCheck(ownerId: string) {
  const db = createAdminClient(), hour = new Date().toISOString().slice(0, 13);
  for (let slot = 0; slot < 10; slot++) {
    const { error } = await db.from("rcv3_customer_ai_attempts").insert({ owner_id: ownerId, hour, slot });
    if (!error) return;
    if (error.code !== "23505") throw new Error("RCV3_PERSONAL_AI_UNAVAILABLE");
  }
  throw new Error("RCV3_LIMIT");
}
export async function saveCustomerAIKey(ownerId: string, provider: PersonalAIProvider, apiKey: string) {
  ownerSchema.parse(ownerId); providerSchema.parse(provider); const secret = keySchema.parse(apiKey);
  const ciphertext = sealCustomerAIKey(ownerId, provider, secret);
  await reserveCredentialCheck(ownerId);
  const result = await personalAIConnector(provider, secret).complete({ messages: [{ role: "user", content: "Reply OK." }], maxTokens: 32 });
  if (result.error || !result.content) throw new Error("RCV3_PERSONAL_AI_RECONNECT");
  const now = new Date();
  const { error } = await createAdminClient().from(table).upsert({ owner_id: ownerId, provider, ciphertext, verified_at: now.toISOString() }, { onConflict: "owner_id,provider" });
  if (error) throw new Error("RCV3_PERSONAL_AI_UNAVAILABLE");
  return { provider, verified: true, verifiedAt: now.toISOString() };
}
export async function revokeCustomerAIKey(ownerId: string, provider: PersonalAIProvider) {
  ownerSchema.parse(ownerId); providerSchema.parse(provider);
  const { error } = await createAdminClient().from(table).delete().eq("owner_id", ownerId).eq("provider", provider);
  if (error) throw new Error("RCV3_PERSONAL_AI_UNAVAILABLE");
}
