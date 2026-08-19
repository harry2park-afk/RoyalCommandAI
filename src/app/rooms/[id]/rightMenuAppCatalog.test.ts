import { describe, expect, it } from "vitest";
import {
  APP_CATALOG,
  DEFAULT_APPS,
  listAppsForCountry,
  searchGlobalApps,
} from "./rightMenuAppCatalog";

describe("Global right-menu app catalog", () => {
  it("keeps app ids unique", () => {
    const ids = APP_CATALOG.map((app) => app.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ships exactly 50 valid starter-pack apps", () => {
    expect(DEFAULT_APPS).toHaveLength(50);
    expect(new Set(DEFAULT_APPS).size).toBe(50);
    for (const id of DEFAULT_APPS) {
      expect(APP_CATALOG.some((app) => app.id === id)).toBe(true);
    }
  });

  it.each([
    ["Facebook", "facebook"],
    ["WhatsApp", "whatsapp"],
    ["LinkedIn", "linkedin"],
    ["TikTok", "tiktok"],
    ["Twitter", "x"],
    ["Slack", "slack"],
    ["Teams", "teams"],
    ["Zoom", "zoom"],
    ["Dropbox", "dropbox"],
    ["OneDrive", "onedrive"],
    ["Notion", "notion"],
    ["GitHub", "github"],
    ["Crazytel", "crazytel"],
    ["카카오톡", "kakaotalk"],
    ["KakaoTalk", "kakaotalk"],
    ["LINE", "line"],
    ["WeChat", "wechat"],
    ["Naver", "naver"],
  ])("search %s resolves %s", (query, expectedId) => {
    expect(searchGlobalApps(query).some((app) => app.id === expectedId)).toBe(true);
  });

  it("supports future country-level catalog views without forking the Core", () => {
    const korea = listAppsForCountry("KR");
    const japan = listAppsForCountry("JP");
    const australia = listAppsForCountry("AU");

    expect(korea.some((app) => app.id === "kakaotalk")).toBe(true);
    expect(korea.some((app) => app.id === "facebook")).toBe(true);
    expect(japan.some((app) => app.id === "line")).toBe(true);
    expect(australia.some((app) => app.id === "crazytel")).toBe(true);
    expect(australia.some((app) => app.id === "kakaotalk")).toBe(false);
  });
});
