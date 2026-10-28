"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { applyTheme, DEFAULT_THEME, isTheme, type Theme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n/use-translation";

/** `data-theme` on <html> is the source of truth (the server set it from the cookie). */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : DEFAULT_THEME;
}

/** Light / dark switch. Same trigger grammar as LanguageMenu so the settings row reads as one set. */
export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);

  const label = theme === "dark" ? t("passport.themeDark") : t("passport.themeLight");
  const Icon = theme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label={`${t("passport.theme")}: ${label}`}
      onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
      className="pressable border-border bg-surface text-foreground hover:border-primary/60 inline-flex h-11 items-center gap-1.5 rounded-full border ps-2.5 pe-3 transition"
    >
      <Icon aria-hidden className="text-primary-ink size-[1.125rem] shrink-0" weight="fill" />
      <span className="text-xs font-semibold tracking-wide">{label}</span>
    </button>
  );
}
