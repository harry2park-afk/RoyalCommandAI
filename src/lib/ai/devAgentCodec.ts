export type EncodedDevAction = {
  path: string;
  operation: "create" | "update" | "delete";
  contentBase64?: string;
  reason?: string;
};

export function parseJsonObject(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned || "{}");
}

export function decodeActionContent(action: EncodedDevAction) {
  if (action.operation === "delete") return undefined;
  const encoded = String(action.contentBase64 || "").trim();
  if (!encoded) throw new Error(`Missing contentBase64 for ${action.path}`);
  return Buffer.from(encoded, "base64").toString("utf8");
}

export function actionSchemaInstruction() {
  return `Return JSON only in this exact shape: {"summary":"short Korean summary","actions":[{"path":"src/...","operation":"create|update|delete","contentBase64":"BASE64_UTF8_COMPLETE_FILE_CONTENT","reason":"short reason"}]}. For create/update, encode the ENTIRE final UTF-8 file content as Base64 and put it only in contentBase64. Never place raw source code, raw newlines, tabs, or code fences inside JSON string values. For delete, omit contentBase64.`;
}
