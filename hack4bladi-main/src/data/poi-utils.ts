/**
 * Shared constructors for the curated POI dataset. Split out so the Casablanca and
 * coastal files stay pure data.
 */
import type { Locale, Weekday } from "@/types/common";
import type { OpeningHours, POICategory, POIMedia, POISource, TimeWindow } from "@/types/poi";

export const REGION = "Casablanca-Settat";
export const PLACEHOLDER = "/images/placeholder.svg";

/** Every coordinate in this dataset was read from OSM data, not from memory. */
export const OSM: POISource[] = [
  { name: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
];

/**
 * One art-directed image per interest, reused as the fallback for every POI that has no
 * photograph yet. A card without media still looks composed and category-appropriate
 * rather than blank — and it is the same file the onboarding tile uses.
 */
const CATEGORY_IMAGE: Record<POICategory, string> = {
  culture: "/images/vibes/culture.webp",
  food: "/images/vibes/food.webp",
  coast_nature: "/images/vibes/coast.webp",
  hidden_gems: "/images/vibes/hidden-gems.webp",
  art_creative: "/images/vibes/art.webp",
  activities: "/images/vibes/adventure.webp",
};

/**
 * `heroImage` is derived from the slug, so dropping `public/images/poi/<slug>.webp` on
 * disk is the whole of "adding a photo" — no code change anywhere.
 *
 * Until that file exists the browser 404s it and the component falls through to
 * `fallbackImage`: the category image, or the packaged placeholder as a last resort.
 */
export function media(slug: string, category?: POICategory): POIMedia {
  return {
    heroImage: `/images/poi/${slug}.webp`,
    fallbackImage: category ? CATEGORY_IMAGE[category] : PLACEHOLDER,
  };
}

/**
 * Same open/close every day, optionally closed on some weekdays.
 * `needsVerification` defaults to true: these hours are curated, never a live API.
 */
export function hours(
  open: string,
  close: string,
  options: { closed?: Weekday[]; needsVerification?: boolean } = {},
): OpeningHours {
  const window: TimeWindow[] = [{ open, close }];
  const closed = new Set(options.closed ?? []);
  const weekly = {} as Record<Weekday, TimeWindow[]>;
  for (let day = 0; day <= 6; day += 1) {
    const d = day as Weekday;
    weekly[d] = closed.has(d) ? [] : window;
  }
  return { weekly, needsVerification: options.needsVerification ?? true };
}

/**
 * The name to show in the current locale: `localizedName[locale]` when the dataset has
 * it, else the canonical `name`. The dataset is never modified — this only reads it.
 */
export function poiName(
  poi: { name: string; localizedName?: Partial<Record<Locale, string>> },
  locale: Locale,
): string {
  return poi.localizedName?.[locale] ?? poi.name;
}
