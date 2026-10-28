import type { Locale } from "@/types/common";
import { FALLBACK_LOCALE } from "./locales";
import { en, type Messages } from "./messages/en";
import { fr } from "./messages/fr";
import { ar } from "./messages/ar";
import { es } from "./messages/es";
import { de } from "./messages/de";
import { it } from "./messages/it";
import { pt } from "./messages/pt";
import type { MessagePath } from "./types";

export type MessageKey = MessagePath<Messages>;

/**
 * Every catalog, statically imported.
 *
 * Deliberately not dynamic: the whole set is ~90 KB of strings, the app is a single
 * client bundle behind a splash screen, and a language change must be instant — an
 * `await import()` here would put a network round trip between the tap and the redraw,
 * which is exactly the thing that makes a switcher feel like a different application.
 */
const CATALOGS: Record<Locale, unknown> = { en, fr, ar, es, de, it, pt };

function lookup(catalog: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, catalog);
  return typeof value === "string" ? value : undefined;
}

/**
 * Locale-aware lookup with English fallback. Never throws, never renders "undefined":
 * a missing key returns the key itself, which is loud in review and harmless on stage.
 *
 * `vars` interpolates {name} placeholders.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw =
    lookup(CATALOGS[locale] ?? CATALOGS[FALLBACK_LOCALE], key) ??
    lookup(CATALOGS[FALLBACK_LOCALE], key) ??
    key;

  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translatorFor(locale: Locale): Translator {
  return (key, vars) => translate(locale, key, vars);
}

export {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALES,
  LOCALE_FLAG,
  LOCALE_LABEL,
  LOCALE_SHORT,
  LOCALE_TAG,
  direction,
  isLocale,
  matchLocale,
} from "./locales";
export { formatClock, formatDate, formatList, formatMad, formatMadRange, formatNumber } from "./format";
export type { Messages };
