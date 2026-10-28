/**
 * The seven catalogs must agree on their schema.
 *
 * `translate()` falls back to English, so a gap never breaks a screen — which is exactly
 * why it needs a test: a missing German key is invisible in code review and shows up on
 * stage as one English sentence in the middle of a German page. This fails loudly instead.
 *
 * It also catches the opposite mistake: a key that exists only in a translation, which is
 * always either a typo or a leftover from a renamed key, and can never be reached.
 */
import { describe, expect, it } from "vitest";
import { LOCALES } from "./locales";
import { translate } from ".";
import { en } from "./messages/en";
import { fr } from "./messages/fr";
import { ar } from "./messages/ar";
import { es } from "./messages/es";
import { de } from "./messages/de";
import { it as itMessages } from "./messages/it";
import { pt } from "./messages/pt";
import type { Locale } from "@/types/common";

const CATALOGS: Record<Locale, unknown> = { en, fr, ar, es, de, it: itMessages, pt };

function keyPaths(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object") return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" ? keyPaths(value, path) : [path];
  });
}

/** `{name}` placeholders, sorted — a translation that drops one renders a literal hole. */
function placeholders(node: unknown, path: string): string[] {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, node);
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

const ENGLISH_KEYS = keyPaths(en).sort();

/**
 * Keys where a language may legitimately drop a placeholder.
 *
 * Arabic expresses "1 place" lexically — مكان واحد — rather than by printing the digit,
 * so the singular forms carry no {n}. That is correct Arabic, not a lost variable, and
 * the entry documents which of the two it is.
 */
const MAY_OMIT: Partial<Record<Locale, readonly string[]>> = {
  ar: ["category.placeOne", "category.experienceOne"],
};

describe("message catalogs", () => {
  it("English defines every key the app can ask for", () => {
    expect(ENGLISH_KEYS.length).toBeGreaterThan(300);
  });

  for (const locale of LOCALES) {
    const catalog = CATALOGS[locale];

    it(`${locale} translates every key`, () => {
      const present = new Set(keyPaths(catalog));
      expect(ENGLISH_KEYS.filter((key) => !present.has(key))).toEqual([]);
    });

    it(`${locale} invents no key of its own`, () => {
      const english = new Set(ENGLISH_KEYS);
      expect(keyPaths(catalog).filter((key) => !english.has(key))).toEqual([]);
    });

    it(`${locale} invents no {placeholder}`, () => {
      const invented = ENGLISH_KEYS.filter((key) => {
        const source = new Set(placeholders(en, key));
        return placeholders(catalog, key).some((name) => !source.has(name));
      });
      expect(invented).toEqual([]);
    });

    it(`${locale} keeps every {placeholder} it should`, () => {
      const allowed = new Set(MAY_OMIT[locale] ?? []);
      const dropped = ENGLISH_KEYS.filter((key) => {
        if (allowed.has(key)) return false;
        const translated = new Set(placeholders(catalog, key));
        return placeholders(en, key).some((name) => !translated.has(name));
      });
      expect(dropped).toEqual([]);
    });

    it(`${locale} never renders a raw key`, () => {
      // The lookup returns the key itself when it finds nothing — the loud failure mode.
      for (const key of ENGLISH_KEYS) {
        expect(translate(locale, key as never)).not.toBe(key);
      }
    });
  }
});
