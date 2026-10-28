import { HABOUS, HASSAN_II, MARCHE_CENTRAL } from "@/data/fixtures";
import type { MessageKey } from "@/lib/i18n";
import type { Interest } from "@/types/profile";

export interface Preset {
  id: string;
  titleKey: MessageKey;
  metaKey: MessageKey;
  /** Prefills onboarding. It never builds a trip on its own. */
  interests: Interest[];
  image: string;
  fallbackImage: string;
  /** Optional looping clip. The still stays as the poster, so this can never blank a tile. */
  video?: string;
}

const media = (poi: { media: { heroImage: string; fallbackImage: string } }) => ({
  image: poi.media.heroImage,
  fallbackImage: poi.media.fallbackImage,
});

/**
 * The three Popular cards own their imagery: they are a region, not a single POI, and
 * borrowing one stop's photo undersold them. Replace the file, keep the name.
 */
const popularMedia = (slug: string, category: string) => ({
  image: `/images/popular/${slug}.webp`,
  fallbackImage: `/images/vibes/${category}.webp`,
});

/** Three moods. Softer entry than a named route — a feeling, not an itinerary. */
export const MOODS: Preset[] = [
  {
    id: "arches",
    titleKey: "home.mood.arches.title",
    metaKey: "home.mood.arches.meta",
    interests: ["culture", "art_creative"],
    ...media(HABOUS),
    video: "/videos/habous.mp4",
  },
  {
    id: "sunset",
    titleKey: "home.mood.sunset.title",
    metaKey: "home.mood.sunset.meta",
    interests: ["coast_nature", "culture"],
    ...media(HASSAN_II),
    video: "/videos/corniche.mp4",
  },
  {
    id: "lunch",
    titleKey: "home.mood.lunch.title",
    metaKey: "home.mood.lunch.meta",
    interests: ["food", "hidden_gems"],
    ...media(MARCHE_CENTRAL),
  },
];

/** Exactly three, per docs/prompts/UI_WORKER.md. Tapping one prefills onboarding. */
export const POPULAR: Preset[] = [
  {
    id: "culture",
    titleKey: "home.popular.culture.title",
    metaKey: "home.popular.culture.meta",
    interests: ["culture", "art_creative"],
    ...popularMedia("culture-casablanca", "culture"),
    /* The wall close-up read as an empty card under the scrim; the mosque is the icon. */
    image: HASSAN_II.media.heroImage,
  },
  {
    id: "atlantic",
    titleKey: "home.popular.atlantic.title",
    metaKey: "home.popular.atlantic.meta",
    interests: ["coast_nature", "culture"],
    ...popularMedia("atlantic-escape", "coast"),
  },
  {
    id: "food",
    titleKey: "home.popular.food.title",
    metaKey: "home.popular.food.meta",
    interests: ["food", "hidden_gems"],
    ...popularMedia("local-food-trail", "food"),
  },
];

/**
 * Sources are additive and unique — a screenshot plus a voice note is a valid profile.
 * Re-exported from the understanding layer so there is one implementation, not two.
 */
export { addSource } from "@/lib/intent";
