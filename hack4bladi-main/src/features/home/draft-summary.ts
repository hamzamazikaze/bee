/**
 * A draft, said back to the traveller in their own words.
 *
 * The confirmation surfaces show what we understood as a short row of chips rather than a
 * form, and every chip is an existing onboarding label — the same words the traveller will
 * see when they go and change it one step later. Nothing here invents copy.
 */
import type { MessageKey } from "@/lib/i18n";
import { walkingPreferenceOf } from "@/lib/intent";
import type { TripIntentDraft } from "@/types/intent";
import type { TripProfile } from "@/types/profile";

/** The parts of a day we can name. Order is the order they are read in. */
function chipsOf(source: {
  interests: TripProfile["interests"];
  timeAvailable: TripProfile["timeAvailable"];
  budgetLevel: TripProfile["budgetLevel"];
  pace: TripProfile["pace"];
  walkingPreference: TripProfile["walkingPreference"];
}): MessageKey[] {
  const keys: MessageKey[] = source.interests.map(
    (interest) => `onboarding.interest.${interest}` as MessageKey,
  );
  if (source.timeAvailable) keys.push(`onboarding.timeOption.${source.timeAvailable}` as MessageKey);
  if (source.budgetLevel) keys.push(`onboarding.budgetOption.${source.budgetLevel}` as MessageKey);
  if (source.pace) keys.push(`onboarding.paceOption.${source.pace}` as MessageKey);
  if (source.walkingPreference) {
    keys.push(`onboarding.walkingOption.${source.walkingPreference}` as MessageKey);
  }
  return keys;
}

export function draftChips(draft: TripIntentDraft): MessageKey[] {
  return chipsOf({
    interests: draft.interests,
    timeAvailable: draft.timeAvailable,
    budgetLevel: draft.budgetLevel,
    pace: draft.pace,
    walkingPreference: walkingPreferenceOf(draft.mobility.avoidLongWalks),
  });
}

export function profileChips(profile: TripProfile): MessageKey[] {
  return chipsOf(profile);
}

/** Did the understanding layer learn anything at all beyond the place? */
export function draftHasPreferences(draft: TripIntentDraft): boolean {
  return draftChips(draft).length > 0;
}
