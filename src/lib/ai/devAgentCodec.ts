export type EncodedDevAction = {
  path: string;
  operation: "create" | "update" | "delete";
  contentBase64?: string;
  reason?: string;
};

function stripCodeFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractFirstJsonObject(text: string) {
  const source = stripCodeFence(text);
  const start = source.indexOf("{");
  if (start < 0) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return "";
}

function normalizeContentBase64(value: any) {
  if (!value || typeof value !== "object") return value;

  const normalizeOne = (item: any) => {
    if (!item || typeof item !== "object") return item;
    if (typeof item.contentBase64 === "string" && item.contentBase64.trim()) return item;

    const alias = [
      item.content_base64,
      item.fileContentBase64,
      item.file_content_base64,
      item.base64,
    ].find((candidate) => typeof candidate === "string" && candidate.trim());

    if (typeof alias === "string") {
      item.contentBase64 = alias.trim();
      return item;
    }

    if (typeof item.content === "string" && item.content.trim()) {
      item.contentBase64 = Buffer.from(item.content, "utf8").toString("base64");
    }

    return item;
  };

  normalizeOne(value);
  if (Array.isArray(value.actions)) value.actions.forEach(normalizeOne);
  if (Array.isArray(value.files)) value.files.forEach(normalizeOne);
  return value;
}

export function parseJsonObject(text: string) {
  const cleaned = stripCodeFence(text);
  const candidate = cleaned.startsWith("{") && cleaned.endsWith("}") ? cleaned : extractFirstJsonObject(cleaned);

  if (!candidate) {
    const preview = cleaned.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(`Developer model returned a non-JSON response${preview ? `: ${preview}` : ""}`);
  }

  try {
    return normalizeContentBase64(JSON.parse(candidate));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    throw new Error(`Developer model returned invalid JSON: ${message}`);
  }
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
