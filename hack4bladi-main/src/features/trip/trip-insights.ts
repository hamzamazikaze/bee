/**
 * What the app knows about the day but never said out loud.
 *
 * Every insight is derived from data already on the trip — opening hours, indoor/outdoor,
 * the profile's stated limits, `trip.metrics` — so nothing here is a guess and nothing is
 * decorative. If a check has nothing to report it returns null rather than filler.
 *
 * Pure: no React, no i18n. Callers get a key + params and render the sentence themselves.
 */
import { BUDGET_CAP_MAD, TIME_BUDGET_MINUTES } from "@/config/app";
import type { AdaptationType } from "@/types/adaptation";
import type { Weekday } from "@/types/common";
import type { WeatherSummary } from "@/types/experience";
import type { Interest, WalkingPreference } from "@/types/profile";
import type { POI } from "@/types/poi";
import type { Trip, TripStop } from "@/types/trip";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minutes back to "HH:MM". Past midnight wraps, which a one-day trip never does. */
export function clockTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export type HoursIssueKind = "closedToday" | "opensLater" | "closedOnArrival" | "closesDuring";

export interface HoursIssue {
  kind: HoursIssueKind;
  /** The opening or closing time the plan collides with; "" for closedToday. */
  time: string;
  /** When the visit as planned would end — the other half of a `closesDuring`. */
  leaveTime: string;
}

/**
 * Does the plan actually fit this place's opening hours today?
 *
 * The place sheet has always rendered these hours; nobody ever compared them to the
 * arrival time. On the golden day that comparison is not academic — the Hassan II visit
 * runs ten minutes past closing.
 */
export function stopHoursIssue(
  stop: TripStop,
  today: Weekday = new Date().getDay() as Weekday,
): HoursIssue | null {
  const hours = stop.poi.openingHours;
  if (!hours) return null;

  const windows = hours.weekly[today] ?? [];
  const arrive = toMinutes(stop.arrivalTime);
  const leave = arrive + stop.durationMinutes;
  const leaveTime = clockTime(leave);

  if (windows.length === 0) return { kind: "closedToday", time: "", leaveTime };

  const open = Math.min(...windows.map((w) => toMinutes(w.open)));
  const close = Math.max(...windows.map((w) => toMinutes(w.close)));

  if (arrive < open) return { kind: "opensLater", time: clockTime(open), leaveTime };
  if (arrive >= close) return { kind: "closedOnArrival", time: clockTime(close), leaveTime };
  if (leave > close) return { kind: "closesDuring", time: clockTime(close), leaveTime };
  return null;
}

/** First and last clock time of the day — the answer to "when am I done?". */
export function dayWindow(trip: Trip): { start: string; end: string; minutes: number } {
  const first = trip.stops[0];
  const last = trip.stops[trip.stops.length - 1];
  const start = toMinutes(first.arrivalTime);
  const end = toMinutes(last.arrivalTime) + last.durationMinutes;
  return { start: first.arrivalTime, end: clockTime(end), minutes: end - start };
}

export interface InterestMatch {
  /** Stops carrying at least one interest the user asked for. */
  matchedStops: number;
  total: number;
  percent: number;
  /** The interests this day actually delivers — not everything the user asked for. */
  hit: Interest[];
  /** Asked for, but nothing in the day covers it. Honest, and worth showing. */
  missed: Interest[];
}

export function interestMatch(trip: Trip): InterestMatch | null {
  const interests = trip.profile.interests;
  if (interests.length === 0) return null;

  const matchedStops = trip.stops.filter((stop) =>
    stop.poi.categories.some((category) => interests.includes(category)),
  ).length;
  const hit = interests.filter((interest) =>
    trip.stops.some((stop) => stop.poi.categories.includes(interest)),
  );

  return {
    matchedStops,
    total: trip.stops.length,
    percent: Math.round((100 * matchedStops) / trip.stops.length),
    hit,
    missed: interests.filter((interest) => !hit.includes(interest)),
  };
}

/** Which interest earned this stop its place in the day. */
export function stopMatchedInterest(stop: TripStop, interests: Interest[]): Interest | null {
  return stop.poi.categories.find((category) => interests.includes(category)) ?? null;
}

/** The user said how much walking they wanted. These are the metres behind each word. */
const WALKING_LIMIT: Record<WalkingPreference, number> = {
  minimal: 2000,
  normal: 4500,
  plenty: 8000,
};

/*
 * The time and money the traveller said they had now live in @/config/app, because the
 * engine fits the day to them before it is shown and this file reports against them
 * afterwards. Two copies of the same three numbers is exactly how a day could be
 * generated as feasible and then described as over budget.
 */

