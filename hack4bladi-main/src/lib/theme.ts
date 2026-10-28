/**
 * Light or dark. A cookie only — the server reads it so `<html data-theme>` is right in
 * the first byte (same reason as the locale cookie in @/lib/i18n/preference). Light is
 * the default.
 */
export type Theme = "dark" | "light";

export const THEME_COOKIE = "siyaha.theme";
export const DEFAULT_THEME: Theme = "light";

export const THEME_COLOR: Record<Theme, string> = { dark: "#130e0d", light: "#fbf6ee" };

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}
