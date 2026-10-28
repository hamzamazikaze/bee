/**
 * Less Time — "I need to be done earlier."
 *
 * Two levers, both honest: shorten each visit toward a floor derived from the POI's own
 * base duration, and put the long walks in a car. The stops, their order and the day's
 * start never change; only the clock does. Arrival times are re-derived from the new
 * legs, so the timeline stays truthful rather than keeping stale times.
 */
import { LESS_WALKING_SEGMENT_METERS } from "@/config/app";
import { calculateMetrics } from "@/lib/routing/metrics";
import { isExperience } from "@/lib/wallet";
import {
  buildDelta,
  endMinutes,
  reschedule,
  toCarSegment,
  toClock,
  unchanged,
} from "./shared";
import type { Adapter } from "./types";
import type { AdaptationRequest, AdaptationResult } from "@/types/adaptation";
import type { LocalizedText } from "@/types/common";

/** No visit is worth doing below this. A 15-minute mosque is not a shorter visit. */
const MIN_VISIT_MINUTES = 25;
/** How far a visit may be trimmed from the POI's own base duration. */
const TRIM_FACTOR = 0.65;
/** Below this, "shorter day" is a rounding error and we say nothing changed. */
const MIN_SAVING_MINUTES = 20;

const ALREADY_TIGHT: LocalizedText = {
  en: "This day is already as short as it usefully gets.",
  fr: "Cette journée est déjà aussi courte qu'elle peut l'être utilement.",
  ar: "هذا اليوم قصير بالفعل بقدر ما هو مفيد.",
  es: "Este día ya es todo lo corto que puede ser.",
  de: "Kürzer lässt sich dieser Tag nicht sinnvoll machen.",
  it: "Questa giornata è già corta quanto ha senso che sia.",
  pt: "Este dia já é o mais curto que faz sentido.",
};

function headlineFor(saved: number, ends: string): LocalizedText {
  const h = Math.floor(saved / 60);
  const m = saved % 60;
  const span = h > 0 ? `${h} h ${m > 0 ? m : ""}`.trim() : `${m} min`;
  return {
    en: `${span} shorter · done by ${ends}`,
    fr: `${span} de moins · terminé à ${ends}`,
    ar: `أقصر بـ ${span} · ينتهي في ${ends}`,
  };
}

export const lessTimeAdapter: Adapter = {
  type: "less_time",

  async apply({ trip }: AdaptationRequest): Promise<AdaptationResult> {
    /*
     * 1. Trim each visit toward its own floor — never below MIN_VISIT_MINUTES.
     *
     * A booked experience is not trimmed at all. You can leave a mosque early; you cannot
     * leave a cooking class early, because the tajine is not done and the host is still
     * teaching. Trimming by TRIM_FACTOR turned the 105-minute cooking class into 70
     * minutes and the leather workshop into 50 — an appointment the traveller could not
     * keep, printed as though they could.
     */
    const trimmed = trip.stops.map((stop) => {
      if (isExperience(stop.poi)) return stop;
      const floor = Math.max(
        MIN_VISIT_MINUTES,
        Math.round((stop.poi.baseDurationMinutes * TRIM_FACTOR) / 5) * 5,
      );
      return stop.durationMinutes > floor ? { ...stop, durationMinutes: floor } : stop;
    });

    // 2. The long walks become car rides — moving time is time too.
    const changedSegmentIds: string[] = [];
    const segments = trip.segments.map((segment) => {
      if (segment.mode !== "walking" || segment.distanceMeters <= LESS_WALKING_SEGMENT_METERS) {
        return segment;
      }
      const byCar = toCarSegment(segment);
      if (byCar.durationMinutes >= segment.durationMinutes) return segment;
      changedSegmentIds.push(segment.id);
      return byCar;
    });

    const stops = reschedule(trimmed, segments);
    const metrics = calculateMetrics(stops, segments);
    const saved = trip.metrics.totalMinutes - metrics.totalMinutes;

    if (saved < MIN_SAVING_MINUTES) return unchanged("less_time", trip, ALREADY_TIGHT);

    return {
      type: "less_time",
      applied: true,
      trip: { ...trip, stops, segments, metrics },
      delta: { ...buildDelta(trip.metrics, metrics), minutesSaved: saved },
      headline: headlineFor(saved, toClock(endMinutes(stops))),
      changedSegmentIds,
    };
  },
};
