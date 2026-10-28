/**
 * Composition: SEE → MEET → MAKE → TASTE.
 *
 * The engine still returns exactly four stops and still respects geography and budget —
 * these check that mixing experiences in did not cost any of that.
 */
import { describe, expect, it } from "vitest";
import { match, schedule } from "@/lib/matching/engine";
import { POIS } from "@/data/pois";
import { BASE_ROUTES } from "@/data/base-routes";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { haversineMeters } from "@/lib/routing/metrics";
import { kindOf } from "@/lib/wallet";
import type { Interest, TripProfile } from "@/types/profile";
import { TRIP_STOP_COUNT } from "@/types/trip";

function profile(overrides: Partial<TripProfile> = {}): TripProfile {
  return { ...createEmptyProfile("en"), ...overrides };
}

const run = (overrides: Partial<TripProfile> = {}) =>
  match({ profile: profile(overrides), pois: POIS, baseRoutes: BASE_ROUTES }).pois;

describe("four stops, whatever the composition", () => {
  it("still returns exactly four unique stops for every interest", () => {
    const interests: Interest[] = [
      "culture",
      "food",
      "coast_nature",
      "hidden_gems",
      "art_creative",
      "activities",
    ];
    for (const interest of interests) {
      const pois = run({ interests: [interest] });
      expect(pois, interest).toHaveLength(TRIP_STOP_COUNT);
      expect(new Set(pois.map((p) => p.id)).size, interest).toBe(TRIP_STOP_COUNT);
    }
  });

  it("still returns four for every city, including ones with no experiences", () => {
    for (const city of new Set(POIS.map((poi) => poi.city))) {
      expect(run({ destination: city }), city).toHaveLength(TRIP_STOP_COUNT);
    }
  });
});

describe("the day mixes seeing with doing", () => {
  it("puts at least one experience in a day nobody curated", () => {
    const pois = run({ destination: "Casablanca" });
    expect(pois.some((poi) => kindOf(poi) !== "place")).toBe(true);
  });

  it("does not hand back four stops of the same kind", () => {
    const pois = run({ destination: "Casablanca", interests: ["food"] });
    expect(new Set(pois.map(kindOf)).size).toBeGreaterThan(1);
  });

  it("reaches the hero composition on the experience route", () => {
    const pois = run({
      destination: "Casablanca",
      interests: ["food", "hidden_gems"],
      timeAvailable: "full_day",
    });
    const kinds = pois.map(kindOf);

    expect(pois).toHaveLength(TRIP_STOP_COUNT);
    expect(kinds).toContain("workshop");
    expect(kinds).toContain("food_experience");
    expect(kinds).toContain("place");
    // The named experiences the demo is built on.
    const ids = pois.map((poi) => poi.id);
    expect(ids).toContain("exp-leather-bag");
    expect(ids).toContain("exp-cooking-mi-naima");
    expect(ids).toContain("poi-hassan-ii");
  });
});

describe("composition never overrules the things that already mattered", () => {
  /*
   * THIS RULE WAS DELIBERATELY REVERSED.
   *
   * It used to assert that the curated signature day came back untouched — four monuments,
   * because curation outranked composition. Measured across the dataset, that left five of
   * nine stated-interest profiles in Casablanca with nobody in the day at all, this one
   * included. A product whose thesis is that a day mixes seeing, meeting, making and
   * tasting cannot ship a flagship day of four facades.
   *
   * So `ensureExperience` now guarantees a human stop, and it gives up the weakest
   * non-signature stop to get one. What curation still protects is asserted below and in
   * the cases above: the anchor holds, the signature must-see holds, every stated interest
   * still has a carrier, and the rest of the curated day survives intact.
   */
  it("keeps the curated signature day, but puts somebody in it", () => {
    const pois = run({
      destination: "Casablanca",
      interests: ["culture", "food"],
      timeAvailable: "full_day",
      budgetLevel: "medium",
      pace: "balanced",
    });
    const ids = pois.map((poi) => poi.id);

    // The curated backbone is still there, signature included.
    expect(ids).toContain("poi-habous");
    expect(ids).toContain("poi-marche-central");
    expect(ids).toContain("poi-hassan-ii");
    // And exactly one stop is now a person rather than a facade.
    expect(pois.filter((poi) => (poi.kind ?? "place") !== "place")).toHaveLength(1);
  });

  it("keeps the day geographically coherent", () => {
    const pois = run({ destination: "Casablanca", interests: ["art_creative"] });
    for (let i = 1; i < pois.length; i += 1) {
      const metres = haversineMeters(pois[i - 1].coordinates, pois[i].coordinates);
      expect(metres, `${pois[i - 1].name} → ${pois[i].name}`).toBeLessThan(15_000);
    }
  });

  it("keeps a low budget away from the expensive workshops", () => {
    const pois = run({ destination: "Casablanca", interests: ["culture", "food"], budgetLevel: "low" });
    for (const poi of pois) {
      expect(poi.approxPriceMad?.[1] ?? 0, poi.name).toBeLessThanOrEqual(150);
    }
  });

  it("still refuses a closed or unavailable stop", () => {
    const pois = run({ destination: "Casablanca", interests: ["food"] });
    for (const poi of pois) {
      expect(["permanently_closed", "temporarily_unavailable"]).not.toContain(
        poi.availability.status,
      );
    }
  });
});

describe("scheduling around a workshop", () => {
  const heroDay = () => {
    const overrides = {
      destination: "Casablanca",
      interests: ["food", "hidden_gems"] as Interest[],
      timeAvailable: "full_day" as const,
    };
    return schedule(run(overrides), profile(overrides));
  };

  const minutes = (clock: string) => {
    const [h, m] = clock.split(":").map(Number);
    return h * 60 + m;
  };

  it("gives a 75-minute workshop 75 minutes", () => {
    const stop = heroDay().find((entry) => entry.poiId === "exp-leather-bag");
    expect(stop?.durationMinutes).toBe(75);
  });

  it("gives the 105-minute cooking class its full time", () => {
    const stop = heroDay().find((entry) => entry.poiId === "exp-cooking-mi-naima");
    expect(stop?.durationMinutes).toBe(105);
  });

  it("never starts the next stop before the workshop has finished", () => {
    const stops = heroDay();
    for (let i = 1; i < stops.length; i += 1) {
      const endsAt = minutes(stops[i - 1].arrivalTime) + stops[i - 1].durationMinutes;
      expect(minutes(stops[i].arrivalTime), `${stops[i - 1].poi.name} → ${stops[i].poi.name}`)
        .toBeGreaterThanOrEqual(endsAt);
    }
  });

  it("does not let pace shrink a booked experience", () => {
    for (const pace of ["relaxed", "balanced", "explorer"] as const) {
      const overrides = {
        destination: "Casablanca",
        interests: ["food", "hidden_gems"] as Interest[],
        pace,
      };
      const stops = schedule(run(overrides), profile(overrides));
      const workshop = stops.find((stop) => stop.poiId === "exp-leather-bag");
      expect(workshop?.durationMinutes, pace).toBe(75);
    }
  });

  it("explains an experiential stop in its own words", () => {
    const stop = heroDay().find((entry) => entry.poiId === "exp-leather-bag");
    expect(stop?.reason?.en).toMatch(/hands-on/i);
    expect(stop?.reason?.fr).toBeTruthy();
    expect(stop?.reason?.ar).toBeTruthy();
  });
});
