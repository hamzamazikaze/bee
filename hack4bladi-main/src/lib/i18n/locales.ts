import type { Locale } from "@/types/common";

/**
 * Seven interface languages, in the order the language sheet lists them.
 *
 * French leads because the region's travellers and its own signage do; English is the
 * fallback because it is the language every catalog is authored against.
 */
export const LOCALES = ["fr", "en", "ar", "es", "de", "it", "pt"] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = "fr";
/** What `t()` falls back to when a key is missing. Never shown as a language choice. */
export const FALLBACK_LOCALE: Locale = "en";

const RTL_LOCALES = new Set<Locale>(["ar"]);

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

/** The language named in itself. Never translated — nobody looks for "German" in Arabic. */
export const LOCALE_LABEL: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

/** The two-letter chip on the compact trigger. Uppercase is applied in CSS, not here. */
export const LOCALE_SHORT: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
  es: "ES",
  de: "DE",
  it: "IT",
  pt: "PT",
};

/**
 * Supplementary only, and chosen for the language's centre of gravity rather than a
 * claim about who speaks it. Arabic gets Morocco because this is a Moroccan product.
 * Never the sole signal — `LOCALE_LABEL` always renders beside it.
 */
export const LOCALE_FLAG: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ar: "🇲🇦",
  es: "🇪🇸",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇵🇹",
};

/** BCP-47 tag for Intl. Arabic is pinned to Morocco: Latin digits, Gregorian months. */
export const LOCALE_TAG: Record<Locale, string> = {
  fr: "fr-MA",
  en: "en-GB",
  ar: "ar-MA",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
};

/**
 * First-visit detection: `fr-MA` → `fr`, `pt-BR` → `pt`, anything unsupported → default.
 *
 * Takes the browser's ordered preference list, so a traveller whose phone is set to
 * `nl-NL, de-DE, en` lands in German rather than in the default.
 */
export function matchLocale(preferred: readonly string[] | undefined): Locale | null {
  for (const tag of preferred ?? []) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}
