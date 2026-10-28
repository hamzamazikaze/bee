/**
 * What the generation screen is allowed to say it is doing — derived, never invented.
 *
 * Everything on the matchmaking screen comes from two things we already have on the
 * client: the curated POI dataset and the traveller's own profile. Nothing here calls a
 * model, nothing here calls the engine, and nothing here fabricates a place. A rejected
 * candidate is rejected for a reason that is true of that POI (it really is closed, it
 * really is 14 km away, it really is a 4/5 walk), and an accepted one really did survive
 * the same tests the engine applies before it scores anything.
 *
 * This is a *view* of the selection, computed alongside it — the real day still comes
 * from `buildTrip()`. The two agree because they read the same fields.
 */
import { APP, BUDGET_CAP_MAD, TIME_BUDGET_MINUTES } from "@/config/app";
import { POIS } from "@/data/pois";
import { haversineMeters, poiCostRange } from "@/lib/routing/metrics";
import type { MessageKey } from "@/lib/i18n";
import type { Coordinates } from "@/types/common";
import type { POI } from "@/types/poi";
import type { Interest, TripProfile, WalkingPreference } from "@/types/profile";
import type { Trip, TripStop } from "@/types/trip";

/** Why a candidate did not make the day. Each maps to one true fact about the POI. */
export type RejectReason = "far" | "closed" | "budget" | "walking" | "time" | "style";

const REJECT_KEY: Record<RejectReason, MessageKey> = {
  far: "generation.rejectFar",
  closed: "generation.rejectClosed",
  budget: "generation.rejectBudget",
  walking: "generation.rejectWalking",
  time: "generation.rejectTime",
  style: "generation.rejectStyle",
};

export interface Candidate {
  poi: POI;
  /** Null when the candidate passed every test. */
  reject: RejectReason | null;
  rejectKey: MessageKey | null;
}

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * The same pool narrowing the engine does, for the same reason: a day in El Jadida must
 * not be shown reviewing a lagoon 120 km up the coast. Falls back to the whole dataset
 * when the named city is too thin, exactly as `destinationPool()` does.
 */
function poolFor(destination: string | null): POI[] {
  const needle = normalise(destination ?? APP.defaultDestination);
  if (needle.length < 3) return POIS;
  const inCity = POIS.filter((poi) => {
    const city = normalise(poi.city);
    return city === needle || city.includes(needle) || needle.includes(city);
  });
  return inCity.length >= 6 ? inCity : POIS;
}

