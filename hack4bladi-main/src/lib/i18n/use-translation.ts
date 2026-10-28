"use client";

import { useContext, useMemo } from "react";
import { ServerLocaleContext } from "@/components/locale-boot";
import { useAppStore } from "@/lib/store";
import { translatorFor, type Translator } from ".";
import { direction } from "./locales";
import type { Locale } from "@/types/common";

/**
 * The active language.
 *
 * Before hydration that is the cookie the server rendered with; after it, the store —
 * see @/components/locale-boot for why the two cannot be collapsed into one. Every
 * component that shows copy goes through this, so the switchover happens in one place.
 */
export function useLocale(): Locale {
  const serverLocale = useContext(ServerLocaleContext);
  const storeLocale = useAppStore((state) => state.locale);
  const hydrated = useAppStore((state) => state.hydrated);
  return hydrated ? storeLocale : serverLocale;
}

/**
 * The one hook every component uses for copy.
 *
 *   const { t, locale, dir } = useTranslation();
 *   <h1>{t("home.heroTitle")}</h1>
 */
export function useTranslation(): {
  t: Translator;
  locale: Locale;
  dir: "ltr" | "rtl";
} {
  const locale = useLocale();
  const t = useMemo(() => translatorFor(locale), [locale]);
  return { t, locale, dir: direction(locale) };
}

/**
 * Picks the right side of a LocalizedText.
 *
 * Falls back locale → English → whatever the object has, so a place whose story has not
 * been translated yet reads in English rather than rendering nothing.
 */
export function useLocalized() {
  const locale = useLocale();
  return (text: Partial<Record<Locale, string>> | undefined | null): string => {
    if (!text) return "";
    return text[locale] ?? text.en ?? Object.values(text).find(Boolean) ?? "";
  };
}
