/**
 * Less Walking — the one fully implemented adaptation.
 *
 * The rule is deliberately narrow: keep the same POIs, the same narrative order and the
 * same arrival times (the 16:00 Hassan II guided visit is an anchor), and switch only the
 * walking segments that are longer than LESS_WALKING_SEGMENT_METERS to car. Reordering the day
 * would move arrival times, so we never do it — the promise is less walking, not a
 * different day.
 *
 * All route numbers come from calculateMetrics(). This engine does no arithmetic of its
 * own on totals: the trip engine and this adapter must agree on stage.
 */
import { LESS_WALKING_SEGMENT_METERS } from "@/config/app";
import type { Adapter } from "@/lib/adaptation/types";
import { calculateMetrics } from "@/lib/routing/metrics";
import { buildDelta, toCarSegment, unchanged } from "./shared";
import type { AdaptationRequest, AdaptationResult } from "@/types/adaptation";
import type { LocalizedText } from "@/types/common";

function headlineFor(percent: number, minutesSaved: number): LocalizedText {
  return {
    en: `${percent}% less walking · ~${minutesSaved} min saved`,
    fr: `${percent} % de marche en moins · ~${minutesSaved} min gagnées`,
    ar: `مشي أقل بنسبة ${percent}٪ · توفير ~${minutesSaved} دقيقة`,
  };
}

const NOTHING_TO_IMPROVE: LocalizedText = {
  en: "This day is already easy on your feet.",
  fr: "Cette journée est déjà douce pour vos pieds.",
  ar: "هذا اليوم مريح لقدميك بالفعل.",
  es: "Este día ya es suave para tus pies.",
  de: "Dieser Tag ist schon fußfreundlich.",
  it: "Questa giornata è già leggera per le gambe.",
  pt: "Este dia já é leve para os pés.",
};

export const lessWalkingAdapter: Adapter = {
  type: "less_walking",

  // Pure and synchronous under the hood; async only because the contract is async.
  async apply({ trip }: AdaptationRequest): Promise<AdaptationResult> {
    const changedSegmentIds: string[] = [];

    const segments = trip.segments.map((segment) => {
      if (segment.mode !== "walking" || segment.distanceMeters <= LESS_WALKING_SEGMENT_METERS) {
        return segment;
      }
      const byCar = toCarSegment(segment);
      // Never sell a "saving" that costs time.
      if (byCar.durationMinutes >= segment.durationMinutes) return segment;

      changedSegmentIds.push(segment.id);
      return byCar;
    });

    if (changedSegmentIds.length === 0) return unchanged("less_walking", trip, NOTHING_TO_IMPROVE);

    // Stops are untouched: same POIs, same order, same arrival times.
    const metrics = calculateMetrics(trip.stops, segments);
    const delta = buildDelta(trip.metrics, metrics);

    return {
      type: "less_walking",
      applied: true,
      trip: { ...trip, segments, metrics },
      delta,
      headline: headlineFor(delta.walkingReductionPercent, delta.minutesSaved),
      changedSegmentIds,
    };
  },
};
