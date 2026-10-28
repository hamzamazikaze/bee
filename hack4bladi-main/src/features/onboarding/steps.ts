import type { Interest, TripProfile } from "@/types/profile";

export const MAX_INTERESTS = 3;
export const STEP_COUNT = 3;

/**
 * Tapping a seventh time must still do something — nothing in this product is a dead
 * control. At the cap we drop the oldest choice instead of ignoring the tap.
 */
export function toggleInterest(current: Interest[], interest: Interest): Interest[] {
  if (current.includes(interest)) return current.filter((item) => item !== interest);
  if (current.length >= MAX_INTERESTS) return [...current.slice(1), interest];
  return [...current, interest];
}

/** Progressive profiling: if we already know the inspiration, do not ask for it again. */
export function initialStep(profile: TripProfile): 1 | 2 {
  return profile.sources.length > 0 ? 2 : 1;
}

/** What the "Your inspiration" step can show back to the user, if anything. */
export function inspirationSummary(profile: TripProfile): string | null {
  if (profile.detectedPlace) return profile.detectedPlace;
  if (profile.social?.url) {
    try {
      return new URL(profile.social.url).hostname.replace(/^www\./, "");
    } catch {
      return profile.social.url;
    }
  }
  if (profile.transcript) return profile.transcript.slice(0, 120);
  return null;
}
