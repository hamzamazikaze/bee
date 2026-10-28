/**
 * The content localisation layer.
 *
 * THE PROBLEM. A POI carries narrative text — a story, a tip — authored by someone who
 * knows the place. Those were written in English, French and Arabic. Four more interface
 * languages arrived; duplicating thirty-six POI objects seven times would have meant
 * seven copies of every coordinate, price, opening hour and category, and seven places
 * for them to drift apart.
 *
 * THE SHAPE. The dataset stays exactly as it is — one object per place, one id, one
 * coordinate. Translations arrive as a thin overlay keyed by POI id, merged into the
 * `LocalizedText` fields at module load. Nothing downstream changes: the engine, the
 * router, the map and the scoring all read the same POI they always did, and
 * `useLocalized()` picks the traveller's language out of a slightly fuller object.
 *
 * WHAT IS NEVER TRANSLATED. Ids, coordinates, categories, prices, opening hours, scoring
 * inputs, route ids — and the canonical `name`. A traveller looking for the Hassan II
 * Mosque needs the name on the building and in the taxi driver's ear, not a translation
 * of it. `localizedName` already exists for the few names that genuinely differ by
 * script (Arabic), and that is the only naming this layer touches.
 */
import type { Locale, LocalizedText } from "@/types/common";
import type { POI } from "@/types/poi";
import { OVERLAY_ES } from "./es";
import { OVERLAY_DE } from "./de";
import { OVERLAY_IT } from "./it";
import { OVERLAY_PT } from "./pt";

/** What a translator supplies for one place, in one language. Both fields optional. */
export interface PoiContentOverlay {
  story?: string;
  tip?: string;
}

/** POI id → its translated narrative. */
export type ContentOverlay = Record<string, PoiContentOverlay>;

/**
 * Only the languages the authored dataset does not already cover. en/fr/ar live in the
 * POI objects themselves and are not repeated here.
 */
const OVERLAYS: Partial<Record<Locale, ContentOverlay>> = {
  es: OVERLAY_ES,
  de: OVERLAY_DE,
  it: OVERLAY_IT,
  pt: OVERLAY_PT,
};

function withTranslations(
  text: LocalizedText,
  id: string,
  field: keyof PoiContentOverlay,
): LocalizedText {
  const extra: Partial<Record<Locale, string>> = {};
  for (const [locale, overlay] of Object.entries(OVERLAYS)) {
    const value = overlay?.[id]?.[field];
    if (value) extra[locale as Locale] = value;
  }
  return Object.keys(extra).length > 0 ? { ...text, ...extra } : text;
}

/**
 * Returns the POI with its narrative widened to every language we have.
 *
 * A pure copy: the input object is never mutated, and a POI with no overlay entry is
 * returned as-is rather than cloned, so the golden fixtures stay reference-identical to
 * what the fixture tests compare against.
 */
export function localizePoi(poi: POI): POI {
  if (!poi.cultural) return poi;
  const story = withTranslations(poi.cultural.story, poi.id, "story");
  const tip = withTranslations(poi.cultural.tip, poi.id, "tip");
  if (story === poi.cultural.story && tip === poi.cultural.tip) return poi;
  return { ...poi, cultural: { ...poi.cultural, story, tip } };
}

/** How many places have narrative in a given language. Read by the coverage test. */
export function overlayCoverage(locale: Locale): number {
  return Object.keys(OVERLAYS[locale] ?? {}).length;
}

export { OVERLAYS };
