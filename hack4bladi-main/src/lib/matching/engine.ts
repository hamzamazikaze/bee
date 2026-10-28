/**
 * The deterministic trip engine. Pure, synchronous, local — it never calls a model.
 *
 * AI understands, this decides. Given a (possibly empty) TripProfile it always returns
 * exactly TRIP_STOP_COUNT POIs, already ordered as a narrative day.
 *
 * It does NOT compute route metrics. `calculateMetrics()` in @/lib/routing/metrics is the
 * single source of those numbers, or the before/after headline on stage would lie.
 */
import {
  APP,
  BUDGET_CAP_MAD,
  PACE_DURATION_MULTIPLIER,
  TIME_BUDGET_MINUTES,
  WALKING_COMFORT_METERS,
} from "@/config/app";
import { BASE_ROUTES } from "@/data/base-routes";
import type { MatchInput, MatchResult, TripEngine } from "@/lib/matching/types";
import { estimateLeg, haversineMeters, poiCostRange } from "@/lib/routing/metrics";
import type { ClockTime, Coordinates, LocalizedText } from "@/types/common";
import type { ExperienceKind, POI, POICategory, PriceRange } from "@/types/poi";
import type { BudgetLevel, Interest, TripPace, TripProfile } from "@/types/profile";
import { TRIP_STOP_COUNT, type TripStop } from "@/types/trip";

/** A stop we cannot honestly send someone to is never a candidate. */
const BLOCKED_STATUSES = new Set(["permanently_closed", "temporarily_unavailable"]);

const DAY_START_MINUTES = 9 * 60 + 30;
const LATEST_START_MINUTES = 18 * 60;

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * POIs in the requested city.
 *
 * With no destination we fall back to APP.defaultDestination rather than the whole
 * region: a region-wide pool picks the four best POIs across 200 km of coast, which is a
 * scoring win and a useless day. Falls through to the region only when the named city is
 * too thin to fill a day — a trip is never refused for lack of a match.
 */
