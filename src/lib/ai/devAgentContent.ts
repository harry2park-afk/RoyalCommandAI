export const DEFAULT_MAX_GENERATED_FILE_BYTES = 180_000;

export type DeveloperFilePayload = {
  contentBase64?: unknown;
  content?: unknown;
  source?: unknown;
};

export type DecodedDeveloperFile = {
  content: string;
  source: "contentBase64" | "content" | "source";
};

function assertSafeUtf8(content: string, path: string, maxBytes: number) {
  if (!content.trim()) throw new Error(`Generated developer file is empty: ${path}`);
  if (content.includes("\u0000")) throw new Error(`Generated developer file contains NUL bytes: ${path}`);

  const encoded = Buffer.from(content, "utf8");
  if (encoded.byteLength > maxBytes) throw new Error(`Generated file too large: ${path}`);
  if (encoded.toString("utf8") !== content) throw new Error(`Generated developer file is not valid UTF-8 text: ${path}`);
  return content;
}

function decodeStrictBase64(value: string) {
  const compact = value.replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) {
    throw new Error("Invalid Base64 encoding");
  }

  const unpadded = compact.replace(/=+$/, "");
  const padded = unpadded + "=".repeat((4 - (unpadded.length % 4)) % 4);
  const decoded = Buffer.from(padded, "base64");
  const canonicalRoundTrip = decoded.toString("base64").replace(/=+$/, "");
  if (unpadded !== canonicalRoundTrip) throw new Error("Invalid Base64 round-trip");
  return decoded.toString("utf8");
}

export function decodeDeveloperFilePayload(
  payload: DeveloperFilePayload,
  path: string,
  maxBytes = DEFAULT_MAX_GENERATED_FILE_BYTES,
): DecodedDeveloperFile {
  const errors: string[] = [];
  const base64 = typeof payload?.contentBase64 === "string" ? payload.contentBase64.trim() : "";
  if (base64) {
    try {
      return { content: assertSafeUtf8(decodeStrictBase64(base64), path, maxBytes), source: "contentBase64" };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const key of ["content", "source"] as const) {
    const value = typeof payload?.[key] === "string" ? payload[key] : "";
    if (!value.trim()) continue;
    try {
      return { content: assertSafeUtf8(value, path, maxBytes), source: key };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const detail = errors.length ? ` (${errors.join("; ")})` : "";
  throw new Error(`Developer returned no valid source content for ${path}${detail}`);
}
