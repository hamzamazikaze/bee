/**
 * Primitive shared vocabulary. Owned by Lead — import freely, do not redefine.
 */

/**
 * The seven interface languages. The single source of truth for "what can the UI be in".
 * Ordered the way the language sheet presents them: French first, it is the default here.
 */
export type Locale = "fr" | "en" | "ar" | "es" | "de" | "it" | "pt";

/**
 * The languages the curated dataset is *authored* in.
 *
 * Deliberately narrower than `Locale`. A POI story is written by a human who knows the
 * place; the four later locales arrive as an overlay (see src/data/content) rather than
 * as a promise the type system extracts from data that does not exist yet. Widening
 * `Locale` therefore costs the dataset nothing — every existing literal still typechecks.
 */
export type ContentLocale = "en" | "fr" | "ar";

/**
 * Content-level translation (POI stories, tips). App UI strings live in src/lib/i18n.
 *
 * The three authored languages are required, the four overlay languages optional, so a
 * literal may carry all seven and none is forced to. Readers must go through
 * `pickLocalized` / `useLocalized`, which falls back locale → en → any.
 */
export type LocalizedText = Record<ContentLocale, string> & Partial<Record<Locale, string>>;

export interface Coordinates {
  lat: number;
  lng: number;
}

/** 0..1 per key. Sparse: a missing key means "not inferred". */
export type ConfidenceMap<K extends string = string> = Partial<Record<K, number>>;

/** 0 = Sunday … 6 = Saturday */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** "HH:mm", 24h, local Morocco time. */
export type ClockTime = string;

/** Inclusive [min, max] in MAD. */
export type MadRange = [number, number];
