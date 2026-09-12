function flagGlyph(code: string) {
  return String.fromCodePoint(...code.split("").map((character) => 127397 + character.charCodeAt(0)));
}

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await context.params;
  const code = rawCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return new Response("Invalid country code", { status: 400 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30" viewBox="0 0 40 30"><rect width="40" height="30" rx="2" fill="#101827"/><text x="20" y="23" text-anchor="middle" font-size="27" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${flagGlyph(code)}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
}