function destinationPool(pois: POI[], destination: string | null): POI[] {
  const needle = normalise(destination ?? APP.defaultDestination);
  if (needle.length < 3) return pois;

  const inCity = pois.filter((poi) => {
    const city = normalise(poi.city);
    return city === needle || city.includes(needle) || needle.includes(city);
  });
  return inCity.length >= TRIP_STOP_COUNT ? inCity : pois;
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
 * What the day is anchored on: the recognised place if we have one, else the centre of
 * the city's places.
 *
 * Places, not the whole pool. The anchor is a claim about where a city *is*, and it must
 * not move because we curated four workshops in one neighbourhood — when it did, every
 * proximity score shifted and a day nobody had touched came back reordered. Experiences
 * are still fully rankable; they just do not get to redefine the centre of town.
 */
function anchorFor(pool: POI[], profile: TripProfile): Coordinates {
  const detected = anchorPoi(pool, profile);
  if (detected) return detected.coordinates;
  const places = pool.filter((poi) => kindOf(poi) === "place");
  return centroid(places.length > 0 ? places : pool);
}

/**
 * The stop the traveller explicitly named, when the dataset can honour it.
 *
 * Moving the map's centre of gravity was never enough. When someone says "I want to cook
 * with X in Casablanca" the understanding layer resolves X to a curated id with high
 * confidence, and the day it got back contained four monuments and not X — the one thing
 * they had actually asked for was the one thing the engine treated as a hint. A resolved
 * entity is a request, so it is taken first and the rest of the day is built around it.
 *
 * `pool` is already narrowed to the requested city and to stops we can honestly send
 * someone to, so this finds nothing for an entity recognised in another town or one that
 * is closed. That ordering is deliberate: the explicit city is the stronger constraint of
 * the two, and recognising a lagoon in Oualidia is not a reason to abandon a day in
 * Casablanca. The day simply proceeds without an anchor, exactly as it did before.
 */
function anchorPoi(pool: POI[], profile: TripProfile): POI | undefined {
  if (!profile.detectedPoiId) return undefined;
  return pool.find((poi) => poi.id === profile.detectedPoiId);
}

/** Rough MAD midpoint of a band, used only to compare a POI against a budget level. */
const BAND_WEIGHT: Record<PriceRange, number> = {
  free: 0,
  "0_30": 15,
  "30_60": 45,
  "60_150": 105,
  "150_300": 225,
  "300_plus": 400,
  unknown: 30,
};

function budgetScore(priceRange: PriceRange, budget: BudgetLevel | null): number {
  const weight = BAND_WEIGHT[priceRange];
  if (!budget) return 0;
  if (budget === "low") return weight <= 30 ? 12 : -Math.min(24, weight / 8);
  if (budget === "medium") return weight <= 150 ? 8 : -Math.min(16, (weight - 150) / 12);
  return weight >= 30 ? 8 : 2;
}

/**
 * Weights are a calibration surface, not physics. They are tuned so a stated interest
 * visibly changes the day: curation weight alone must not hand every profile the same
 * four famous stops.
 */
const EMPTY_SET: ReadonlySet<string> = new Set();

/** How far down the ranking the complementary slot may reach for variety. */
const COMPLEMENTARY_POOL = 6;

const WEIGHTS = {
  priority: 5,
  signature: 6,
  hero: 2,
  primaryInterest: 34,
  secondaryInterest: 20,
  proximity: 14,
  proximityFalloffMeters: 6000,
  /**
   * Membership of a curated route whose city and interests match the traveller.
   *
   * Q52 forbids returning a template raw, so this is a weight and not a shortcut: the
   * engine still scores every POI and can substitute a curated stop that is closed,
   * off-budget or badly placed. It is large enough to carry a hand-picked day over a
   * near-duplicate that happens to score well — Ancienne Médina and Quartier Habous are
   * both culture/food medinas, and only curation knows which one belongs in this day.
   */
  curatedRoute: 34,
  /**
   * A stop where something happens to you rather than in front of you.
   *
   * Small on purpose. The product thesis is that a day mixing seeing, meeting, making and
   * tasting beats four monuments — but a bonus large enough to guarantee that outcome
   * would also drag a traveller across the city for a workshop they never asked for.
   * Composition is expressed in the *selection* below, where it can be traded against
   * geography, not here where it cannot.
   */
  experiential: 7,
  /**
   * A stop the curator proposed for this exact traveller.
   *
   * Comparable to `curatedRoute` and for the same reason: it is a hand-picked claim about
   * which stops belong together, and it has to survive a near-duplicate that scores well.
   * It is still a weight — a suggestion that is closed, off-budget or unreachable loses to
   * the repairs below, which is the difference between the model advising and deciding.
   */
  aiSuggested: 30,
} as const;

/** Absent means a plain sightseeing stop; every POI curated before experiences reads so. */
function kindOf(poi: POI): ExperienceKind {
  return poi.kind ?? "place";
}

/** MAKE and TASTE are what the composition tries hardest to include. */
const COMPOSITION_TARGETS: readonly ExperienceKind[] = ["workshop", "food_experience"];

/**
 * Which experience, when several would do.
 *
 * Curation first, score second — the one place in the engine where a hand-set weight
 * outranks the arithmetic, and deliberately. `priority` is what the dataset uses to say
 * "this is the one we would send a friend to", and for Casablanca that is the family
 * kitchen: it is the stop the whole product thesis is built on, and it was losing the slot
 * to cheaper experiences that merely scored better once the budget penalty was applied.
 *
 * It stays a preference between experiences, never a licence to exceed what the traveller
 * said they had: the budget and time repairs below still get the last word, which is why a
 * 250 MAD class simply cannot appear in a 150 MAD day.
 */
function byCurationThenScore(a: Scored, b: Scored): number {
  return b.poi.priority - a.poi.priority || b.score - a.score || a.poi.id.localeCompare(b.poi.id);
}

/** The best experience in `pool` by that rule, or undefined when there is none. */
function bestExperience(pool: Scored[], accept: (c: Scored) => boolean): Scored | undefined {
  return pool.filter((c) => kindOf(c.poi) !== "place" && accept(c)).sort(byCurationThenScore)[0];
}

/** POIs belonging to a curated route that matches this traveller's city and interests. */
function curatedPoiIds(input: MatchInput): Set<string> {
  const { profile } = input;
  const ids = new Set<string>();
  if (!profile.destination || profile.interests.length === 0) return ids;

  const destination = profile.destination.trim().toLowerCase();
  const byId = new Map(input.pois.map((poi) => [poi.id, poi]));

  /*
   * Exactly one route, never the union of every match. Several curated days can cover
   * "culture + food" in Casablanca, and boosting all of them together simply restores
   * the original ranking — which is precisely how this weight first came to do nothing.
   *
   * Ties break on the summed curation priority of the stops: the strongest hand-picked
   * day wins.
   */
  let best: { ids: string[]; strength: number } | null = null;

  for (const route of input.baseRoutes ?? BASE_ROUTES) {
    if (route.city.toLowerCase() !== destination) continue;
    if (!profile.interests.every((i) => route.interests.includes(i))) continue;

    const strength = route.poiIds.reduce((sum, id) => sum + (byId.get(id)?.priority ?? 0), 0);
    if (!best || strength > best.strength) best = { ids: route.poiIds, strength };
  }

  best?.ids.forEach((id) => ids.add(id));
  return ids;
}

function scorePoi(
  poi: POI,
  profile: TripProfile,
  anchor: Coordinates,
  curated: ReadonlySet<string> = EMPTY_SET,
  suggested: ReadonlySet<string> = EMPTY_SET,
): number {
  let score = poi.priority * WEIGHTS.priority;
  if (curated.has(poi.id)) score += WEIGHTS.curatedRoute;
  if (suggested.has(poi.id)) score += WEIGHTS.aiSuggested;
  if (poi.signature) score += WEIGHTS.signature;
  if (poi.hero) score += WEIGHTS.hero;

  // POICategory === Interest by design, so matching is `===`, never a mapping table.
  for (const interest of profile.interests) {
    const rank = poi.categories.indexOf(interest);
    if (rank === 0) score += WEIGHTS.primaryInterest;
    else if (rank > 0) score += WEIGHTS.secondaryInterest;
  }

  if (kindOf(poi) !== "place") score += WEIGHTS.experiential;

  score += budgetScore(poi.priceRange, profile.budgetLevel);

  if (profile.walkingPreference === "minimal") score -= (poi.walkingScore - 1) * 10;
  else if (profile.walkingPreference === "plenty") score += (poi.walkingScore - 1) * 4;

  if (profile.timeAvailable === "few_hours") {
    score -= Math.max(0, poi.baseDurationMinutes - 60) / 10;
  }

  // Geographic gravity: full marks next to the anchor, fading over ~6 km.
  score +=
    WEIGHTS.proximity *
    Math.exp(-haversineMeters(anchor, poi.coordinates) / WEIGHTS.proximityFalloffMeters);

  if (poi.availability.status === "unknown") score -= 4;
  else if (poi.availability.status === "seasonal") score -= 2;
  if (poi.verification === "needs_verification") score -= 2;

  return score;
}

interface Scored {
  poi: POI;
  score: number;
}

/** Deterministic ordering: score desc, then id asc so equal scores never flip. */
function byScoreThenId(a: Scored, b: Scored): number {
  return b.score - a.score || a.poi.id.localeCompare(b.poi.id);
}

// ---------------------------------------------------------------------------
// Narrative ordering
// ---------------------------------------------------------------------------

/** Per category, how well it fits [morning, midday, afternoon, sunset]. */
const PHASE_AFFINITY: Record<POICategory, readonly [number, number, number, number]> = {
  culture: [4, 0, 2, 1],
  food: [-1, 5, 0, -2],
  coast_nature: [0, 0, 1, 5],
  hidden_gems: [2, 0, 4, 0],
  art_creative: [1, 0, 4, 0],
  activities: [0, 1, 3, 2],
};

/** Earliest minute of the day this POI is ever open, or 0 for open public space. */
function earliestOpenMinutes(poi: POI): number {
  if (!poi.openingHours) return 0;
  let earliest = Number.POSITIVE_INFINITY;
  for (const windows of Object.values(poi.openingHours.weekly)) {
    for (const window of windows) {
      const [h, m] = window.open.split(":").map(Number);
      earliest = Math.min(earliest, h * 60 + m);
    }
  }
  return Number.isFinite(earliest) ? earliest : 0;
}

function slotAffinity(poi: POI, slot: number): number {
  let total = 0;
  poi.categories.forEach((category, index) => {
    total += PHASE_AFFINITY[category][slot] / (index + 1);
  });
  if (slot === 3) {
    if (poi.signature) total += 3;
    if (poi.indoorOutdoor === "indoor") total -= 2;
  }
  if (slot === 0 && earliestOpenMinutes(poi) >= 11 * 60) total -= 4;
  return total;
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const out: T[][] = [];
  items.forEach((item, index) => {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)];
    for (const tail of permutations(rest)) out.push([item, ...tail]);
  });
  return out;
}

