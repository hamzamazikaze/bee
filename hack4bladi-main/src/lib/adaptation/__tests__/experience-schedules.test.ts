/**
 * Adapt My Day must not invent a schedule the traveller cannot keep.
 *
 * A monument bends: you can give it 20 minutes or an hour. An experience does not. The
 * cooking class runs 105 minutes because that is how long it takes to make
 * the tajine, and the leather workshop is 75 because the artisan teaches it that way.
 * Every adapter re-times the day, and two of them used to shorten those appointments —
 * Less Time by trimming every stop to 0.65x, Rainy Day and Spend Less by re-deriving a
 * swapped-in stop's duration with the pace multiplier the engine had already stopped
 * applying. These pin the invariant on all four.
 */
import { describe, expect, it } from "vitest";
import { adapt, ADAPTATION_TYPES } from "@/lib/adaptation";
import { visitMinutes } from "@/lib/adaptation/shared";
import { schedule, visitDurationMinutes } from "@/lib/matching/engine";
import { segmentsFor } from "@/lib/adaptation/shared";
import { calculateMetrics } from "@/lib/routing/metrics";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { POIS } from "@/data/pois";
import { BASE_ROUTES } from "@/data/base-routes";
import { isExperience } from "@/lib/wallet";
import type { TripPace, TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";

const EXPERIENCES = POIS.filter(isExperience);
const COOKING = POIS.find((poi) => poi.id === "exp-cooking-mi-naima")!;
const LEATHER = POIS.find((poi) => poi.id === "exp-leather-bag")!;

/**
 * The hero experiential day, built directly from its curated route rather than matched.
 *
 * Matching on a profile is the wrong fixture here: `destination: "Casablanca"` resolves to
 * the curated *signature* day, which is four places by design — curation outranks
 * composition. This test is about adapting a day that really does contain appointments,
 * so it takes the route that really does contain them.
 */
function experienceTrip(pace: TripPace = "explorer"): Trip {
  const profile: TripProfile = { ...createEmptyProfile("en"), pace, interests: ["food", "culture"] };
  const route = BASE_ROUTES.find((entry) => entry.id === "route-casablanca-experience")!;
  const pois = route.poiIds.map((id) => POIS.find((poi) => poi.id === id)!);
  const stops = schedule(pois, profile);
  const segments = segmentsFor(stops);

  return {
    id: "trip-experience-test",
    createdAt: new Date("2026-01-01T09:00:00Z").toISOString(),
    destination: "Casablanca",
    locale: "en",
    profile,
    stops,
    segments,
    metrics: calculateMetrics(stops, segments),
    vibe: ["food"],
    isFallback: false,
  };
}

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

describe("an appointment is not a suggestion", () => {
  it("gives every experience its full booked duration at every pace", () => {
    const paces: TripPace[] = ["relaxed", "balanced", "explorer"];
    for (const pace of paces) {
      for (const poi of EXPERIENCES) {
        expect(visitDurationMinutes(poi, pace), `${poi.id} @ ${pace}`).toBe(
          poi.baseDurationMinutes,
        );
      }
    }
  });

  it("still lets pace stretch and shrink an ordinary place", () => {
    const mosque = POIS.find((poi) => poi.id === "poi-hassan-ii")!;
    expect(visitDurationMinutes(mosque, "explorer")).toBeLessThan(mosque.baseDurationMinutes);
    expect(visitDurationMinutes(mosque, "relaxed")).toBeGreaterThan(mosque.baseDurationMinutes);
  });

  it("agrees with the adapters' own helper — one rule, not two copies", () => {
    const profile = { ...createEmptyProfile("en"), pace: "explorer" as TripPace };
    for (const poi of [COOKING, LEATHER]) {
      expect(visitMinutes(poi, profile)).toBe(poi.baseDurationMinutes);
    }
  });
});

describe("every adaptation keeps a bookable day bookable", () => {
  it("never shortens an experiential stop, whichever adaptation runs", async () => {
    const trip = experienceTrip();
    expect(trip.stops.some((stop) => isExperience(stop.poi))).toBe(true);

    for (const type of ADAPTATION_TYPES) {
      const result = await adapt({ type, trip });
      for (const stop of result.trip.stops) {
        if (!isExperience(stop.poi)) continue;
        expect(
          stop.durationMinutes,
          `${type} shortened ${stop.poi.id}`,
        ).toBeGreaterThanOrEqual(stop.poi.baseDurationMinutes);
      }
    }
  });

  it("never overlaps two stops, whichever adaptation runs", async () => {
    const trip = experienceTrip();

    for (const type of ADAPTATION_TYPES) {
      const { stops } = (await adapt({ type, trip })).trip;
      for (let i = 0; i < stops.length - 1; i += 1) {
        const ends = minutes(stops[i].arrivalTime) + stops[i].durationMinutes;
        expect(
          minutes(stops[i + 1].arrivalTime),
          `${type}: stop ${i + 2} starts before stop ${i + 1} ends`,
        ).toBeGreaterThanOrEqual(ends);
      }
    }
  });

  it("leaves the cooking class its 105 minutes when the day is made shorter", async () => {
    const trip = experienceTrip();
    const cooking = trip.stops.find((stop) => stop.poi.id === COOKING.id);
    if (!cooking) return; // composition may not have chosen it; the sweep above still covers it.

    const result = await adapt({ type: "less_time", trip });
    const after = result.trip.stops.find((stop) => stop.poi.id === COOKING.id)!;
    expect(after.durationMinutes).toBe(105);
  });

  it("still shortens the ordinary stops it is allowed to shorten", async () => {
    const trip = experienceTrip("relaxed");
    const result = await adapt({ type: "less_time", trip });
    if (!result.applied) return; // a day with nothing to trim is a valid answer.

    const plain = trip.stops.filter((stop) => !isExperience(stop.poi));
    const trimmed = plain.some((stop) => {
      const after = result.trip.stops.find((entry) => entry.id === stop.id)!;
      return after.durationMinutes < stop.durationMinutes;
    });
    expect(trimmed).toBe(true);
  });
});
