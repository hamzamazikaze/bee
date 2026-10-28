/**
 * The local-impact figure is said out loud on stage, so it is locked here rather than
 * trusted. It has to be a floor computed from the day actually on screen — never a
 * constant, and never a number a four-monument day quietly borrows from somewhere else.
 */
import { describe, expect, it } from "vitest";
import { match, schedule } from "@/lib/matching";
import { POIS } from "@/data/pois";
import { calculateMetrics } from "@/lib/routing/metrics";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { localImpact } from "../trip-insights";
import type { Interest, TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";

function dayFor(interests: Interest[]): Trip {
  const profile: TripProfile = {
    ...createEmptyProfile("en"),
    destination: "Casablanca",
    interests,
    timeAvailable: "full_day",
  };
  const stops = schedule(match({ profile, pois: POIS }).pois, profile);
  return {
    id: "t",
    createdAt: new Date().toISOString(),
    destination: "Casablanca",
    locale: "en",
    profile,
    stops,
    segments: [],
    metrics: calculateMetrics(stops, []),
    vibe: interests,
    isFallback: false,
  };
}

describe("localImpact", () => {
  it("sums the hero day to 510 MAD — 80 + 250 + 180", () => {
    const impact = localImpact(dayFor(["food", "hidden_gems"]));
    expect(impact?.totalMad).toBe(510);
    expect(impact?.lines.map((line) => line.mad)).toEqual([80, 250, 180]);
  });

  it("counts only stops whose money reaches a local person", () => {
    const impact = localImpact(dayFor(["food", "hidden_gems"]));
    // Hassan II is 140 MAD of admission to a monument, and must not be in the figure.
    expect(impact?.lines.map((line) => line.poi.id)).not.toContain("poi-hassan-ii");
    for (const line of impact?.lines ?? []) {
      expect(line.poi.experience?.supportsLocalBusiness, line.poi.id).toBe(true);
    }
  });

  /*
   * Assembled by hand rather than asked of the engine, which no longer produces a day
   * without a human stop in it — see `ensureExperience`. The property under test is the
   * honest zero, and it still has to hold for any day that reaches this function.
   */
  it("says nothing at all about a day of monuments", () => {
    const monuments = dayFor(["culture", "food"]);
    const places = POIS.filter((poi) => (poi.kind ?? "place") === "place").slice(0, 4);
    const stops = monuments.stops.map((stop, index) => ({
      ...stop,
      poi: places[index],
      poiId: places[index].id,
    }));
    expect(localImpact({ ...monuments, stops })).toBeNull();
  });
});
