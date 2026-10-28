/**
 * Adaptation registry. All four are implemented: three of them used to be placeholders
 * that answered "nothing to change here yet" no matter what day you gave them, which
 * made three of the four buttons in the sheet look broken.
 *
 * Every adapter is wrapped once, here, so a throw anywhere can never reach the stage:
 * the day the user is looking at is returned unchanged instead.
 */
import { lessTimeAdapter } from "./less-time";
import { lessWalkingAdapter } from "./less-walking";
import { rainyDayAdapter } from "./rainy-day";
import { spendLessAdapter } from "./spend-less";
import type { Adapter } from "./types";
import type { AdaptationRequest, AdaptationResult, AdaptationType } from "@/types/adaptation";
import type { LocalizedText } from "@/types/common";
import type { Trip } from "@/types/trip";

const NOT_YET: LocalizedText = {
  en: "Not available for this day yet.",
  fr: "Pas encore disponible pour cette journée.",
  ar: "غير متاح لهذا اليوم بعد.",
  es: "Aún no disponible para este día.",
  de: "Für diesen Tag noch nicht möglich.",
  it: "Non ancora disponibile per questa giornata.",
  pt: "Ainda não disponível para este dia.",
};

export function noChange(
  type: AdaptationType,
  trip: Trip,
  reason: LocalizedText = NOT_YET,
): AdaptationResult {
  const { metrics } = trip;
  return {
    type,
    applied: false,
    trip,
    delta: {
      walkingMetersBefore: metrics.walkingMeters,
      walkingMetersAfter: metrics.walkingMeters,
      carMetersBefore: metrics.carMeters,
      carMetersAfter: metrics.carMeters,
      movementMinutesBefore: metrics.movementMinutes,
      movementMinutesAfter: metrics.movementMinutes,
      walkingReductionPercent: 0,
      minutesSaved: 0,
    },
    headline: reason,
    changedSegmentIds: [],
    reason,
  };
}

const ADAPTERS: Record<AdaptationType, Adapter> = {
  less_walking: lessWalkingAdapter,
  less_time: lessTimeAdapter,
  spend_less: spendLessAdapter,
  rainy_day: rainyDayAdapter,
};

export const ADAPTATION_TYPES: readonly AdaptationType[] = [
  "less_walking",
  "less_time",
  "spend_less",
  "rainy_day",
] as const;

/** The only entry point the UI uses. Never throws, never returns a broken trip. */
export async function adapt(
  request: AdaptationRequest,
  signal?: AbortSignal,
): Promise<AdaptationResult> {
  try {
    return await ADAPTERS[request.type].apply(request, signal);
  } catch {
    return noChange(request.type, request.trip);
  }
}

export { lessTimeAdapter, lessWalkingAdapter, rainyDayAdapter, spendLessAdapter };