/**
 * A day reads morning culture → midday food → afternoon discovery → sunset icon.
 * With TRIP_STOP_COUNT stops there are only 24 orderings, so we take the best one
 * outright rather than approximating. Ties keep the incoming order: deterministic.
 */
function orderNarratively(pois: POI[]): POI[] {
  let best = pois;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of permutations(pois)) {
    const score = candidate.reduce((sum, poi, slot) => sum + slotAffinity(poi, slot), 0);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Obligations and feasibility
// ---------------------------------------------------------------------------

/**
 * What the traveller said out loud, which no later adjustment may quietly undo.
 *
 * The two repairs below improve a day by swapping stops, and without this they would
 * happily buy their way under a budget by dropping the very thing that was asked for.
 */
interface Obligations {
  /** A resolved entity, if the city could honour one. */
  anchorId: string | null;
  /** Every stated interest needs at least one stop that carries it. */
  interests: Interest[];
  /**
   * The kinds of stop the selection above arrived at — SEE, MEET, MAKE, TASTE.
   *
   * A repair may change *which* stop; it may not change *what kind of day this is*. The
   * composition step chose a workshop and a table with a family deliberately, and a
   * traveller who then answers "medium budget" on a later screen has not asked to be sent
   * to four monuments instead — they have asked for a cheaper version of the day they
   * picked. So the repair swaps the 250 MAD cooking class for the 60 MAD tea ritual
   * rather than deleting the only food experience in the day.
   *
   * This is the same instinct that keeps a 105-minute class 105 minutes long, applied to
   * money instead of time.
   */
  kinds: ExperienceKind[];
}

/**
 * A day is people, not only facades.
 *
 * The composition step already reaches for a workshop or a table with a family, but it
 * reaches — it does not insist, and in a city with twenty-two curated places it loses.
 * Casablanca proved it: five of nine stated-interest profiles came back as four monuments,
 * including the flagship culture+food day, because a matched interest is worth 34 and being
 * experiential is worth 7. Whatever the scores say, a day with nobody in it is not the
 * product this dataset was built for.
 *
 * So this is the one composition rule that is a guarantee rather than a preference. It
 * runs after selection and gives up exactly one stop for the best-scoring experience the
 * pool can offer, choosing what to surrender in this order:
 *
 *   never the stop the traveller named out loud;
 *   never a stop whose loss would leave a stated interest with no carrier;
 *   a signature must-see only when nothing else is available;
 *   then the weakest thing left.
 *
 * A city with no experiences at all returns the day unchanged — the guarantee is "if we
 * have one", never an invented stop.
 */
function ensureExperience(
  chosen: POI[],
  ranked: Scored[],
  profile: TripProfile,
  anchorId: string | null,
): POI[] {
  if (chosen.some((poi) => kindOf(poi) !== "place")) return chosen;

  const taken = new Set(chosen.map((poi) => poi.id));
  const offered = ranked
    .filter((c) => kindOf(c.poi) !== "place" && !taken.has(c.poi.id))
    .sort(byCurationThenScore);
  if (offered.length === 0) return chosen;

  const promised = profile.interests.filter((interest) =>
    chosen.some((poi) => poi.categories.includes(interest)),
  );
  const scoreOf = new Map(ranked.map((c) => [c.poi.id, c.score]));

  /** Would the day still answer every interest it currently answers after this swap? */
  const keepsPromises = (victim: POI, incoming: POI): boolean => {
    const after = chosen.map((poi) => (poi.id === victim.id ? incoming : poi));
    return promised.every((interest) => after.some((poi) => poi.categories.includes(interest)));
  };

  const candidates = chosen.filter((poi) => poi.id !== anchorId);
  if (candidates.length === 0) return chosen;

  /* What we are willing to give up, least valuable first: a signature must-see only when
     nothing else is left, and otherwise the weakest thing in the day. */
  const victims = [...candidates].sort(
    (a, b) =>
      Number(a.signature) - Number(b.signature) ||
      (scoreOf.get(a.id) ?? 0) - (scoreOf.get(b.id) ?? 0) ||
      a.id.localeCompare(b.id),
  );

  /*
   * An hour of somebody's time is still an hour.
   *
   * Taking the best-scoring experience regardless of length is how a 105-minute cooking
   * class landed in a day the traveller had said was a few hours — and because the time
   * repair below is forbidden from trimming an appointment, nothing downstream could undo
   * it: the day came back 268 minutes against a stated 240. So the day it would produce is
   * measured before it is chosen, and only when nothing fits does the shortest one go in
   * anyway, over-running honestly and letting `buildInsights` say so.
   */
  const limit = profile.timeAvailable ? TIME_BUDGET_MINUTES[profile.timeAvailable] : null;

  for (const candidate of offered) {
    for (const victim of victims) {
      if (!keepsPromises(victim, candidate.poi)) continue;
      const next = chosen.map((poi) => (poi.id === victim.id ? candidate.poi : poi));
      if (limit === null || dayMinutes(next, profile) <= limit) return next;
    }
  }

  /* Nothing fits. The promise still holds, with the least expensive version of it. */
  const shortest = [...offered].sort(
    (a, b) =>
      a.poi.baseDurationMinutes - b.poi.baseDurationMinutes || a.poi.id.localeCompare(b.poi.id),
  )[0];
  const victim = victims.find((poi) => keepsPromises(poi, shortest.poi)) ?? victims[0];
  return chosen.map((poi) => (poi.id === victim.id ? shortest.poi : poi));
}

function meetsObligations(pois: POI[], obligations: Obligations): boolean {
  if (obligations.anchorId && !pois.some((poi) => poi.id === obligations.anchorId)) return false;
  if (!obligations.kinds.every((kind) => pois.some((poi) => kindOf(poi) === kind))) return false;
  return obligations.interests.every((interest) =>
    pois.some((poi) => poi.categories.includes(interest)),
  );
}

/** The dearest this day can be, priced exactly as `calculateMetrics` will price it. */
function dayCostMad(pois: POI[]): number {
  return pois.reduce((total, poi) => total + poiCostRange(poi)[1], 0);
}

/**
 * How many minutes this selection will occupy once scheduled — visits plus the travel
 * between them, in the order the day will actually be walked.
 *
 * The same arithmetic `calculateMetrics` performs over the finished segments, so a
 * selection that fits here cannot over-run once it is on screen.
 */
function dayMinutes(pois: POI[], profile: TripProfile): number {
  const ordered = orderNarratively(pois);
  let total = 0;
  ordered.forEach((poi, index) => {
    if (index > 0) {
      total += estimateLeg(
        ordered[index - 1].coordinates,
        poi.coordinates,
        WALKING_COMFORT_METERS,
      ).durationMinutes;
    }
    total += visitDurationMinutes(poi, profile.pace);
  });
  return total;
}

/**
 * Brings a day under a stated limit by giving up one stop at a time.
 *
 * Deliberately a repair and not a search. The selection above already encodes curation,
 * the traveller's interests and the geography of the city; a combinatorial optimiser
 * would throw all three away to save twenty dirhams. Each pass surrenders the single stop
 * costing the most of whatever we are short of, and accepts a replacement only when the
 * day still meets every obligation.
 *
 * When nothing can be improved the day comes back unchanged and over the limit. That is
 * the honest answer, and `buildInsights` still reports it: a day we pretended to fit
 * would be worse than one the brief admits is long or dear.
 */
function fitToLimit(input: {
  chosen: POI[];
  ranked: Scored[];
  obligations: Obligations;
  /** What this day costs, in whatever unit is being constrained. */
  measure: (pois: POI[]) => number;
  limit: number;
  /** Stops this repair may not give up. */
  protect?: (poi: POI) => boolean;
}): POI[] {
  const { ranked, obligations, measure, limit, protect } = input;
  let current = input.chosen;

  for (let pass = 0; pass < TRIP_STOP_COUNT; pass += 1) {
    if (measure(current) <= limit) return current;

    let improved: POI[] | null = null;
    let best = measure(current);

    /* The dearest stop first: it is the one the traveller is paying for, in money or in
       hours, and giving it up buys the most for the least damage to the day. */
    const victims = [...current].sort(
      (a, b) => measure([b]) - measure([a]) || a.id.localeCompare(b.id),
    );

    for (const victim of victims) {
      if (victim.id === obligations.anchorId) continue;
      if (protect?.(victim)) continue;

      for (const candidate of ranked) {
        if (current.some((poi) => poi.id === candidate.poi.id)) continue;
        const next = current.map((poi) => (poi.id === victim.id ? candidate.poi : poi));
        if (!meetsObligations(next, obligations)) continue;

        const value = measure(next);
        if (value < best) {
          best = value;
          improved = next;
        }
      }
      // One victim per pass: the best replacement for the worst offender, then re-measure.
      if (improved) break;
    }

    if (!improved) return current;
    current = improved;
  }

  return current;
}

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

function pickBaseRouteId(chosen: POI[], input: MatchInput): string | null {
  const routes = input.baseRoutes ?? BASE_ROUTES;
  const chosenIds = new Set(chosen.map((poi) => poi.id));
  let bestId: string | null = null;
  let bestScore = 0;
  for (const route of routes) {
    const overlap = route.poiIds.filter((id) => chosenIds.has(id)).length;
    const interestOverlap = input.profile.interests.filter((i) =>
      route.interests.includes(i),
    ).length;
    const score = overlap * 2 + interestOverlap;
    if (score > bestScore) {
      bestScore = score;
      bestId = route.id;
    }
  }
  return bestId;
}

export function match(input: MatchInput): MatchResult {
  const { profile } = input;
  const available = input.pois.filter(
    (poi) => !BLOCKED_STATUSES.has(poi.availability.status),
  );

  const pool = destinationPool(available, profile.destination);
  const anchor = anchorFor(pool, profile);
  const curated = curatedPoiIds(input);

  /* Only ids the pool can actually honour. A suggestion for a closed stop, or for one in
     another town, is dropped here rather than defended against three times below. */
  const inPool = new Set(pool.map((poi) => poi.id));
  const suggested = new Set((input.suggestedPoiIds ?? []).filter((id) => inPool.has(id)));

  const ranked: Scored[] = pool
    .map((poi) => ({ poi, score: scorePoi(poi, profile, anchor, curated, suggested) }))
    .sort(byScoreThenId);

  const chosen: POI[] = [];
  const taken = new Set<string>();
  /* Returns whether it took, and never overfills: with an anchor and a coverage
     obligation there are now more claims on the day than there are slots, and the old
     unconditional push relied on a trailing `slice(4)` that silently dropped whichever
     claim happened to be last. */
  const take = (candidate: Scored | undefined): boolean => {
    if (!candidate || taken.has(candidate.poi.id) || chosen.length >= TRIP_STOP_COUNT) {
      return false;
    }
    taken.add(candidate.poi.id);
    chosen.push(candidate.poi);
    return true;
  };
  const free = (candidate: Scored) => !taken.has(candidate.poi.id);

  /*
   * 0. The entity the traveller actually named, before anything else in the day.
   *
   * This is the whole of the anchor fix. Everything below still runs exactly as it did;
   * it simply builds around a stop that is already in, rather than around a coordinate.
   */
  const named = anchorPoi(pool, profile);
  const anchored = named ? take(ranked.find((c) => c.poi.id === named.id)) : false;

  /*
   * 1. The curator's day, in the order it proposed — after the stop the traveller named
   *    out loud, which still outranks anything a model suggests.
   *
   * Taken rather than merely weighted because the value of a curation is the *combination*:
   * a workshop and the family kitchen and the sunset icon were chosen to sit in one day,
   * and boosting each of them separately just restores the ranking the engine already had.
   * Everything below still runs — the interest obligations, the composition slots and the
   * budget/time repair all treat these as stops that happen to be in already.
   */
  for (const id of input.suggestedPoiIds ?? []) {
    if (chosen.length >= TRIP_STOP_COUNT) break;
    if (!suggested.has(id)) continue;
    take(ranked.find((c) => c.poi.id === id));
  }

  // …then 2 strongly aligned, counting the anchor as one of them so the slots still add up.
  for (let slot = anchored ? 1 : 0; slot < 2; slot += 1) {
    take(ranked.find(free));
  }

  /*
   * …1 signature must-see, claimed BEFORE the complementary slot.
   *
   * Order matters here. A signature stop is usually also the most category-diverse one,
   * so letting "complementary" run first consumed it and pushed the signature slot onto
   * a weaker second choice — that is how the Casablanca day ended up with two medinas
   * and no Sacré-Cœur.
   */
  take(
    /* A curated day's own must-see comes first. Left to the open ranking, this slot took
       whichever signature POI happened to score highest for the stated interests, which
       for a food traveller is not the mosque — and the curated experience day lost its
       icon to a medina it had not chosen. */
    ranked.find((c) => !taken.has(c.poi.id) && c.poi.signature && curated.has(c.poi.id)) ??
      ranked.find((c) => !taken.has(c.poi.id) && c.poi.signature) ??
      ranked.find((c) => !taken.has(c.poi.id)),
  );

  /*
   * …then composition: SEE → MEET → MAKE → TASTE.
   *
   * The remaining slots prefer a stop that adds something the day has not got yet — a kind
   * first (a workshop, a food experience), then a category. Both are drawn from the same
   * bounded contender pool as before, because the constraint that made this slot work in
   * the first place still holds: a stop that is half the score and five kilometres away is
   * not complementary, it is a detour.
   *
   * Every preference here is a `??` chain ending in "the best thing left", so a city with
   * no workshops produces exactly the day it always did.
   */
  const contenders = ranked.slice(0, COMPLEMENTARY_POOL);

  /*
   * …then the promises. A stated interest with no stop carrying it is a day that did not
   * answer the question it was asked, and until now nothing guaranteed otherwise: the
   * composition slot below rewards *any* unseen category, so "culture and food" could be
   * filled by four stops that happened to score well and one interest could go unserved.
   *
   * Nearby first, then anywhere in the city — an obligation that cannot reach past the
   * contender pool is not an obligation. Ordered by the traveller's own ranking, so the
   * interest they named first gets the better slot.
   */
  for (const interest of profile.interests) {
    if (chosen.length >= TRIP_STOP_COUNT) break;
    if (chosen.some((poi) => poi.categories.includes(interest))) continue;
    const carries = (c: Scored) => free(c) && c.poi.categories.includes(interest);
    take(contenders.find(carries) ?? ranked.find(carries));
  }

  /*
   * …and one stop where something happens to you rather than in front of you.
   *
   * The product's whole claim is that a day mixing seeing, meeting, making and tasting
   * beats four monuments, and every part of this engine said so except the part that
   * decides. `experiential` is a small weight by design, and the fill loop below takes
   * curated stops before it considers anything else — so a traveller who asked for
   * "culture", whose curated route is four places, got four places. The thesis was true
   * for every profile that happened not to name one.
   *
   * An obligation rather than a bigger weight, for the same reason the interests above are:
   * a weight large enough to guarantee this would also drag someone across the city for a
   * workshop they never asked for. One slot, only when the day has none, taken nearby
   * first and then anywhere in the city.
   *
   * NOT when a curated route matched. A hand-picked day already knows which four stops
   * belong together, and the golden Casablanca day is four monuments on purpose — the
   * first version of this took Sacré-Cœur out of it for a workshop and broke the measured
   * demo headline along with it. Curation stays the stronger claim; this fills the days
   * nobody curated, which is the only place composition was ever meant to decide.
   */
  if (curated.size === 0 && chosen.length < TRIP_STOP_COUNT && !chosen.some((poi) => kindOf(poi) !== "place")) {
    const experiential = (c: Scored) => free(c) && kindOf(c.poi) !== "place";
    take(contenders.find(experiential) ?? ranked.find(experiential));
  }

  while (chosen.length < TRIP_STOP_COUNT) {
    const covered = new Set(chosen.flatMap((poi) => poi.categories));
    const kinds = new Set(chosen.map(kindOf));

    const before = chosen.length;
    take(
      /* Curation first, always. A hand-picked day already knows which four stops belong
         together; composition is what fills a day nobody curated. Without this the
         signature Casablanca route lost Sacré-Cœur to whichever experience happened to
         carry an unseen kind — novelty quietly overruling a deliberate choice. */
      ranked.find((c) => free(c) && curated.has(c.poi.id)) ??
        // MAKE or TASTE, if the day is still missing one and the pool can offer it nearby.
        bestExperience(
          contenders,
          (c) => free(c) && COMPOSITION_TARGETS.includes(kindOf(c.poi)) && !kinds.has(kindOf(c.poi)),
        ) ??
        // Any unseen kind — a local activity counts as variety too.
        contenders.find((c) => free(c) && !kinds.has(kindOf(c.poi))) ??
        // Failing that, the old rule: an unseen category.
        contenders.find((c) => free(c) && c.poi.categories.some((cat) => !covered.has(cat))) ??
        ranked.find(free),
    );
    // Nothing left to take from the ranked pool; the top-up below finishes the day.
    if (chosen.length === before) break;
  }

  // Always exactly four: top up from the pool, then from the whole region.
  for (const candidate of ranked) {
    if (chosen.length >= TRIP_STOP_COUNT) break;
    take(candidate);
  }
  for (const poi of available) {
    if (chosen.length >= TRIP_STOP_COUNT) break;
    take({ poi, score: 0 });
  }

  /* The day has four stops; this decides whether one of them is a person. It runs before
     the obligations below are read, so whatever it swaps in is then protected from the
     budget and time repairs like any other thing the traveller was promised. */
  const withPeople = ensureExperience(
    chosen.slice(0, TRIP_STOP_COUNT),
    ranked,
    profile,
    anchored ? (named?.id ?? null) : null,
  );
  chosen.length = 0;
  chosen.push(...withPeople);

  /*
   * Now make the day fit what the traveller said they had.
   *
   * Both limits used to be checked only after the day was on screen, which meant the
   * product generated a 570 MAD afternoon for someone who had said "cheap" and then
   * apologised for it in a warning strip. Fitting happens here, before the reveal, and
   * the warning survives for the days that genuinely cannot be fitted.
   */
  let selection = chosen.slice(0, TRIP_STOP_COUNT);

  const obligations: Obligations = {
    anchorId: anchored ? (named?.id ?? null) : null,
    interests: profile.interests.filter((interest) =>
      pool.some((poi) => poi.categories.includes(interest)),
    ),
    kinds: [...new Set(selection.map(kindOf))],
  };

  if (profile.budgetLevel) {
    selection = fitToLimit({
      chosen: selection,
      ranked,
      obligations,
      measure: dayCostMad,
      limit: BUDGET_CAP_MAD[profile.budgetLevel],
    });
  }

  if (profile.timeAvailable) {
    selection = fitToLimit({
      chosen: selection,
      ranked,
      obligations,
      measure: (pois) => dayMinutes(pois, profile),
      limit: TIME_BUDGET_MINUTES[profile.timeAvailable],
      /* A booked experience is an appointment, not a slot to be trimmed: the cooking
         class is 105 minutes for everybody. A short day is made by choosing shorter
         *places*, never by shortening — or quietly dropping — the thing the traveller
         is turning up for. */
      protect: (poi) => kindOf(poi) !== "place",
    });
  }

  const stops = orderNarratively(selection);

  return {
    pois: stops,
    baseRouteId: pickBaseRouteId(stops, input),
    scores: Object.fromEntries(ranked.map(({ poi, score }) => [poi.id, score])),
  };
}

// ---------------------------------------------------------------------------
// schedule
// ---------------------------------------------------------------------------

const SLOT_REASONS: readonly LocalizedText[] = [
  {
    en: "Start here while the city is still quiet.",
    fr: "Commencez ici, la ville est encore calme.",
    ar: "ابدأ من هنا والمدينة ما تزال هادئة.",
    es: "Empieza aquí, la ciudad todavía está tranquila.",
    de: "Fang hier an, solange die Stadt noch ruhig ist.",
    it: "Comincia da qui, la città è ancora tranquilla.",
    pt: "Começa por aqui, a cidade ainda está calma.",
  },
  {
    en: "The midday stop: this is where you eat.",
    fr: "L'étape de midi : c'est ici que vous mangez.",
    ar: "محطة الظهيرة، هنا تأكل.",
    es: "La parada del mediodía: aquí es donde comes.",
    de: "Der Mittagsstopp: hier wird gegessen.",
    it: "La tappa di mezzogiorno: qui si mangia.",
    pt: "A paragem do meio-dia: é aqui que comes.",
  },
  {
    en: "The afternoon find, chosen from what you picked.",
    fr: "La trouvaille de l'après-midi, choisie d'après vos préférences.",
    ar: "اكتشاف ما بعد الظهر، مختار وفق ما اخترته.",
    es: "El hallazgo de la tarde, elegido según tus preferencias.",
    de: "Der Fund des Nachmittags, nach deiner Auswahl gewählt.",
    it: "La scoperta del pomeriggio, scelta in base ai tuoi gusti.",
    pt: "O achado da tarde, escolhido a partir do que indicaste.",
  },
  {
    en: "Ends the day facing the light.",
    fr: "Termine la journée face à la lumière.",
    ar: "يختم اليوم في مواجهة الضوء.",
    es: "Cierra el día de cara a la luz.",
    de: "Beendet den Tag mit Blick ins Licht.",
    it: "Chiude la giornata di fronte alla luce.",
    pt: "Fecha o dia de frente para a luz.",
  },
];

/**
 * Why an experiential stop is here, said plainly. Deterministic and local — the day is
 * already decided by the time this runs, so there is nothing for a model to add.
 */
const KIND_REASONS: Record<Exclude<ExperienceKind, "place">, LocalizedText> = {
  workshop: {
    en: "A hands-on craft session: you leave with something you made.",
    fr: "Un atelier pratique : vous repartez avec ce que vous avez fabriqué.",
    ar: "ورشة عملية: تغادر بشيء صنعته بنفسك.",
    es: "Un taller práctico: te vas con algo hecho por ti.",
    de: "Eine Werkstatt zum Anfassen: du gehst mit etwas Selbstgemachtem.",
    it: "Un laboratorio pratico: esci con qualcosa fatto da te.",
    pt: "Uma oficina prática: sais com algo feito por ti.",
  },
  food_experience: {
    en: "A food experience that adds a local human connection to your day.",
    fr: "Une expérience culinaire qui ajoute une rencontre locale à votre journée.",
    ar: "تجربة طعام تضيف لقاءً محليًا إلى يومك.",
    es: "Una experiencia culinaria que añade un encuentro local a tu día.",
    de: "Ein kulinarisches Erlebnis, das deinem Tag eine echte Begegnung hinzufügt.",
    it: "Un'esperienza gastronomica che aggiunge un incontro locale alla tua giornata.",
    pt: "Uma experiência gastronómica que acrescenta um encontro local ao teu dia.",
  },
  local_activity: {
    en: "Time with local people, not just in front of a monument.",
    fr: "Du temps avec des habitants, pas seulement devant un monument.",
    ar: "وقت مع السكان المحليين، لا أمام معلمة فقط.",
    es: "Tiempo con gente de aquí, no solo delante de un monumento.",
    de: "Zeit mit Menschen von hier, nicht nur vor einem Denkmal.",
    it: "Tempo con la gente del posto, non solo davanti a un monumento.",
    pt: "Tempo com gente daqui, não só à frente de um monumento.",
  },
};

function reasonFor(poi: POI, index: number): LocalizedText {
  const kind = kindOf(poi);
  if (kind !== "place") return KIND_REASONS[kind];
  return SLOT_REASONS[Math.min(index, SLOT_REASONS.length - 1)];
}

/** Clamped, never wrapped: a day that overruns shows 23:30, never 01:15. */
function toClock(minutes: number): ClockTime {
  const clamped = Math.min(Math.max(Math.round(minutes), 0), 23 * 60 + 30);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function startMinutes(now?: Date): number {
  if (!now) return DAY_START_MINUTES;
  const current = now.getHours() * 60 + now.getMinutes();
  if (current <= DAY_START_MINUTES) return DAY_START_MINUTES;
  return Math.min(Math.ceil(current / 30) * 30, LATEST_START_MINUTES);
}

/**
 * How long one visit lasts, at the traveller's stated pace.
 *
 * Pace stretches a visit; it does not shorten an appointment.
 *
 * A monument is as long as you want it to be, so an explorer sees it in 0.8x. A
 * 105-minute cooking class is 105 minutes for everybody — applying the multiplier
 * scheduled the next stop while the traveller was still making the tajine, and the
 * timeline said so. An experiential stop keeps its real duration.
 *
 * This is exported because the adapters re-time days too. When the rule lived here as an
 * inline branch and in @/lib/adaptation/shared as a copy, the copy was the old rule: Rainy
 * Day could swap in the 90-minute pottery workshop and hand an explorer 70 minutes of it.
 * One function, so the two can never disagree again.
 */
export function visitDurationMinutes(poi: POI, pace: TripPace | null | undefined): number {
  if (kindOf(poi) !== "place") return poi.baseDurationMinutes;
  const multiplier = PACE_DURATION_MULTIPLIER[pace ?? "balanced"];
  return Math.max(15, Math.round((poi.baseDurationMinutes * multiplier) / 5) * 5);
}

/**
 * Turns matched POIs into timed stops. Pace changes each visit's *duration* and nothing
 * else — the stop count is fixed at TRIP_STOP_COUNT by contract.
 *
 * The gap between stops is a straight-line travel estimate purely so arrival times look
 * sane before routing answers. The trip's real distance/duration numbers still come from
 * calculateMetrics() over the segments the routing provider produces.
 */
export function schedule(pois: POI[], profile: TripProfile, now?: Date): TripStop[] {
  let cursor = startMinutes(now);

  return pois.map((poi, index) => {
    if (index > 0) {
      const leg = estimateLeg(
        pois[index - 1].coordinates,
        poi.coordinates,
        WALKING_COMFORT_METERS,
      );
      cursor = Math.ceil((cursor + leg.durationMinutes) / 5) * 5;
    }
    const durationMinutes = visitDurationMinutes(poi, profile.pace);
    const stop: TripStop = {
      id: `stop-${index + 1}`,
      order: index + 1,
      poiId: poi.id,
      poi,
      arrivalTime: toClock(cursor),
      durationMinutes,
      visitState: "upcoming",
      reason: reasonFor(poi, index),
    };
    cursor += durationMinutes;
    return stop;
  });
}

export const tripEngine: TripEngine = { match, schedule };