export type InsightTone = "warn" | "good" | "info";

/** Literal union so `t(`insight.${key}`)` stays a checked message path. */
export type InsightKey =
  | `hours.${HoursIssueKind}`
  | "rain"
  | "wind"
  | "walkingHeavy"
  | "budgetOver"
  | "budgetOk"
  | "matchPartial"
  | "matchFull"
  | "length"
  | "tooLong";

export interface TripInsight {
  id: "hours" | "rain" | "walking" | "budget" | "match" | "length";
  tone: InsightTone;
  /** Key under `insight.` in the message files. */
  key: InsightKey;
  params?: Record<string, string | number>;
  /** Present only when an adapter can genuinely act on it — never a dead button. */
  fix?: AdaptationType;
}

export interface BuildInsightsOptions {
  trip: Trip;
  weather?: WeatherSummary | null;
  /** Locale-aware POI name, supplied by the caller. */
  name: (poi: POI) => string;
  /** Injectable for tests; defaults to today. */
  today?: Weekday;
}

/**
 * The day, checked. Warnings first — a jury reads the top two rows and nothing else.
 *
 * Each warning that an adapter can genuinely act on carries a one-tap `fix`. An adapter
 * that cannot improve a given day still answers honestly rather than pretending, so the
 * button is never a lie — but it is also never offered where there is nothing to do.
 */
