/**
 * What the traveller said, honoured in the day they actually get.
 *
 * These assert the FINISHED TRIP — the four stops, the anchor, the categories, the city,
 * the cost and the minutes — and not the extracted intent. Understanding was never the
 * problem: `/api/extract` resolved "cuisiner avec Oum Na3ima à Casablanca" to
 * `exp-cooking-mi-naima` with 0.8 confidence and the engine then handed back four
 * monuments. A test on the draft would have passed throughout.
 *
 * Where a case names what a model returned, those values are the ones the live endpoint
 * actually produced for that sentence; the local keyword pass is used wherever it can
 * carry the sentence on its own, so the text really does travel the product's path.
 */
import { describe, expect, it } from "vitest";
import { match, schedule } from "../engine";
import { POIS } from "@/data/pois";
import { BASE_ROUTES } from "@/data/base-routes";
import { BUDGET_CAP_MAD, TIME_BUDGET_MINUTES, WALKING_COMFORT_METERS } from "@/config/app";
import { calculateMetrics, estimateLeg } from "@/lib/routing/metrics";
import { draftFromLocalText, draftToProfile } from "@/lib/intent";
import { createEmptyProfile } from "@/lib/validation/trip-profile";
import { kindOf } from "@/lib/wallet";
import { INTERESTS, type Interest, type TripProfile } from "@/types/profile";
import { TRIP_STOP_COUNT, type RouteSegment, type Trip, type TripStop } from "@/types/trip";

function segmentsFor(stops: TripStop[]): RouteSegment[] {
  return stops.slice(0, -1).map((stop, index) => {
    const leg = estimateLeg(
      stop.poi.coordinates,
      stops[index + 1].poi.coordinates,
      WALKING_COMFORT_METERS,
    );
    return {
      id: `segment-${index + 1}`,
      fromStopId: stop.id,
      toStopId: stops[index + 1].id,
      mode: leg.mode,
      distanceMeters: leg.distanceMeters,
      durationMinutes: leg.durationMinutes,
      geometry: null,
      source: "fallback" as const,
    };
  });
}

/** The real generation path, minus the network: engine → schedule → metrics. */
function tripFor(profile: TripProfile): Trip {
  const { pois, baseRouteId } = match({ profile, pois: POIS, baseRoutes: BASE_ROUTES });
  const stops = schedule(pois, profile);
  const segments = segmentsFor(stops);
  return {
    id: "trip-test",
    createdAt: new Date().toISOString(),
    destination: stops[0].poi.city,
    locale: profile.locale,
    profile,
    stops,
    segments,
    metrics: calculateMetrics(stops, segments),
    vibe: profile.interests.slice(0, 2),
    baseRouteId,
    isFallback: false,
    weather: null,
  };
}

/** Typed or spoken text, understood exactly as the product understands it. */
function tripFromText(text: string, extra: Partial<TripProfile> = {}): Trip {
  const draft = draftFromLocalText(text, { locale: "en", source: "text" });
  return tripFor({ ...draftToProfile(draft), ...extra } as TripProfile);
}

const withProfile = (overrides: Partial<TripProfile>) =>
  tripFor({ ...createEmptyProfile("en"), ...overrides } as TripProfile);

const ids = (trip: Trip) => trip.stops.map((stop) => stop.poiId);
const cities = (trip: Trip) => new Set(trip.stops.map((stop) => stop.poi.city));
const covers = (trip: Trip, interest: Interest) =>
  trip.stops.some((stop) => stop.poi.categories.includes(interest));

/** Every trip, in every case below, is still a Khotwa day. */
function expectWellFormed(trip: Trip) {
  expect(trip.stops).toHaveLength(TRIP_STOP_COUNT);
  expect(new Set(ids(trip)).size).toBe(TRIP_STOP_COUNT);
}

