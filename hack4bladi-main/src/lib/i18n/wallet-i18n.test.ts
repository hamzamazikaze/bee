/**
 * Every string the wallet and the experience block put on screen has to resolve in the
 * three languages the product speaks — and `translate` returning the key itself is the
 * failure mode we would otherwise ship without noticing.
 */
import { describe, expect, it } from "vitest";
import { translate, type MessageKey } from "@/lib/i18n";
import { EXPERIENCES } from "@/data/pois";
import type { Locale } from "@/types/common";

const LOCALES: Locale[] = ["en", "fr", "ar"];

const KEYS: MessageKey[] = [
  "wallet.title",
  "wallet.coins",
  "wallet.balance",
  "wallet.rewards",
  "wallet.history",
  "wallet.unlock",
  "wallet.unlocked",
  "wallet.unlockedBody",
  "wallet.needMore",
  "wallet.earnedStop",
  "wallet.earnedDay",
  "wallet.tx.visit_reward",
  "wallet.tx.activity_reward",
  "wallet.tx.trip_bonus",
  "wallet.tx.discount_redemption",
  "activity.kind.place",
  "activity.kind.local_activity",
  "activity.kind.workshop",
  "activity.kind.food_experience",
  "activity.with",
  "activity.youWillDo",
  "activity.youWillLearn",
  "activity.reward",
  "activity.supportsLocal",
  "activity.demoPartner",
];

describe("wallet and experience labels", () => {
  it("resolve in EN, FR and AR", () => {
    for (const locale of LOCALES) {
      for (const key of KEYS) {
        const value = translate(locale, key, { count: 1, price: 1, coins: 1, host: "x", discount: "10%" });
        expect(value, `${locale} ${key}`).not.toBe(key);
        expect(value.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("interpolate their placeholders rather than printing them", () => {
    expect(translate("en", "wallet.balance", { count: 320 })).toContain("320");
    expect(translate("fr", "activity.reward", { count: 100 })).toContain("100");
    expect(translate("ar", "wallet.needMore", { count: 40 })).toContain("40");
    for (const locale of LOCALES) {
      expect(translate(locale, "wallet.balance", { count: 1 })).not.toContain("{");
    }
  });
});

describe("curated experiences are localised", () => {
  it("give every experience a name and a story in all three languages", () => {
    for (const poi of EXPERIENCES) {
      for (const locale of LOCALES) {
        expect(poi.cultural.story[locale], `${poi.id} story ${locale}`).toBeTruthy();
        expect(poi.cultural.tip[locale], `${poi.id} tip ${locale}`).toBeTruthy();
      }
      // FR and AR names; EN falls back to the canonical `name`.
      expect(poi.localizedName?.fr, poi.id).toBeTruthy();
      expect(poi.localizedName?.ar, poi.id).toBeTruthy();
    }
  });

  it("localise what the traveller will do and learn", () => {
    for (const poi of EXPERIENCES) {
      for (const line of poi.experience?.includes ?? []) {
        for (const locale of LOCALES) expect(line[locale], poi.id).toBeTruthy();
      }
      for (const skill of poi.experience?.skills ?? []) {
        for (const locale of LOCALES) expect(skill[locale], poi.id).toBeTruthy();
      }
    }
  });
});
