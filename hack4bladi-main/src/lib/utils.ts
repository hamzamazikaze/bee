import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/types/common";

/** shadcn/ui convention. Merge conditional classes with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bidi-isolate a numeric run (U+2066 LRI … U+2069 PDI). Invisible in LTR; in Arabic it
 * stops "6.4 km" reading as "km 6.4" and "180–200" as "200–180" without putting
 * dir="ltr" on anything larger than the number itself.
 */
export function num(value: string | number): string {
  return `⁦${value}⁩`;
}

/** Morocco writes Western digits in Arabic — never Arabic-Indic numerals — and the
    app keeps one decimal convention (6.4) in every language rather than 6,4 in two. */
const NUMBER_LOCALE: Record<string, string> = { ar: "en", fr: "en" };

export function formatDistance(meters: number, locale: Locale | string = "en"): string {
  const l = locale as Locale;
  if (meters < 1000) return `${num(Math.round(meters / 10) * 10)} ${translate(l, "common.m")}`;
  const km = new Intl.NumberFormat(NUMBER_LOCALE[locale] ?? locale, { maximumFractionDigits: 1 }).format(
    meters / 1000,
  );
  return `${num(km)} ${translate(l, "common.km")}`;
}

export function formatDuration(minutes: number, locale: Locale | string = "en"): string {
  const l = locale as Locale;
  const min = translate(l, "common.minutes");
  if (minutes < 60) return `${num(minutes)} ${min}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${num(hours)} ${translate(l, "common.hour")}`;
  if (rest === 0) return h;
  // "1 h 22" stays the Latin shorthand; Arabic spells the minute unit ("1 س 22 د").
  return l === "ar" ? `${h} ${num(rest)} ${min}` : `${h} ${num(rest)}`;
}

/** "180–200" or, when the range is degenerate, just "180". Never "140–140". */
export function formatRange(min: number, max: number): string {
  return num(min === max ? String(min) : `${min}–${max}`);
}