export function buildInsights({ trip, weather, name, today }: BuildInsightsOptions): TripInsight[] {
  const insights: TripInsight[] = [];
  const { metrics, profile } = trip;

  // 1. Opening hours. Reported per stop, first offender wins the row.
  for (const stop of trip.stops) {
    const issue = stopHoursIssue(stop, today);
    if (!issue) continue;
    insights.push({
      id: "hours",
      tone: "warn",
      key: `hours.${issue.kind}`,
      params: { place: name(stop.poi), time: issue.time, leave: issue.leaveTime },
    });
    break;
  }

  // 2. Rain against the stops that have no roof.
  const exposed = trip.stops.filter((stop) => stop.poi.indoorOutdoor !== "indoor").length;
  if (weather && (weather.condition === "rain" || weather.condition === "wind") && exposed > 0) {
    insights.push({
      id: "rain",
      tone: "warn",
      key: weather.condition === "rain" ? "rain" : "wind",
      params: { n: exposed, total: trip.stops.length },
      fix: "rainy_day",
    });
  }

  // 3. Walking, against the preference the user actually stated.
  const limit = WALKING_LIMIT[profile.walkingPreference ?? "normal"];
  if (metrics.walkingMeters > limit) {
    insights.push({
      id: "walking",
      tone: "warn",
      key: "walkingHeavy",
      params: { km: (metrics.walkingMeters / 1000).toFixed(1), minutes: metrics.movementMinutes },
      fix: "less_walking",
    });
  }

  // 4. Budget, against the stated level.
  const [, costMax] = metrics.estimatedCostMad;
  const cap = BUDGET_CAP_MAD[profile.budgetLevel ?? "medium"];
  if (costMax > cap) {
    insights.push({
      id: "budget",
      tone: "warn",
      key: "budgetOver",
      params: { cap, cost: costMax },
      fix: "spend_less",
    });
  } else if (costMax > 0) {
    insights.push({ id: "budget", tone: "good", key: "budgetOk", params: { cost: costMax, cap } });
  }

  // 5. What the day matched, and what it could not.
  const match = interestMatch(trip);
  if (match) {
    insights.push({
      id: "match",
      tone: match.missed.length > 0 ? "info" : "good",
      key: match.missed.length > 0 ? "matchPartial" : "matchFull",
      params: { matched: match.matchedStops, total: match.total },
    });
  }

  // 6. How long the day runs, end to end — a warning when it outruns the time given.
  const { start, end, minutes } = dayWindow(trip);
  const timeBudget = TIME_BUDGET_MINUTES[profile.timeAvailable ?? "full_day"];
  const overruns = metrics.totalMinutes > timeBudget;
  insights.push({
    id: "length",
    tone: overruns ? "warn" : "info",
    key: overruns ? "tooLong" : "length",
    // `minutes` is the whole span; the caller turns it into a locale-formatted duration.
    params: { start, end, minutes },
    fix: overruns ? "less_time" : undefined,
  });

  const rank: Record<InsightTone, number> = { warn: 0, good: 1, info: 2 };
  return insights.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ---------------------------------------------------------------------------
// Local impact
// ---------------------------------------------------------------------------

export interface LocalImpactLine {
  poi: POI;
  /** MAD, the conservative end of what this stop costs. */
  mad: number;
}

export interface LocalImpact {
  /** MAD across every stop whose money reaches a local person. */
  totalMad: number;
  lines: LocalImpactLine[];
}

/**
 * What of this day's money stays with local people.
 *
 * Deliberately narrow, because the claim has to survive a jury asking where the number
 * came from. A stop counts only when the dataset says two things outright:
 * `experience.supportsLocalBusiness` — money here reaches a person, not a chain — and a
 * real price. Everything else (admission to a mosque, a free medina, transport, a meal we
 * did not price) contributes nothing, so the figure is a floor, never an estimate dressed
 * up as one.
 *
 * `basePriceMad` reads `price.amount ?? price.min`, so a 140–200 MAD workshop is counted
 * at 140. Returns null when the day has no such stop: a four-monument day says nothing
 * about local impact rather than inventing some.
 */
export function localImpact(trip: Trip): LocalImpact | null {
  const lines: LocalImpactLine[] = [];

  for (const stop of trip.stops) {
    const meta = stop.poi.experience;
    if (!meta?.supportsLocalBusiness) continue;
    const price = meta.price;
    const mad = price?.amount ?? price?.min ?? null;
    if (typeof mad !== "number" || !Number.isFinite(mad) || mad <= 0) continue;
    lines.push({ poi: stop.poi, mad: Math.round(mad) });
  }

  if (lines.length === 0) return null;
  return { totalMad: lines.reduce((sum, line) => sum + line.mad, 0), lines };
}

// ---------------------------------------------------------------------------
// The day at a glance
// ---------------------------------------------------------------------------

export type DayBriefKey =
  | "shape.walking"
  | "shape.car"
  | "shape.mixed"
  | "weather"
  | "lean"
  | "budget";

export interface DayBriefLine {
  key: DayBriefKey;
  params: Record<string, string | number>;
}

export interface DayBriefOptions {
  trip: Trip;
  weather?: WeatherSummary | null;
  /** Locale-aware weather label ("Sunny"), supplied by the caller. */
  weatherLabel?: string;
  /** Locale-aware interest names, in the order the profile states them. */
  interestNames?: string[];
}

/**
 * Two sentences about the day, assembled from facts the trip already carries.
 *
 * Deliberately *not* a model call. Everything here is read off the same objects the rest
 * of the screen renders — stop count, `dayWindow()`, the walking/car split in
 * `trip.metrics`, the weather the header chip shows, the POIs' own indoor/outdoor flag —
 * so the copy cannot drift from the itinerary and cannot invent a place, a price or a
 * time. Cosmetic copy is not worth a millisecond of latency, and a summary that can
 * hallucinate is worse than no summary on the one screen the traveller trusts.
 *
 * Sentence one is always the shape of the day. Sentence two is the most concrete thing
 * left that the rest of the screen does not already say: the sky, else what the day
 * leans towards. Money is not here — it sits in the metadata row, where it is read once.
 */
export function dayBrief({
  trip,
  weather,
  weatherLabel,
  interestNames = [],
}: DayBriefOptions): DayBriefLine[] {
  const { start, end } = dayWindow(trip);
  const { walkingMeters, carMeters } = trip.metrics;
  const km = (walkingMeters / 1000).toFixed(1);

  const shape: DayBriefLine =
    carMeters === 0
      ? { key: "shape.walking", params: { stops: trip.stops.length, city: trip.destination, start, end, km } }
      : walkingMeters === 0
        ? { key: "shape.car", params: { stops: trip.stops.length, city: trip.destination, start, end } }
        : { key: "shape.mixed", params: { stops: trip.stops.length, city: trip.destination, start, end, km } };

  const lines: DayBriefLine[] = [shape];

  const exposed = trip.stops.filter((stop) => stop.poi.indoorOutdoor !== "indoor").length;
  if (weather && weatherLabel && exposed > 0) {
    lines.push({
      key: "weather",
      params: {
        label: weatherLabel,
        temp: weather.temperatureC,
        n: exposed,
        total: trip.stops.length,
      },
    });
  }

  /* Both, not either: a caller that drops the shape sentence (because the facts strip
     above it already carries stops, distance and time) is left with one line otherwise,
     and the sky alone is not a summary of a day. */
  const match = interestMatch(trip);
  if (match && interestNames.length > 0) {
    lines.push({
      key: "lean",
      params: {
        interests: interestNames.join(" · "),
        matched: match.matchedStops,
        total: match.total,
      },
    });
  }

  const [, costMax] = trip.metrics.estimatedCostMad;
  if (lines.length === 1 && costMax > 0) lines.push({ key: "budget", params: { cost: costMax } });
  return lines;
}
