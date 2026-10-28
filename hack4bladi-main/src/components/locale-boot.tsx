"use client";

import { createContext, type ReactNode } from "react";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import type { Locale } from "@/types/common";

/**
 * The locale the *server* rendered with, read from the cookie.
 *
 * WHY THIS EXISTS ALONGSIDE THE STORE. Zustand v5 serves `getInitialState()` — not
 * `getState()` — as the server snapshot, and React reuses that same snapshot for the
 * hydrating render so the two passes cannot disagree. That is correct of it, and it
 * means no amount of `setState` before render can change what SSR emits: a visitor with
 * a German cookie was served a French home screen with `dir="ltr"` correct on top of it.
 *
 * So the first render reads its language from here, and everything after it reads the
 * store. `useTranslation` switches between them on `hydrated`, which is false through
 * SSR and the hydrating render and true from the moment the store has read localStorage.
 * One value is authoritative at any instant; neither is a copy of the other.
 */
export const ServerLocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleBoot({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <ServerLocaleContext.Provider value={locale}>{children}</ServerLocaleContext.Provider>;
}
