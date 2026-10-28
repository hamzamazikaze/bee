/**
 * The one rule the money formatter exists to enforce: switching language changes how a
 * figure is written, never what it is worth.
 */
import { describe, expect, it } from "vitest";
import { formatDate, formatMad, formatMadRange, formatNumber } from "./format";
import { LOCALES } from "./locales";

/** Strips the bidi isolates so an assertion reads as the traveller sees it. */
const plain = (value: string) => value.replace(/[⁦⁩]/g, "");

describe("locale-aware formatting", () => {
  it("groups thousands the way each language does", () => {
    expect(plain(formatNumber(1250, "en"))).toBe("1,250");
    expect(plain(formatNumber(1250, "de"))).toBe("1.250");
    /**
     * Morocco, not France: the locale tags are `fr-MA` and `ar-MA`, and CLDR groups
     * Moroccan thousands with a period — 1.250, not the metropolitan 1 250. That is the
     * separator on a Moroccan price list, so it is the one this product prints.
     */
    expect(plain(formatNumber(1250, "fr"))).toBe("1.250");
    expect(plain(formatNumber(1250, "ar"))).toBe("1.250");
    /* Spanish, Italian and Portuguese leave four digits ungrouped. */
    expect(plain(formatNumber(1250, "es"))).toBe("1250");
    expect(plain(formatNumber(12500, "es"))).toBe("12.500");
  });

  it("never changes the value", () => {
    for (const locale of LOCALES) {
      const digits = plain(formatMad(1250, locale)).replace(/[^\d]/g, "");
      expect(digits).toBe("1250");
    }
  });

  it("keeps Latin digits in Arabic — Morocco does not price in Arabic-Indic numerals", () => {
    expect(plain(formatMad(150, "ar"))).toMatch(/^150 MAD$/);
  });

  it("names the currency in every language", () => {
    for (const locale of LOCALES) {
      expect(formatMad(90, locale)).toContain("MAD");
    }
  });

  it("collapses a degenerate range", () => {
    expect(plain(formatMadRange(140, 140, "fr"))).toBe("140 MAD");
    expect(plain(formatMadRange(180, 200, "fr"))).toBe("180–200 MAD");
  });

  it("returns an empty string for an unparseable date rather than 'Invalid Date'", () => {
    expect(formatDate("not-a-date", "de")).toBe("");
  });

  it("formats a date in each language", () => {
    for (const locale of LOCALES) {
      expect(formatDate("2026-03-12T10:00:00.000Z", locale)).not.toBe("");
    }
  });
});
