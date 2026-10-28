"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { direction } from "@/lib/i18n/locales";
import { useLocale } from "@/lib/i18n/use-translation";

/**
 * Rehydrates the store from localStorage once, and keeps <html lang/dir> in sync.
 *
 * Locale lives in client state rather than the URL on purpose: no [locale] route segment
 * means three workers never have to restructure their page paths, and changing language
 * never navigates — the trip, the map and the composer stay exactly where they were.
 *
 * The locale is already in the store by the time this runs — <LocaleBoot> seeded it from
 * the cookie. This only keeps the live <html> attributes following a later switch, and
 * covers the genuine first visit where there was no cookie to read.
 */
export function StoreHydration() {
  const hydrate = useAppStore((state) => state.hydrate);
  const locale = useLocale();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction(locale);
  }, [locale]);

  return null;
}
