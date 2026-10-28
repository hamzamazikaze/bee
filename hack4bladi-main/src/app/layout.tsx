import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Marhey, Readex_Pro } from "next/font/google";
import { IconProvider } from "@/components/icon-provider";
import { LocaleBoot } from "@/components/locale-boot";
import { Splash } from "@/components/splash";
import { StageBrand } from "@/components/stage-brand";
import { StoreHydration } from "@/components/store-hydration";
import { APP } from "@/config/app";
import { DEFAULT_LOCALE, direction, translate } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/preference";
import { DEFAULT_THEME, isTheme, THEME_COLOR, THEME_COOKIE, type Theme } from "@/lib/theme";
import { isLocale } from "@/lib/i18n/locales";
import type { Locale } from "@/types/common";
import "./globals.css";

/**
 * Readex Pro carries everything — titles, UI, prices, times. Its Latin and Arabic were
 * drawn as one system for app interfaces, so French, Darija in Latin script and Arabic sit
 * on the same rhythm. Numbers use tabular figures (see .font-mono in globals.css).
 */
const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["latin", "arabic"],
  display: "swap",
});

/** Marhey: rounded, playful Arabic display — the brand name بنّة only, echoing the bubbly wordmark. */
const marhey = Marhey({
  variable: "--font-marhey",
  subsets: ["arabic"],
  weight: "700",
  display: "swap",
});

/**
 * The traveller's language, read on the server.
 *
 * The cookie is written by the client the moment a language is chosen or detected
 * (@/lib/i18n/preference), which is what lets `<html dir>` be correct in the first byte
 * rather than corrected after hydration. A missing cookie is a genuine first visit: the
 * default renders, and the client re-decides from the browser a moment later.
 */
async function serverLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

async function serverTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : DEFAULT_THEME;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await serverLocale();
  return {
    title: `${APP.name} · ${translate(locale, "common.tagline")}`,
    description: translate(locale, "home.heroSubtitle"),
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icons/benna-192.png", apple: "/icons/benna-apple.png" },
    appleWebApp: { capable: true, statusBarStyle: "default", title: APP.name },
    openGraph: {
      title: `${APP.name} · ${translate(locale, "common.tagline")}`,
      description: translate(locale, "home.heroSubtitle"),
      locale,
      type: "website",
      siteName: APP.name,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: THEME_COLOR[await serverTheme()],
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([serverLocale(), serverTheme()]);
  return (
    <html
      lang={locale}
      data-theme={theme}
      dir={direction(locale)}
      className={`${readex.variable} ${marhey.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Kept out of globals.css on purpose: its toolchain cannot parse this pseudo-element
            yet. It clips page transitions to the rounded phone screen (see globals.css). */}
        <style>{"::view-transition-group-children(app-screen){overflow:clip;border-radius:var(--app-radius)}"}</style>
        {/* Wraps the whole document, not just the routed screen: the desktop stage
            caption is copy too, and it sits beside the device rather than inside it. */}
        <LocaleBoot locale={locale}>
          <StoreHydration />
          <IconProvider>
            <div className="app-stage">
              <StageBrand />
              <div className="app-phone">
                <div id="app-viewport" className="app-viewport">
                  {children}
                </div>
                <Splash />
              </div>
            </div>
          </IconProvider>
        </LocaleBoot>
      </body>
    </html>
  );
}
