/**
 * Non-negotiables #6 and #11 of SIYAHA_APP_MASTER_QA.md, locked against the REAL engine.
 *
 * These previously passed only against the fixture: walking the actual product path
 * produced a different, mostly-car day on which the demo headline could not appear.
 */
import { describe, expect, it } from "vitest";
import { match, schedule } from "../engine";
import { POIS } from "@/data/pois";
import { lessWalkingAdapter } from "@/lib/adaptation/less-walking";
import { calculateMetrics, estimateLeg } from "@/lib/routing/metrics";
import { WALKING_COMFORT_METERS } from "@/config/app";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import type { Interest } from "@/types/profile";
import type { RouteSegment, Trip, TripStop } from "@/types/trip";

/** The flagship demo profile: Casablanca, culture + food, a full balanced day. */
function demoProfile() {
  return {
    ...createEmptyProfile("en"),
    destination: "Casablanca",
    interests: ["culture", "food"] as Interest[],
    timeAvailable: "full_day" as const,
    budgetLevel: "medium" as const,
    pace: "balanced" as const,
  };
}

function segmentsFor(stops: TripStop[]): RouteSegment[] {
  return stops.slice(0, -1).map((stop, i) => {
    const leg = estimateLeg(
      stop.poi.coordinates,
      stops[i + 1].poi.coordinates,
      WALKING_COMFORT_METERS,
    );
    return {
      id: `segment-${i + 1}`,
      fromStopId: stop.id,
      toStopId: stops[i + 1].id,
      mode: leg.mode,
      distanceMeters: leg.distanceMeters,
      durationMinutes: leg.durationMinutes,
      geometry: null,
      source: "fallback" as const,
    };
  });
}

function generatedTrip(): Trip {
  const profile = demoProfile();
  const { pois } = match({ profile, pois: POIS });
  const stops = schedule(pois, profile);
  const segments = segmentsFor(stops);
  return {
    id: "t",
    createdAt: new Date().toISOString(),
    destination: "Casablanca",
    locale: "en",
    profile,
    stops,
    segments,
    metrics: calculateMetrics(stops, segments),
    vibe: profile.interests,
    isFallback: false,
  };
}

describe("golden route, from the real engine", () => {
  /*
   * THE DEMO DAY MOVED, ON PURPOSE.
   *
   * It was Habous -> Marché Central -> Sacré-Cœur -> Hassan II: four monuments, three
   * walked legs, 6.4 km. That day was the reason `ensureExperience` exists — the flagship
   * profile of a product about meeting people produced nobody to meet. Sacré-Cœur was the
   * weakest non-signature stop, so it is what the guarantee gives up.
   *
   * What survived the change is what mattered: the curated backbone, the signature icon at
   * the end of the day, and a Less Walking headline that still lands.
   */
  it("produces Habous -> Marché Central -> the family kitchen -> Hassan II", () => {
    expect(generatedTrip().stops.map((s) => s.poi.name)).toEqual([
      "Quartier Habous",
      "Marché Central",
      "Cook Moroccan with a Local Family",
      "Mosquée Hassan II",
    ]);
  });

  it("puts a person in the flagship day", () => {
    const kinds = generatedTrip().stops.map((s) => s.poi.kind ?? "place");
    expect(kinds.filter((kind) => kind !== "place")).toHaveLength(1);
  });

  it("still walks the legs Less Walking is going to convert", () => {
    // Two walked legs and one already by car: the last hop outgrew the comfort threshold
    // when the ordering changed. Less Walking needs walked metres to save, and has them.
    expect(generatedTrip().segments.filter((s) => s.mode === "walking").length).toBeGreaterThanOrEqual(2);
  });

  it("quotes ~4.2 km of walking", () => {
    const km = generatedTrip().metrics.walkingMeters / 1000;
    expect(km).toBeGreaterThan(4.0);
    expect(km).toBeLessThan(4.4);
  });

  it("stays inside the stated medium budget", () => {
    expect(generatedTrip().metrics.estimatedCostMad[1]).toBeLessThanOrEqual(400);
  });

  it("is deterministic", () => {
    expect(generatedTrip().stops.map((s) => s.poiId)).toEqual(
      generatedTrip().stops.map((s) => s.poiId),
    );
  });
});

describe("Less Walking on the generated trip", () => {
  /*
   * The percentage is the number said out loud and it survived the day changing — 77%
   * became 78%. The minutes did not: the day now starts with one leg already by car, so
   * there is less walking to convert and the saving is ~21 minutes rather than ~40.
   * docs/DEMO_PATH.md carries the same figures.
   */
  it("delivers the demo headline: ~58% less walking, ~21 min saved", async () => {
    const trip = generatedTrip();
    const result = await lessWalkingAdapter.apply({ type: "less_walking", trip });

    expect(result.applied).toBe(true);
    expect(result.delta.walkingReductionPercent).toBeGreaterThanOrEqual(54);
    expect(result.delta.walkingReductionPercent).toBeLessThanOrEqual(62);
    expect(result.delta.minutesSaved).toBeGreaterThanOrEqual(18);
    expect(result.trip.metrics.walkingMeters / 1000).toBeLessThan(2.0);
  });

  it("keeps the same four stops in the same order", async () => {
    const trip = generatedTrip();
    const result = await lessWalkingAdapter.apply({ type: "less_walking", trip });
    expect(result.trip.stops.map((s) => s.poiId)).toEqual(trip.stops.map((s) => s.poiId));
  });
});