describe("a recognised entity is a request, not a hint", () => {
  /*
   * The failure this whole change exists for. Understanding resolved the host correctly
   * every time; the engine dropped the experience because a curated route outscored it.
   */
  it("keeps the cooking experience someone explicitly asked to cook at", () => {
    // Exactly what /api/extract returns for "Je veux cuisiner avec Oum Na3ima à Casablanca".
    const trip = withProfile({
      destination: "Casablanca",
      detectedPlace: "Cook Moroccan with a Local Family",
      detectedPoiId: "exp-cooking-mi-naima",
      interests: ["food", "culture"],
    });

    expectWellFormed(trip);
    expect(ids(trip)).toContain("exp-cooking-mi-naima");
    expect(cities(trip)).toEqual(new Set(["Casablanca"]));
    expect(covers(trip, "food")).toBe(true);
    expect(covers(trip, "culture")).toBe(true);
    // The day is built around it: money now reaches the host it was chosen for.
    expect(trip.metrics.estimatedCostMad[1]).toBeGreaterThanOrEqual(250);
  });

  it("keeps a recognised monument", () => {
    const trip = withProfile({ destination: "Casablanca", detectedPoiId: "poi-hassan-ii" });
    expectWellFormed(trip);
    expect(ids(trip)).toContain("poi-hassan-ii");
  });

  it("keeps a recognised place the traveller only named", () => {
    // "Hassan II" travels the local resolver, the same way a caption or a title would.
    const trip = tripFromText("Hassan II");
    expect(trip.profile.detectedPoiId).toBe("poi-hassan-ii");
    expect(ids(trip)).toContain("poi-hassan-ii");
  });

  it("builds the rest of the day around the anchor rather than replacing it", () => {
    const anchored = withProfile({
      destination: "Casablanca",
      detectedPoiId: "exp-leather-bag",
      interests: ["culture", "food"],
    });
    expect(ids(anchored)).toContain("exp-leather-bag");
    // The other three are still chosen on merit, not cloned from the anchor's categories.
    expect(new Set(anchored.stops.flatMap((s) => s.poi.categories)).size).toBeGreaterThan(2);
  });

  it("does not let an entity recognised elsewhere pull the day out of the stated city", () => {
    const trip = withProfile({
      destination: "Casablanca",
      detectedPoiId: "exp-oualidia-oysters",
      interests: ["culture", "food"],
    });
    expectWellFormed(trip);
    expect(cities(trip)).toEqual(new Set(["Casablanca"]));
    expect(ids(trip)).not.toContain("exp-oualidia-oysters");
  });

  it("ignores an anchor we cannot honestly send anyone to", () => {
    const closed = POIS.map((poi) =>
      poi.id === "exp-cooking-mi-naima"
        ? { ...poi, availability: { status: "temporarily_unavailable" as const } }
        : poi,
    );
    const profile = {
      ...createEmptyProfile("en"),
      destination: "Casablanca",
      detectedPoiId: "exp-cooking-mi-naima",
      interests: ["food"] as Interest[],
    };
    const { pois } = match({ profile, pois: closed, baseRoutes: BASE_ROUTES });
    expect(pois).toHaveLength(TRIP_STOP_COUNT);
    expect(pois.map((poi) => poi.id)).not.toContain("exp-cooking-mi-naima");
  });
});

describe("a stated interest is a promise the day keeps", () => {
  it("represents both culture and food, in Darija", () => {
    const trip = tripFromText(
      "بغيت نهار كامل فكازا، الثقافة والماكلة، وماشي بزاف ديال المشي",
    );

    expect(trip.profile.destination).toBe("Casablanca");
    expect(trip.profile.interests).toEqual(["culture", "food"]);
    expectWellFormed(trip);
    expect(cities(trip)).toEqual(new Set(["Casablanca"]));
    expect(covers(trip, "culture")).toBe(true);
    expect(covers(trip, "food")).toBe(true);
  });

  it("represents both culture and food, in English", () => {
    const trip = tripFromText("culture and food in Casablanca");
    expectWellFormed(trip);
    expect(covers(trip, "culture")).toBe(true);
    expect(covers(trip, "food")).toBe(true);
  });

  /*
   * The general property, not the two sentences above: for every pair of interests the
   * taxonomy allows, a day that could cover both does. Previously the composition slot
   * rewarded any unseen category, so one of the two could simply go unserved.
   */
  it("covers every requested interest the city can actually offer", () => {
    for (const first of INTERESTS) {
      for (const second of INTERESTS) {
        if (first === second) continue;
        const interests = [first, second];
        const trip = withProfile({ destination: "Casablanca", interests });
        const available = interests.filter((interest) =>
          POIS.some((poi) => poi.city === "Casablanca" && poi.categories.includes(interest)),
        );
        for (const interest of available) {
          expect(covers(trip, interest), `${first}+${second} lost ${interest}`).toBe(true);
        }
      }
    }
  });

  it("keeps covering them once the day has been fitted to a budget and a clock", () => {
    const trip = withProfile({
      destination: "Casablanca",
      interests: ["culture", "food"],
      budgetLevel: "low",
      timeAvailable: "few_hours",
    });
    expectWellFormed(trip);
    expect(covers(trip, "culture")).toBe(true);
    expect(covers(trip, "food")).toBe(true);
  });
});

