/**
 * Where the traveller's language lives, and how it gets decided the very first time.
 *
 * TWO STORES, ONE VALUE, ON PURPOSE:
 *
 *   localStorage — the source of truth the app reads and writes, alongside the trip, the
 *                  passport and the wallet. Survives everything the demo does.
 *   cookie       — a mirror the *server* can read, so the root layout ships
 *                  <html lang="ar" dir="rtl"> in the very first byte. Without it, Arabic
 *                  paints left-to-right for one frame and then flips, which is the single
 *                  most obvious "this was bolted on" tell an RTL layout can have.
 *
 * The cookie is written by the same function that writes localStorage, so the two cannot
 * drift. Nothing else in the app is allowed to set either one.
 */
import { DEFAULT_LOCALE, isLocale } from "./locales";
import type { Locale } from "@/types/common";

export const LOCALE_COOKIE = "siyaha.locale";

/** A year. The preference is not a session — it is who this traveller is. */
const MAX_AGE = 60 * 60 * 24 * 365;

/** Server-side read, from a raw Cookie header or `cookies().toString()`. */
export function localeFromCookieHeader(header: string | null | undefined): Locale | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== LOCALE_COOKIE) continue;
    const value = decodeURIComponent(rest.join("="));
    if (isLocale(value)) return value;
  }
  return null;
}

export function writeLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

/**
 * First-visit detection. Runs only when nothing has been stored: once a traveller has
 * picked a language, their choice outranks whatever their phone is set to, forever.
 *
 * `navigator.languages` is the ordered preference list, so a phone set to
 * "nl-NL, de-DE, en-US" lands in German rather than falling through to the default.
 */
export function detectLocale(): Locale {
  // BENNA's screens are written in French only: following an English phone would put
  // English tabs under French pages. ponytail: drop this once the screens use t().
  return DEFAULT_LOCALE;
}
