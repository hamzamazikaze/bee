/**
 * Locale-aware presentation of numbers, money and dates.
 *
 * Two rules the whole app obeys:
 *
 * 1. DIGITS STAY LATIN. Morocco writes 1 250, not ١٢٥٠ — `numberingSystem: "latn"` is
 *    pinned on every formatter so Arabic reads the same figures as the receipt will.
 * 2. VALUES NEVER CHANGE. Switching language regroups the thousands separator and moves
 *    the currency to the other side of the number. It does not convert, round or scale.
 *    150 MAD is 150 MAD in all seven.
 */
import { LOCALE_TAG } from "./locales";
import { num } from "@/lib/utils";
import type { Locale } from "@/types/common";

const CURRENCY = "MAD";

function tag(locale: Locale): string {
  return LOCALE_TAG[locale] ?? "en-GB";
}

/** Grouped integer or decimal: 1 250 (fr), 1,250 (en), 1.250 (de/it/pt/es). */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(tag(locale), {
    numberingSystem: "latn",
    ...options,
  }).format(value);
}

/**
 * Money, in the product's own convention: the grouped figure plus the literal "MAD".
 *
 * Deliberately not `style: "currency"` — that yields "1250,00 MAD" in French and
 * "MAD 1,250.00" in English, and this product has never shown dirham centimes. The
 * figure is bidi-isolated so "150 MAD" cannot flip to "MAD 150" inside an Arabic line.
 */
export function formatMad(value: number, locale: Locale): string {
  const figure = formatNumber(Math.round(value), locale, { maximumFractionDigits: 0 });
  return `${num(figure)} ${CURRENCY}`;
}

/** "180–200 MAD", or "150 MAD" when the range is degenerate. */
export function formatMadRange(min: number, max: number, locale: Locale): string {
  if (min === max) return formatMad(min, locale);
  const lo = formatNumber(min, locale, { maximumFractionDigits: 0 });
  const hi = formatNumber(max, locale, { maximumFractionDigits: 0 });
  return `${num(`${lo}–${hi}`)} ${CURRENCY}`;
}

/** "12 Mar" / "12 mars" / "12 مارس". Empty string for an unparseable date, never "Invalid Date". */
export function formatDate(
  iso: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(tag(locale), { numberingSystem: "latn", ...options }).format(date);
}

/** "09:30" everywhere — a clock time is data, and the timeline aligns on its width. */
export function formatClock(time: string, locale: Locale): string {
  return locale === "ar" ? num(time) : time;
}

/**
 * "Culture, food and coast" / "Culture, gastronomie et côte".
 * Falls back to a plain join where Intl.ListFormat is unavailable.
 */
export function formatList(items: readonly string[], locale: Locale): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  try {
    return new Intl.ListFormat(tag(locale), { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}
