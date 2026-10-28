/**
 * The confirmation boundary: a draft the AI produced becomes a profile the traveller owns.
 *
 * Nothing downstream ever sees a TripIntentDraft. The matching engine, the scheduler and
 * the router take a TripProfile and only a TripProfile, exactly as they always have —
 * this file is where "understood" turns into "confirmed", and it is the last step of the
 * understanding layer.
 */
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import type { Locale } from "@/types/common";
import type { IntentSource, TripIntentDraft } from "@/types/intent";
import type { InputSource, SocialContext, TripProfile } from "@/types/profile";
import { walkingPreferenceOf } from "./normalize";

/** Draft vocabulary → the profile's existing `sources` vocabulary. */
export const SOURCE_OF: Record<IntentSource, InputSource> = {
  image: "image",
  audio: "voice",
  text: "text",
  url: "social_url",
};

/** Adds a source without duplicating it. Order is arrival order. */
export function addSource(current: InputSource[], source: InputSource): InputSource[] {
  return current.includes(source) ? current : [...current, source];
}

export interface ConfirmOptions {
  /** The profile as it stands. Its manual choices are preserved unless overridden. */
  base?: TripProfile;
  /** Edits the traveller made on the confirmation screen. These always win. */
  edits?: Partial<TripProfile>;
  locale?: Locale;
  social?: SocialContext | null;
}

/**
 * Draft + the traveller's edits → the profile the engine builds from.
 *
 * Precedence, highest first: what they just edited, what the draft understood, what the
 * profile already held. A field the draft is unsure about never clears a value the
 * traveller had already chosen.
 */
export function draftToProfile(
  draft: TripIntentDraft,
  options: ConfirmOptions = {},
): TripProfile {
  const locale = options.locale ?? draft.locale;
  const base = options.base ?? createEmptyProfile(locale);
  const edits = options.edits ?? {};

  const walking = walkingPreferenceOf(draft.mobility.avoidLongWalks);

  const confirmed: TripProfile = {
    ...base,
    destination: draft.destination.city ?? base.destination,
    detectedPlace: draft.destination.detectedPlace ?? base.detectedPlace,
    detectedPoiId: draft.destination.detectedPoiId ?? base.detectedPoiId,
    interests: draft.interests.length > 0 ? draft.interests : base.interests,
    timeAvailable: draft.timeAvailable ?? base.timeAvailable,
    budgetLevel: draft.budgetLevel ?? base.budgetLevel,
    pace: draft.pace ?? base.pace,
    walkingPreference: walking ?? base.walkingPreference,
    locale,
    confidence: {
      ...base.confidence,
      ...(draft.destination.detectedPlace ? { detectedPlace: draft.destination.confidence } : {}),
      ...(draft.destination.city ? { destination: draft.destination.confidence } : {}),
      ...(draft.interests.length > 0 ? { interests: draft.confidence } : {}),
      ...(draft.timeAvailable ? { timeAvailable: draft.confidence } : {}),
      ...(draft.budgetLevel ? { budgetLevel: draft.confidence } : {}),
      ...(draft.pace ? { pace: draft.confidence } : {}),
    },
    sources: addSource(base.sources, SOURCE_OF[draft.source]),
    transcript: draft.evidence.transcript ?? base.transcript ?? null,
    social: options.social ?? base.social ?? null,
    // `createdAt` marks when the traveller confirmed, not when the model answered.
    createdAt: new Date().toISOString(),
  };

  return { ...confirmed, ...edits };
}
