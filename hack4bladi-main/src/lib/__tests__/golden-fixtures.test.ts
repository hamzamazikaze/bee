/**
 * Guards the golden demo. If any of these fail, the jury path is broken —
 * these numbers are what the presenter says out loud on stage.
 */
import { describe, expect, it } from "vitest";
import {
  GOLDEN_LESS_WALKING,
  GOLDEN_POIS,
  GOLDEN_PROFILE,
  GOLDEN_TRIP,
  cloneGoldenTrip,
} from "@/data/fixtures";
import { calculateMetrics, haversineMeters } from "@/lib/routing/metrics";
import { TRIP_SEGMENT_COUNT, TRIP_STOP_COUNT } from "@/types/trip";
import { parseTripProfile, createEmptyProfile } from "@/lib/validation/trip-profile";

describe("golden trip shape", () => {
  it("has exactly four stops and three segments", () => {
    expect(GOLDEN_TRIP.stops).toHaveLength(TRIP_STOP_COUNT);
    expect(GOLDEN_TRIP.segments).toHaveLength(TRIP_SEGMENT_COUNT);
  });

  it("chains segments stop-to-stop in order", () => {
    GOLDEN_TRIP.segments.forEach((segment, index) => {
      expect(segment.fromStopId).toBe(GOLDEN_TRIP.stops[index].id);
      expect(segment.toStopId).toBe(GOLDEN_TRIP.stops[index + 1].id);
    });
  });

  it("keeps the demo coordinates the app must know offline", () => {
    expect(GOLDEN_POIS.map((poi) => poi.coordinates)).toEqual([
      { lat: 33.57746, lng: -7.60639 },
      { lat: 33.59483, lng: -7.61201 },
      { lat: 33.59134, lng: -7.62449 },
      { lat: 33.60847, lng: -7.6326 },
    ]);
  });

  it("quotes fallback distances that match the real geography", () => {
    // Street distance is always longer than the straight line, never shorter.
    GOLDEN_TRIP.segments.forEach((segment, index) => {
      const straight = haversineMeters(
        GOLDEN_POIS[index].coordinates,
        GOLDEN_POIS[index + 1].coordinates,
      );
      expect(segment.distanceMeters).toBeGreaterThanOrEqual(straight);
      expect(segment.distanceMeters).toBeLessThan(straight * 2.5);
    });
  });

  it("renders with no external service: fallback flag and local media", () => {
    expect(GOLDEN_TRIP.isFallback).toBe(true);
    GOLDEN_POIS.forEach((poi) => {
      expect(poi.media.fallbackImage.startsWith("/")).toBe(true);
    });
  });
});

describe("golden metrics", () => {
  it("matches the numbers in docs/DEMO_PATH.md", () => {
    expect(GOLDEN_TRIP.metrics.walkingMeters).toBe(6400);
    expect(GOLDEN_TRIP.metrics.carMeters).toBe(0);
    expect(GOLDEN_TRIP.metrics.movementMinutes).toBe(82);
    expect(GOLDEN_TRIP.metrics.activityMinutes).toBe(300);
  });

  it("is reproducible from stops and segments", () => {
    expect(calculateMetrics(GOLDEN_TRIP.stops, GOLDEN_TRIP.segments)).toEqual(
      GOLDEN_TRIP.metrics,
    );
  });

  it("sums known admissions to about 190 MAD", () => {
    const [min, max] = GOLDEN_TRIP.metrics.estimatedCostMad;
    expect((min + max) / 2).toBeCloseTo(190, 0);
  });
});

describe("less walking adaptation", () => {
  const { delta, trip } = GOLDEN_LESS_WALKING;

  it("keeps the same four stops in the same order", () => {
    expect(trip.stops.map((stop) => stop.poiId)).toEqual(
      GOLDEN_TRIP.stops.map((stop) => stop.poiId),
    );
  });

  it("holds the 16:00 Hassan II guided visit anchor", () => {
    expect(trip.stops[3].arrivalTime).toBe("15:40");
  });

  it("produces the headline numbers: 77% less walking, 40 min saved", () => {
    expect(delta.walkingReductionPercent).toBe(77);
    expect(delta.minutesSaved).toBe(40);
    expect(delta.walkingMetersAfter).toBe(1500);
    expect(delta.carMetersAfter).toBe(6000);
  });

  it("only switches the two long segments to car", () => {
    expect(GOLDEN_LESS_WALKING.changedSegmentIds).toEqual(["segment-1", "segment-3"]);
    expect(trip.segments.map((s) => s.mode)).toEqual(["car", "walking", "car"]);
  });

  it("never increases movement time", () => {
    expect(delta.movementMinutesAfter).toBeLessThan(delta.movementMinutesBefore);
  });
});

describe("trip profile validation", () => {
  it("accepts the golden profile round-trip", () => {
    expect(parseTripProfile(GOLDEN_PROFILE)).toMatchObject({
      destination: "Casablanca",
      interests: ["culture", "food", "art_creative"],
    });
  });

  it("never throws on hostile model output", () => {
    for (const input of [null, "not json", 42, [], { interests: "food" }]) {
      expect(() => parseTripProfile(input)).not.toThrow();
    }
    expect(parseTripProfile({ interests: "food" }).interests).toEqual([]);
  });

  it("drops unknown enum values instead of failing the whole profile", () => {
    const profile = parseTripProfile({
      destination: "Oualidia",
      pace: "sprint",
      budgetLevel: "medium",
      interests: ["food", "teleportation"],
    });
    expect(profile.destination).toBe("Oualidia");
    expect(profile.budgetLevel).toBe("medium");
    expect(profile.pace).toBeNull();
    expect(profile.interests).toEqual([]);
  });

  it("starts empty — nothing is mandatory", () => {
    const empty = createEmptyProfile();
    expect(empty.interests).toEqual([]);
    expect(empty.destination).toBeNull();
  });
});

describe("fixture isolation", () => {
  it("clones deeply so callers cannot poison the demo", () => {
    const clone = cloneGoldenTrip();
    clone.stops[0].visitState = "visited";
    expect(GOLDEN_TRIP.stops[0].visitState).toBe("upcoming");
  });
});
