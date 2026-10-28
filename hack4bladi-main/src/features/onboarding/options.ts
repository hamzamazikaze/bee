import { Compass, Footprints, Bank, Palette, ForkKnife, Waves, type Icon } from "@phosphor-icons/react";
import type { MessageKey } from "@/lib/i18n";
import type {
  BudgetLevel,
  Interest,
  TripPace,
  TimeAvailable,
  WalkingPreference,
} from "@/types/profile";
import { INTERESTS } from "@/types/profile";

export interface InterestOption {
  value: Interest;
  labelKey: MessageKey;
  icon: Icon;
  image: string;
  fallbackImage: string;
}

/**
 * Each interest owns its image rather than borrowing a POI's, so the six tiles read as
 * six different things. Drop a photograph at the same path to replace one — the tiles
 * previously shared four POI heroes and looked duplicated.
 */
const META: Record<Interest, { icon: Icon; image: string }> = {
  culture: { icon: Bank, image: "/images/vibes/culture.webp" },
  food: { icon: ForkKnife, image: "/images/vibes/food.webp" },
  coast_nature: { icon: Waves, image: "/images/vibes/coast.webp" },
  hidden_gems: { icon: Compass, image: "/images/vibes/hidden-gems.webp" },
  art_creative: { icon: Palette, image: "/images/vibes/art.webp" },
  activities: { icon: Footprints, image: "/images/vibes/adventure.webp" },
};

/** Exactly the six interests from @/types/profile — one union, one matching rule. */
export const INTEREST_OPTIONS: InterestOption[] = INTERESTS.map((value) => ({
  value,
  labelKey: `onboarding.interest.${value}` as MessageKey,
  icon: META[value].icon,
  image: META[value].image,
  fallbackImage: "/images/placeholder.svg",
}));

export const TIME_OPTIONS: { value: TimeAvailable; labelKey: MessageKey }[] = [
  { value: "few_hours", labelKey: "onboarding.timeOption.few_hours" },
  { value: "half_day", labelKey: "onboarding.timeOption.half_day" },
  { value: "full_day", labelKey: "onboarding.timeOption.full_day" },
];

export const BUDGET_OPTIONS: { value: BudgetLevel; labelKey: MessageKey }[] = [
  { value: "low", labelKey: "onboarding.budgetOption.low" },
  { value: "medium", labelKey: "onboarding.budgetOption.medium" },
  { value: "premium", labelKey: "onboarding.budgetOption.premium" },
];

export const PACE_OPTIONS: { value: TripPace; labelKey: MessageKey }[] = [
  { value: "relaxed", labelKey: "onboarding.paceOption.relaxed" },
  { value: "balanced", labelKey: "onboarding.paceOption.balanced" },
  { value: "explorer", labelKey: "onboarding.paceOption.explorer" },
];

/**
 * Mobility, in the traveller's words rather than the engine's. `minimal` is what the
 * understanding layer sets when someone says "not too much walking", and it is the one
 * preference the matching engine weights directly (engine.ts:170).
 */
export const WALKING_OPTIONS: { value: WalkingPreference; labelKey: MessageKey }[] = [
  { value: "minimal", labelKey: "onboarding.walkingOption.minimal" },
  { value: "normal", labelKey: "onboarding.walkingOption.normal" },
  { value: "plenty", labelKey: "onboarding.walkingOption.plenty" },
];
