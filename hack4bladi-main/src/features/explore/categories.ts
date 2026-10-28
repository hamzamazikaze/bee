/**
 * The one category taxonomy of the product.
 *
 * It is deliberately the dataset's own six categories — the same union as `Interest`,
 * so a tile, an Explore chip and a POI's `categories[]` all speak one language. The
 * previous Home row invented five labels of its own ("Heritage", "Nature") on top of
 * the same six, which meant Culture and Heritage resolved to the same 24 places: a
 * tile that promises a different shelf and returns the one you just left.
 */
import {
  Bank,
  Compass,
  ForkKnife,
  PaintBrush,
  PersonSimpleHike,
  Waves,
  type Icon,
} from "@phosphor-icons/react";
import { POIS } from "@/data/pois";
import type { MessageKey } from "@/lib/i18n";
import type { POI } from "@/types/poi";
import type { Interest } from "@/types/profile";

export interface Category {
  id: Interest;
  /** Short label for the 56px tile. The long form lives in `onboarding.interest.*`. */
  labelKey: MessageKey;
  leadKey: MessageKey;
  icon: Icon;
  /**
   * What "build a whole day of this" prefills. A category is one interest; a day made
   * of it is that interest plus the one that naturally travels with it.
   */
  interests: Interest[];
}

export const CATEGORIES: Category[] = [
  {
    id: "coast_nature",
    labelKey: "home.category.coast_nature",
    leadKey: "category.lead.coast_nature",
    icon: Waves,
    interests: ["coast_nature", "activities"],
  },
  {
    id: "culture",
    labelKey: "home.category.culture",
    leadKey: "category.lead.culture",
    icon: Bank,
    interests: ["culture", "art_creative"],
  },
  {
    id: "food",
    labelKey: "home.category.food",
    leadKey: "category.lead.food",
    icon: ForkKnife,
    interests: ["food", "hidden_gems"],
  },
  {
    id: "hidden_gems",
    labelKey: "home.category.hidden_gems",
    leadKey: "category.lead.hidden_gems",
    icon: Compass,
    interests: ["hidden_gems", "culture"],
  },
  {
    id: "art_creative",
    labelKey: "home.category.art_creative",
    leadKey: "category.lead.art_creative",
    icon: PaintBrush,
    interests: ["art_creative", "culture"],
  },
  {
    id: "activities",
    labelKey: "home.category.activities",
    leadKey: "category.lead.activities",
    icon: PersonSimpleHike,
    interests: ["activities", "coast_nature"],
  },
];

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function getCategory(id: string): Category | undefined {
  return BY_ID.get(id as Interest);
}

/**
 * Everything the dataset holds under this category, best first.
 *
 * Signature entries lead, then curation weight, then a stable alphabetical tie-break so
 * the shelf never reshuffles between renders.
 */
export function poisInCategory(id: string): POI[] {
  return POIS.filter((poi) => poi.categories.includes(id as Interest)).sort(
    (a, b) =>
      Number(b.signature) - Number(a.signature) ||
      b.priority - a.priority ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Places are things; experiences are people. The category screen shows them as two
 * shelves because a jury reading "12 places · 3 experiences" learns what the product
 * is in one line.
 */
export function splitByKind(pois: POI[]): { places: POI[]; experiences: POI[] } {
  return {
    places: pois.filter((poi) => (poi.kind ?? "place") === "place"),
    experiences: pois.filter((poi) => (poi.kind ?? "place") !== "place"),
  };
}