describe("budget binds the selection, not just the warning strip", () => {
  it("fits a low budget instead of generating one and apologising", () => {
    const trip = withProfile({
      destination: "Casablanca",
      interests: ["food"],
      budgetLevel: "low",
    });
    expectWellFormed(trip);
    expect(trip.metrics.estimatedCostMad[1]).toBeLessThanOrEqual(BUDGET_CAP_MAD.low);
    expect(covers(trip, "food")).toBe(true);
  });

  it("fits a medium budget", () => {
    const trip = withProfile({
      destination: "Casablanca",
      interests: ["food"],
      budgetLevel: "medium",
    });
    expect(trip.metrics.estimatedCostMad[1]).toBeLessThanOrEqual(BUDGET_CAP_MAD.medium);
  });

  it("leaves a premium day alone — an unstated ceiling is not a ceiling", () => {
    const trip = withProfile({
      destination: "Casablanca",
      interests: ["food"],
      budgetLevel: "premium",
    });
    expectWellFormed(trip);
    expect(trip.stops.some((stop) => kindOf(stop.poi) !== "place")).toBe(true);
  });

  /*
   * Honesty under an impossible constraint. A 250 MAD cooking class the traveller asked
   * for cannot be squeezed under a 150 MAD day, and the right answer is to keep what they
   * asked for and let the brief say the day is dear — never to drop it and claim success.
   */
  it("keeps the anchor and stays truthful when the budget cannot be met", () => {
    const trip = withProfile({
      destination: "Casablanca",
      detectedPoiId: "exp-cooking-mi-naima",
      interests: ["food"],
      budgetLevel: "low",
    });
    expectWellFormed(trip);
    expect(ids(trip)).toContain("exp-cooking-mi-naima");
    expect(trip.metrics.estimatedCostMad[1]).toBeGreaterThan(BUDGET_CAP_MAD.low);
  });
});

describe("duration binds the selection too", () => {
  const day = (timeAvailable: TripProfile["timeAvailable"]) =>
    withProfile({ destination: "Casablanca", interests: ["culture", "food"], timeAvailable });

  it("fits a few hours, a half day and a full day to what was asked", () => {
    for (const time of ["few_hours", "half_day", "full_day"] as const) {
      const trip = day(time);
      expectWellFormed(trip);
      expect(trip.metrics.totalMinutes, time).toBeLessThanOrEqual(TIME_BUDGET_MINUTES[time]);
    }
  });

  it("answers three different questions with three different days", () => {
    const short = day("few_hours").metrics.totalMinutes;
    const half = day("half_day").metrics.totalMinutes;
    const full = day("full_day").metrics.totalMinutes;
    expect(short).toBeLessThan(half);
    expect(half).toBeLessThan(full);
  });

  /*
   * A booked experience is an appointment. Shortening the day means choosing shorter
   * places around it — never trimming, and never quietly dropping, the thing the
   * traveller is turning up for.
   */
  it("never shortens a booked experience to make a short day fit", () => {
    for (const time of ["few_hours", "half_day", "full_day"] as const) {
      const trip = withProfile({
        destination: "Casablanca",
        detectedPoiId: "exp-cooking-mi-naima",
        interests: ["food"],
        timeAvailable: time,
      });
      const cooking = trip.stops.find((stop) => stop.poiId === "exp-cooking-mi-naima");
      expect(cooking, time).toBeDefined();
      expect(cooking?.durationMinutes, time).toBe(105);
    }
  });
});

describe("nothing that already worked stopped working", () => {
  it("still sends an Oualidia oyster request to the Oualidia lagoon", () => {
    // Exactly what /api/extract returns for "oysters in Oualidia".
    const trip = withProfile({
      destination: "Oualidia",
      detectedPlace: "Dégustation d'huîtres — Ostréa",
      detectedPoiId: "poi-oualidia-oysters",
      interests: ["food", "coast_nature"],
    });

    expectWellFormed(trip);
    expect(cities(trip)).toEqual(new Set(["Oualidia"]));
    expect(ids(trip)).toContain("poi-oualidia-oysters");
    expect(ids(trip)).toContain("exp-oualidia-oysters");
    expect(covers(trip, "food")).toBe(true);
    expect(covers(trip, "coast_nature")).toBe(true);
  });

  it("does not send a name it cannot place to the coast", () => {
    const trip = tripFromText("Oum Na3ima");
    expect(trip.profile.detectedPoiId).toBeNull();
    expectWellFormed(trip);
    expect(cities(trip)).not.toContain("Oualidia");
    expect(trip.destination).toBe("Casablanca");
  });

  it("still returns four stops for every city in the dataset", () => {
    for (const city of new Set(POIS.map((poi) => poi.city))) {
      expect(withProfile({ destination: city }).stops, city).toHaveLength(TRIP_STOP_COUNT);
    }
  });

  it("still returns four stops for a profile that says nothing at all", () => {
    expectWellFormed(withProfile({}));
  });

  it("is still deterministic once anchored, fitted and covered", () => {
    const overrides = {
      destination: "Casablanca",
      detectedPoiId: "exp-cooking-mi-naima",
      interests: ["culture", "food"] as Interest[],
      budgetLevel: "medium" as const,
      timeAvailable: "half_day" as const,
    };
    const first = ids(withProfile(overrides));
    for (let run = 0; run < 5; run += 1) {
      expect(ids(withProfile(overrides))).toEqual(first);
    }
  });
});