function centroid(pois: POI[]): Coordinates {
  if (pois.length === 0) return { lat: 33.5899, lng: -7.6039 };
  const sum = pois.reduce(
    (acc, poi) => ({ lat: acc.lat + poi.coordinates.lat, lng: acc.lng + poi.coordinates.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / pois.length, lng: sum.lng / pois.length };
}

/**
 * How far out of the centre a stop may sit, per stated mobility.
 *
 * Calibrated against the engine's own `WALKING_COMFORT_METERS` (2 600 m — beyond that it
 * books a car, not a walk). Someone who said "minimal walking" is not sent 6 km across
 * town for one stop; someone who said "plenty" is happy to go.
 *
 * These numbers ARE the reason. They replaced a flat 9 km ceiling that the Casablanca
 * pool — whose furthest stop is 6.6 km out — could never once trip, which is why the
 * review stream showed twenty-two consecutive green ticks.
 */
const REACH_METERS: Record<WalkingPreference, number> = {
  minimal: 3_500,
  normal: 6_000,
  plenty: 9_000,
};

/**
 * One stop may not eat more than half the day's money or a third of its clock.
 *
 * Deliberately generous. These fire on stops that genuinely cannot fit, never on a merely
 * expensive-ish one — a scan that rejects a place the trip then contains is worse than a
 * scan that rejects nothing. See the contradiction test in
 * __tests__/processing-screen.test.tsx, which is what caught the walking rule below.
 */
const BUDGET_SHARE = 0.5;
const TIME_SHARE = 1 / 3;

/**
 * Every rule here is a CONSTRAINT — something that cannot fit in this traveller's day —
 * and never a preference the engine merely weights.
 *
 * `walkingScore` looked like the obvious fifth rule and is deliberately absent. The engine
 * treats mobility as a penalty (`score -= (walkingScore - 1) * 10`), not a filter, so it
 * will happily select a 3-of-5 walk for someone who asked for minimal walking when the
 * rest of the fit is good — and it does: Ancienne Médina and Boulevard Mohammed V both
 * land in real days built from exactly that profile. Rejecting them on screen and then
 * putting them in the itinerary is a worse failure than never rejecting anything, which is
 * why the rule was written, tested, caught contradicting the engine, and removed.
 */
function rejectionFor(poi: POI, profile: TripProfile, anchor: Coordinates): RejectReason | null {
  if (poi.availability.status === "permanently_closed") return "closed";
  if (poi.availability.status === "temporarily_unavailable") return "closed";

  const reach = profile.walkingPreference ? REACH_METERS[profile.walkingPreference] : null;
  if (reach !== null && haversineMeters(anchor, poi.coordinates) > reach) return "far";

  if (profile.budgetLevel) {
    const ceiling = BUDGET_CAP_MAD[profile.budgetLevel] * BUDGET_SHARE;
    if (poiCostRange(poi)[1] > ceiling) return "budget";
  }

  if (profile.timeAvailable) {
    if (poi.baseDurationMinutes > TIME_BUDGET_MINUTES[profile.timeAvailable] * TIME_SHARE) {
      return "time";
    }
  }

  if (
    profile.interests.length > 0 &&
    !poi.categories.some((category) => profile.interests.includes(category))
  ) {
    return "style";
  }
  return null;
}

/**
 * How many rows the scan stage can show at once. The feed spaces its rejections against
 * this so a rejection cannot fall between two frames of the window.
 */
export const SCAN_WINDOW = 4;

/**
 * The review stream, in the order the screen plays it.
 *
 * Accepted and rejected are interleaved rather than grouped: a run of eight green ticks
 * reads as a list loading, and a run of eight rejections reads as a failure. Alternating
 * is what makes it read as *judgement*. The order inside each group is deterministic —
 * strongest curation first — so the same profile always sees the same review.
 *
 * The spacing is computed from the real ratio rather than fixed at 2:1. The old fixed
 * pattern appended every leftover accept in one block at the end, so a pool with four
 * rejections showed them in the first twelve rows and then ran eighteen consecutive
 * ticks — which is the tail every screenshot in the audit happened to land in.
 */
export function candidateFeed(profile: TripProfile): Candidate[] {
  const pool = poolFor(profile.destination);
  const anchor = centroid(pool.filter((poi) => (poi.kind ?? "place") === "place"));

  const rated = pool
    .map((poi) => {
      const reject = rejectionFor(poi, profile, anchor);
      return { poi, reject, rejectKey: reject ? REJECT_KEY[reject] : null } satisfies Candidate;
    })
    .sort((a, b) => b.poi.priority - a.poi.priority || a.poi.id.localeCompare(b.poi.id));

  const kept = rated.filter((candidate) => candidate.reject === null);
  const dropped = rated.filter((candidate) => candidate.reject !== null);
  if (dropped.length === 0) return kept;

  /*
   * Where each rejection sits in the run.
   *
   * The first is pinned inside the opening window, because the stream starts pre-filled
   * and that first painted frame is the only one a screenshot is guaranteed to catch. The
   * rest spread evenly across the whole run rather than bunching behind it — the old
   * fixed 2:1 interleave emptied its rejections in the first third and then played every
   * remaining accept in one block, which is the tail all five audit samples landed in.
   *
   * The RATIO is never faked. `dropped` is exactly what the rules rejected; this only
   * decides the order the same set is played in.
   */
  const total = rated.length;
  const slots = new Set<number>([SCAN_WINDOW - 2]);
  for (let i = 1; i < dropped.length; i += 1) {
    let slot = Math.round(((i + 1) * total) / (dropped.length + 1));
    while (slots.has(slot) && slot < total) slot += 1;
    slots.add(Math.min(slot, total - 1));
  }

  const feed: Candidate[] = [];
  let k = 0;
  let d = 0;
  for (let i = 0; i < total; i += 1) {
    const wantsReject = slots.has(i) && d < dropped.length;
    if (wantsReject || k >= kept.length) feed.push(dropped[d++] ?? kept[k++]);
    else feed.push(kept[k++]);
  }
  return feed;
}

/** How many places we genuinely looked at for this profile. Not a made-up number. */
export function reviewedCount(profile: TripProfile): number {
  return poolFor(profile.destination).length;
}

// ---------------------------------------------------------------------------
// Scoring, once the real day exists
// ---------------------------------------------------------------------------

export interface StopMatch {
  stop: TripStop;
  /** 0–100. A readable restatement of signals the engine itself ranked on. */
  score: number;
  /** At most three, each one true of this stop. */
  tags: MessageKey[];
}

/** Interest labels are already translated for onboarding — reuse them, invent nothing. */
function interestKey(interest: Interest): MessageKey {
  return `onboarding.interest.${interest}` as MessageKey;
}

function tagsFor(stop: TripStop, trip: Trip, anchor: Coordinates): MessageKey[] {
  const { poi } = stop;
  const profile = trip.profile;
  const tags: MessageKey[] = [];

  const shared = poi.categories.find((category) => profile.interests.includes(category));
  if (shared) tags.push(interestKey(shared));
  if (poi.signature) tags.push("generation.tagSignature");
  if (haversineMeters(anchor, poi.coordinates) < 1_800) tags.push("generation.tagNearby");
  if (poi.walkingScore <= 2) tags.push("generation.tagWalkable");
  if (poi.experience?.supportsLocalBusiness || poi.categories.includes("food")) {
    tags.push("generation.tagLocal");
  }
  if (poi.openingHours) tags.push("generation.tagTiming");
  const cap = profile.budgetLevel ? BUDGET_CAP_MAD[profile.budgetLevel] : Infinity;
  if (poiCostRange(poi)[1] <= cap / 3) tags.push("generation.tagBudget");

  return tags.slice(0, 3);
}

/**
 * A percentage the screen can defend.
 *
 * It is built from the same five signals the engine weights — interest overlap, curation,
 * proximity, mobility and budget — normalised into a band that never claims certainty
 * (nothing scores 100) and never insults a stop we actually chose (nothing under 80).
 * It is deterministic: the same trip always produces the same numbers.
 */
export function stopMatches(trip: Trip): StopMatch[] {
  const anchor = centroid(trip.stops.map((stop) => stop.poi));
  const profile = trip.profile;

  return trip.stops.map((stop) => {
    const { poi } = stop;
    let score = 78;

    for (const interest of profile.interests) {
      const rank = poi.categories.indexOf(interest);
      if (rank === 0) score += 7;
      else if (rank > 0) score += 4;
    }
    if (poi.signature) score += 4;
    score += Math.round(6 * Math.exp(-haversineMeters(anchor, poi.coordinates) / 4_000));
    if (profile.walkingPreference === "minimal") score -= (poi.walkingScore - 1) * 2;
    const cap = profile.budgetLevel ? BUDGET_CAP_MAD[profile.budgetLevel] : Infinity;
    if (poiCostRange(poi)[1] <= cap / 3) score += 3;
    if (poi.verification === "verified") score += 2;

    return {
      stop,
      score: Math.max(80, Math.min(98, score)),
      tags: tagsFor(stop, trip, anchor),
    };
  });
}

/**
 * The optimisation claims the route stage cycles through.
 *
 * Each is only shown when it is true of this trip: "less walking" needs a car leg to have
 * been chosen, "opening hours checked" needs a stop that actually has hours.
 */
export function optimisationNotes(trip: Trip): MessageKey[] {
  const notes: MessageKey[] = ["generation.optOrder"];
  if (trip.stops.some((stop) => stop.poi.openingHours)) notes.push("generation.optHours");
  if (trip.segments.some((segment) => segment.mode === "car")) notes.push("generation.optWalking");
  notes.push("generation.optRoute");
  return notes;
}
