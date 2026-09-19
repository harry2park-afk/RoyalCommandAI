import { describe, expect, it } from "vitest";
import {
  CREATE_ROOM_COUNTRIES,
  CREATE_ROOM_LANGUAGES,
  createRoomCopy,
} from "./create-room-i18n";

const CRITICAL_CREATE_ROOM_COPY_KEYS = [
  "goodDesc",
  "betterDesc",
  "bestDesc",
  "roomType",
  "team",
  "trialText",
  "training",
  "websiteBenefit",
  "step5Help",
  "agreement",
  "pendingIntegration",
  "readyPreview",
  "priceToConfirm",
  "included",
  "from",
  "selected",
  "basicBenefit",
] as const;

describe("Canada French Create Room source support", () => {
  it("keeps Canada on English primary copy while registering French as an explicit selectable language", () => {
    expect(CREATE_ROOM_COUNTRIES.find((country) => country.code === "CA")).toEqual({
      code: "CA",
      label: "Canada",
      locale: "en",
    });
    expect(CREATE_ROOM_LANGUAGES).toContainEqual({ locale: "fr", label: "Français" });
  });

  it("provides explicit French copy for launch-critical Create Room fields instead of silent English fallback", () => {
    const english = createRoomCopy("en");
    const french = createRoomCopy("fr");

    expect(french.title).toBe("Créer votre Room");
    for (const key of CRITICAL_CREATE_ROOM_COPY_KEYS) {
      expect(french[key], key).not.toBe(english[key]);
    }
  });

  it("keeps payment and policy wording explicitly pre-launch rather than implying live availability", () => {
    const french = createRoomCopy("fr");
    expect(french.step5Help).toContain("avant le lancement public");
    expect(french.pendingIntegration).toContain("avant le lancement public");
    expect(french.priceToConfirm).toBe("Prix à confirmer");
  });
});
