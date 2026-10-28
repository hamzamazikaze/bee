"use client";

/**
 * The four things the product actually does between "Build my trip" and the itinerary,
 * each given its own stage on one fixed work surface.
 *
 *   profile  →  scan  →  match  →  route
 *
 * The surface never changes height, so the headline above it and the status bar below it
 * hold their lines for the whole run — the screen reads as one instrument doing four jobs
 * rather than four screens replacing each other.
 *
 * Nothing here loops for decoration. The scan stage cycles because a slow backend is
 * genuinely still reviewing places; every other stage plays once and settles.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, MapPinSimpleArea, X } from "@phosphor-icons/react";
import { DURATION, EASE_OUT } from "@/components/motion";
import { poiName } from "@/data/poi-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";
import {
  SCAN_WINDOW,
  candidateFeed,
  optimisationNotes,
  reviewedCount,
  stopMatches,
  type Candidate,
} from "./generation-candidates";

/**
 * `ready` is a phase, not a label swap.
 *
 * It used to be that the headline changed to "Your route is ready" on the same frame the
 * container began fading, so the payoff of the whole sequence existed for about 160ms at
 * under 20% opacity — the audit screenshot of it is a near-black rectangle. Ready now
 * owns real time with nothing moving, and only then does `handoff` take the screen away.
 */
export type GenerationPhase = "profile" | "scan" | "match" | "route" | "ready" | "handoff";

/** The phases whose stage is the finished route: ready holds it, handoff carries it out. */
export const ROUTE_PHASES: readonly GenerationPhase[] = ["route", "ready", "handoff"];

/**
 * One height for every stage, set by the densest of them: four scored rows at 48px plus
 * their gaps is 199px, and 240px less the surface's own 14px padding is 212px of room.
 * The scan stream is sized against the same figure — four 46px rows, the oldest one
 * grazing the fade at the top.
 */
export const STAGE_HEIGHT = "15rem";

/* ------------------------------------------------------------------------ */
/* Phase 1 — the profile assembling itself                                   */
/* ------------------------------------------------------------------------ */

/**
 * Seats for up to six chips, laid out as a constellation rather than a list.
 *
 * A seat is an EDGE and an inset, never a centre point. Centring a chip on a percentage
 * is what cut "Local & Hidden Gems" down to "cal & Hidden Gems": the chip is as wide as
 * whatever the traveller chose, half of it hung past x=10%, and the card clips. Anchored
 * by the edge it sits nearest, a chip can only grow inwards, and `max-w` stops it before
 * it reaches the far side.
 *
 * `side` is logical, so the whole cluster mirrors in Arabic instead of being laid out for
 * Latin and then hoping.
 */
const CHIP_SEATS = [
  { side: "start", inset: 5, y: 20 },
  { side: "end", inset: 4, y: 15 },
  { side: "start", inset: 2, y: 46 },
  { side: "end", inset: 5, y: 49 },
  { side: "start", inset: 13, y: 77 },
  { side: "end", inset: 11, y: 80 },
] as const;

/**
 * Which seats to use for a given number of chips.
 *
 * Three chips used to take seats 0–2 and pile into the top-left corner, leaving the lower
 * half of the card empty — the partial-data screenshot in the audit. Picking a spread
 * keeps the cluster balanced at any size, and at four the gap in the middle is where the
 * centre node sits.
 */
const SEAT_PLAN: Record<number, readonly number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 3, 4],
  4: [0, 1, 4, 5],
  5: [0, 1, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

/** The traveller, in the 200x100 space the connector lines are drawn in. */
const CENTRE = { x: 96, y: 50 };

/** Where a seat's connector line starts: just inside the chip, so the chip covers its root. */
function lineStart(seat: (typeof CHIP_SEATS)[number], rtl: boolean) {
  const fromStart = seat.inset + 4;
  const x = seat.side === "start" ? fromStart : 100 - fromStart;
  return { x: (rtl ? 100 - x : x) * 2, y: seat.y };
}

export function ProfileStage({ chips }: { chips: MessageKey[] }) {
  const { t, dir } = useTranslation();
  const reduced = useReducedMotion();
  const shown = chips.slice(0, CHIP_SEATS.length);
  const seats = (SEAT_PLAN[shown.length] ?? []).map((index) => CHIP_SEATS[index]);
  const rtl = dir === "rtl";

  return (
    <div className="relative size-full">
      {/* The lines are drawn to the centre as each chip lands, so the cluster visibly
          becomes one thing instead of six.

          Same 2:1 viewBox and no `vector-effect` as the route, and for the same reason: a
          `pathLength` dash animation stroked in device space inside a stretched viewBox
          measures its dashes against the wrong length and leaves the line in pieces. */}
      <svg
        aria-hidden
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        className="text-primary-ink/35 absolute inset-0 size-full"
      >
        {shown.map((chip, i) => {
          const from = lineStart(seats[i], rtl);
          return (
            <motion.line
              key={chip}
              x1={from.x}
              y1={from.y}
              x2={rtl ? 200 - CENTRE.x : CENTRE.x}
              y2={CENTRE.y}
              stroke="currentColor"
              strokeWidth="0.7"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: reduced ? 0 : 0.22 + i * 0.09 }}
            />
          );
        })}
      </svg>

      {/* The traveller, at the centre of their own profile. */}
      <motion.span
        aria-hidden
        className="bg-primary absolute size-2.5 rounded-full shadow-[0_0_14px_2px_color-mix(in_srgb,var(--primary)_45%,transparent)]"
        style={{
          insetInlineStart: `${CENTRE.x / 2}%`,
          top: `${CENTRE.y}%`,
          translate: "-50% -50%",
        }}
        animate={reduced ? undefined : { scale: [1, 1.25, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {shown.map((chip, i) => (
        <motion.span
          key={chip}
          /* Wraps rather than clips: a preference the traveller actually chose is never
             worth truncating, and two short lines cost nothing here. */
          className="border-primary/25 bg-primary-soft text-primary-ink absolute max-w-[62%] rounded-full border px-2.5 py-1 text-center text-[0.6875rem] leading-tight font-medium text-balance"
          style={{
            [seats[i].side === "start" ? "insetInlineStart" : "insetInlineEnd"]: `${seats[i].inset}%`,
            top: `${seats[i].y}%`,
            translate: "0 -50%",
          }}
          initial={{ opacity: 0, y: 14, scale: 0.9, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: reduced ? 0.15 : 0.42,
            ease: EASE_OUT,
            delay: reduced ? 0 : i * 0.09,
          }}
        >
          {t(chip)}
        </motion.span>
      ))}

      {shown.length === 0 ? (
        <p className="text-muted-foreground absolute inset-x-0 bottom-2 text-center text-xs">
          {t("generation.understandingSubtitle")}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Phase 2 — candidates reviewed, accepted, rejected                         */
/* ------------------------------------------------------------------------ */

const ROW_HEIGHT = 46;
const VISIBLE_ROWS = SCAN_WINDOW;

/**
 * How long one candidate is on the scanner before its verdict lands — and therefore how
 * long a rejection and its reason stay at full strength before dimming.
 *
 * 430ms rather than 340: at the old pace a rejected row was legible for roughly a third
 * of a second, which is under the threshold at which anyone reads a place name AND the
 * sentence explaining why it lost. The row then holds a second beat at half opacity, so
 * the real readable exposure is ~860ms.
 */
const SCAN_STEP_MS = 430;

/**
 * How far a row has scrolled past the scanner, expressed as opacity.
 *
 * Index 0 is the row being judged and index 1 is the row whose verdict has just landed —
 * both at full strength, because those are the two the reader is actually reading. The
 * old ramp started dimming at index 1, which is precisely where the rejection reason
 * appears.
 */
const ROW_OPACITY = [1, 1, 0.5, 0.24];

function CandidateRow({ candidate, verdict }: { candidate: Candidate; verdict: boolean }) {
  const { t, locale } = useTranslation();
  const rejected = candidate.reject !== null;

  return (
    <div className="flex items-center gap-2.5" style={{ height: ROW_HEIGHT }}>
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-300",
          verdict && !rejected && "border-primary bg-primary text-primary-foreground",
          verdict && rejected && "border-border text-muted-foreground",
          !verdict && "border-primary/40 text-primary-ink",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {verdict ? (
            <motion.span
              key={rejected ? "no" : "yes"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: DURATION.ui, ease: EASE_OUT }}
            >
              {rejected ? (
                <X aria-hidden className="size-3.5" weight="bold" />
              ) : (
                <Check aria-hidden className="size-3.5" weight="bold" />
              )}
            </motion.span>
          ) : (
            <motion.span
              key="scanning"
              className="bg-primary size-1.5 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[0.8125rem] leading-tight font-medium transition-colors duration-300",
            verdict && rejected ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {poiName(candidate.poi, locale)}
        </span>
        {/* The reason is the whole point of a rejection, so it is the one secondary line
            allowed full muted contrast rather than 80% of it.

            Remounted on a key rather than swapped through AnimatePresence: `mode="wait"`
            plays the outgoing category line out BEFORE bringing the reason in, which left
            a rejected row wearing its ✗ next to "Activities & Adventure" for the length of
            an exit. The verdict and the sentence explaining it have to land together. */}
        <span
          className={cn(
            "block truncate text-[0.6875rem] leading-tight",
            verdict && rejected ? "text-muted-foreground" : "text-muted-foreground/70",
          )}
        >
          <motion.span
            key={verdict && candidate.rejectKey ? candidate.rejectKey : candidate.poi.id}
            className="inline-block"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.ui, ease: EASE_OUT }}
          >
            {verdict && candidate.rejectKey
              ? t(candidate.rejectKey)
              : t(`onboarding.interest.${candidate.poi.categories[0]}` as MessageKey)}
          </motion.span>
        </span>
      </span>
    </div>
  );
}

/**
 * The stream. It advances on its own clock and wraps at the end of the feed, so a backend
 * that takes twelve seconds shows twelve seconds of real review rather than a frozen list.
 */
export function CandidateStage({ profile }: { profile: TripProfile }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const feed = useMemo(() => candidateFeed(profile), [profile]);
  const total = useMemo(() => reviewedCount(profile), [profile]);

  /*
   * The window starts FULL, not empty.
   *
   * Starting at zero meant the stage opened on a blank card and took four steps — 1.7s of
   * a phase whose floor is 1.3s — to fill, so under a quick backend or reduced motion the
   * reader saw one dimmed row and no verdict at all. Beginning at the far edge of the
   * window means the first painted frame already carries three judged candidates, and
   * because the feed spaces its rejections within SCAN_WINDOW, one of them is a rejection
   * with its reason.
   */
  const [cursor, setCursor] = useState(VISIBLE_ROWS - 1);

  useEffect(() => {
    if (feed.length === 0) return;
    const id = setInterval(() => setCursor((n) => n + 1), reduced ? SCAN_STEP_MS * 2 : SCAN_STEP_MS);
    return () => clearInterval(id);
  }, [feed.length, reduced]);

  if (feed.length === 0) return null;

  /* A window of rows ending on the one currently being scanned. Indices are absolute so
     the wrap around the end of the feed is invisible. */
  const window = Array.from({ length: VISIBLE_ROWS }, (_, i) => cursor - (VISIBLE_ROWS - 1) + i);

  return (
    <div className="flex size-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-x-0 bottom-0">
          {window.map((index) => {
            if (index < 0) return <div key={index} style={{ height: ROW_HEIGHT }} />;
            const candidate = feed[index % feed.length];
            const age = cursor - index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{
                  opacity: ROW_OPACITY[Math.min(age, ROW_OPACITY.length - 1)],
                  y: 0,
                  filter: "blur(0px)",
                }}
                transition={{ duration: reduced ? 0.12 : 0.3, ease: EASE_OUT }}
              >
                <CandidateRow candidate={candidate} verdict={age > 0} />
              </motion.div>
            );
          })}
        </div>
        {/* Older rows dissolve upward instead of being clipped by a hard edge. */}
        <div
          aria-hidden
          className="from-surface pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b to-transparent"
        />
      </div>

      <p className="text-muted-foreground border-border/60 mt-1 flex items-center gap-1.5 border-t pt-2 text-[0.6875rem]">
        <MapPinSimpleArea aria-hidden className="text-primary-ink size-3.5" weight="fill" />
        {t("generation.reviewed", { count: total })}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Phase 3 — the shortlist, scored                                           */
/* ------------------------------------------------------------------------ */

/**
 * Counts to `to` over half a second, then stops. Eased out, never sprung: a score that
 * overshoots and settles back has told the reader a number that was not true.
 *
 * The hook holds *progress*, not the value, so the number is derived on render — which is
 * what lets reduced motion short-circuit to the final figure without an effect writing it.
 */
function useScoreCountUp(to: number, delayMs: number, enabled: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const linear = Math.min(1, Math.max(0, (now - start) / 520));
      setProgress(1 - Math.pow(1 - linear, 3));
      if (linear < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [delayMs, enabled]);

  return enabled ? Math.round(to * progress) : to;
}

function MatchRow({
  index,
  name,
  score,
  tags,
  best,
}: {
  index: number;
  name: string;
  score: number;
  tags: MessageKey[];
  best: boolean;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const delay = reduced ? 0 : index * 0.11;
  const shown = useScoreCountUp(score, delay * 1000 + 120, !reduced);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.12 : 0.34, ease: EASE_OUT, delay }}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-2 py-1",
        best && "bg-primary-soft/70 ring-primary/20 ring-1",
      )}
    >
      {/* The emphasis is a ring and a tint; this is the same claim, said out loud. */}
      {best ? <span className="sr-only">{t("generation.bestFit")}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] leading-tight font-medium">{name}</p>
        <div className="mt-1 flex gap-1 overflow-hidden">
          {tags.map((tag, i) => (
            <motion.span
              key={tag}
              className="border-border text-muted-foreground shrink-0 rounded-full border px-1.5 py-px text-[0.625rem] leading-4 whitespace-nowrap"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: reduced ? 0.1 : 0.24,
                ease: EASE_OUT,
                delay: delay + 0.22 + i * 0.07,
              }}
            >
              {t(tag)}
            </motion.span>
          ))}
        </div>
      </div>
      <p className="text-primary-ink shrink-0 text-[0.8125rem] font-bold tabular-nums">
        {shown}
        <span className="text-primary-ink/60 text-[0.625rem]">%</span>
      </p>
    </motion.div>
  );
}

export function MatchStage({ trip }: { trip: Trip }) {
  const { locale } = useTranslation();
  const matches = useMemo(() => stopMatches(trip), [trip]);
  /* One row carries the emphasis, and ties resolve to the earliest — two highlighted
     "best" rows is not an emphasis, it is a colour. */
  const top = Math.max(...matches.map((match) => match.score));
  const best = matches.findIndex((match) => match.score === top);

  return (
    <div className="flex size-full flex-col justify-center gap-0.5">
      {matches.map((match, index) => (
        <MatchRow
          key={match.stop.id}
          index={index}
          name={poiName(match.stop.poi, locale)}
          score={match.score}
          tags={match.tags}
          best={index === best}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Phase 4 — the day, drawn                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Four seats for four stops, in percentages of the route field.
 *
 * The path crosses the field once and never doubles back on itself: x increases at every
 * step, so the eye can trace 1 → 2 → 3 → 4 without deciding which way to go. The single
 * gentle rise between 2 and 3 is what stops it reading as a chart.
 *
 * These were four points with two hard reversals, which Catmull-Rom answers by
 * overshooting the turn — the line visibly shot past stop 2 before coming back.
 */
const ROUTE_SEATS = [
  { x: 12, y: 26 },
  { x: 38, y: 54 },
  { x: 63, y: 44 },
  { x: 88, y: 76 },
] as const;

/**
 * The SVG's own coordinate space.
 *
 * 200 × 100 rather than 100 × 100, because the route field renders at roughly 2:1 on
 * every phone the product targets (its height is fixed by STAGE_HEIGHT; only its width
 * moves, 341–396px). Matching the aspect means the viewBox transform is very nearly
 * uniform — which is the whole fix.
 *
 * THE BUG THIS REPLACES. The path was drawn in a 100 × 100 box stretched to ~356 × 184 by
 * `preserveAspectRatio="none"` and stroked with `vectorEffect="non-scaling-stroke"`.
 * Motion animates `pathLength` by declaring `pathLength="1"` and animating a dash pattern
 * — but `non-scaling-stroke` applies dashes in DEVICE space, while the `pathLength`
 * normalisation is declared in USER space. Under a 3.6:1 non-uniform stretch the two
 * disagree by the stretch factor, so the dash cycle repeats along the path instead of
 * ending: a stroke, a gap, then a second detached stroke, with stop 3 stranded in the
 * gap. It reproduced at every width and in both text directions because it is geometry,
 * not timing.
 *
 * With a near-uniform transform and no `non-scaling-stroke`, dash lengths and path length
 * are measured in the same space and the reveal is a single continuous pen stroke.
 */
const VIEW_W = 200;
const VIEW_H = 100;
const sx = (x: number) => (x / 100) * VIEW_W;
const sy = (y: number) => (y / 100) * VIEW_H;

/** Catmull-Rom through the seats. A route bends; a polyline is a constellation. */
function smoothPath(points: readonly { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const p = points.map((point) => ({ x: sx(point.x), y: sy(point.y) }));
  const d = [`M ${p[0].x} ${p[0].y}`];
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d.push(`C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

const ROUTE_PATH = smoothPath(ROUTE_SEATS);

/** How long the pen takes to reach each stop, as a fraction of the whole draw. */
const ROUTE_ARRIVALS = (() => {
  const lengths = ROUTE_SEATS.slice(1).map((seat, i) =>
    Math.hypot(sx(seat.x) - sx(ROUTE_SEATS[i].x), sy(seat.y) - sy(ROUTE_SEATS[i].y)),
  );
  const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
  let run = 0;
  return [0, ...lengths.map((length) => (run += length) / total)];
})();

const ROUTE_DRAW_SECONDS = 1.0;

/**
 * The mini route. Four mint discs with dark numerals — the exact mark `/trip` puts on its
 * map — joined by a line that draws itself once, in the real order of the real stops.
 *
 * The optimisation notes cycle above it, one at a time. Each is only shown because it is
 * true of this trip (see `optimisationNotes`).
 */
export function RouteStage({ trip, settling }: { trip: Trip; settling: boolean }) {
  const { t, locale } = useTranslation();
  const reduced = useReducedMotion();
  const notes = useMemo(() => optimisationNotes(trip), [trip]);
  const [note, setNote] = useState(0);

  useEffect(() => {
    if (notes.length < 2) return;
    const id = setInterval(() => setNote((n) => n + 1), 620);
    return () => clearInterval(id);
  }, [notes.length]);

  return (
    <div className="flex size-full flex-col">
      <div className="relative flex-1">
        <svg
          aria-hidden
          data-testid="route-canvas"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {/* One path, one pen. There is deliberately no second <path> here: the route is
              a single journey, so anything that could render as a second stroke is a bug
              waiting to be screenshotted. */}
          <motion.path
            data-testid="route-path"
            d={ROUTE_PATH}
            fill="none"
            className="stroke-primary-ink"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0.5 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduced ? 0.15 : ROUTE_DRAW_SECONDS, ease: "easeInOut" }}
          />
        </svg>

        {/* Each stop lands as the pen reaches it, so the line and the markers read as one
            movement rather than two animations that happen to share a card. */}
        {trip.stops.map((stop, i) => {
          const seat = ROUTE_SEATS[i];
          if (!seat) return null;
          const arrival = reduced ? 0 : (ROUTE_ARRIVALS[i] ?? 0) * ROUTE_DRAW_SECONDS;
          return (
            <motion.div
              key={stop.id}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `${seat.x}%`, top: `${seat.y}%`, translate: "-50% -50%" }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: settling ? 1.05 : 1 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 24,
                mass: 0.7,
                delay: arrival,
              }}
            >
              <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-full text-[0.6875rem] font-bold tabular-nums shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_30%,transparent)]">
                {stop.order}
              </span>
              <motion.span
                className="text-muted-foreground text-[0.5625rem] leading-none tabular-nums"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28, ease: EASE_OUT, delay: arrival + 0.14 }}
              >
                {stop.arrivalTime}
              </motion.span>
            </motion.div>
          );
        })}
      </div>

      {/* One claim at a time, in the same place. A stack of them would be a changelog. */}
      <div className="border-border/60 mt-1 flex h-7 items-center justify-center border-t">
        <AnimatePresence mode="wait">
          <motion.p
            key={notes[note % notes.length]}
            className="text-primary-ink flex items-center gap-1.5 text-[0.6875rem] font-medium"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DURATION.ui, ease: EASE_OUT }}
          >
            <Check aria-hidden className="size-3" weight="bold" />
            {t(notes[note % notes.length])}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="sr-only">
        {trip.stops.map((stop) => poiName(stop.poi, locale)).join(", ")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Keeps the surface from resizing between stages, and gives the handoff one thing to lift.
 *
 * Three states, and the middle one is the point: working (plain border), ready (the border
 * takes the accent, nothing else moves — this is the frame the reader gets to look at),
 * leaving (a small lift and a fade). Only `handoff` touches opacity, so the ready frame is
 * fully painted for its whole duration.
 */
export function StageSurface({
  phase,
  children,
}: {
  phase: GenerationPhase;
  children: React.ReactNode;
}) {
  const ready = phase === "ready";
  const leaving = phase === "handoff";

  return (
    <motion.div
      data-testid="stage-surface"
      className="bg-surface relative w-full overflow-hidden rounded-2xl border p-3.5"
      style={{ height: STAGE_HEIGHT }}
      animate={{
        scale: leaving ? 1.04 : 1,
        y: leaving ? -8 : 0,
        opacity: leaving ? 0 : 1,
        borderColor: ready || leaving ? "color-mix(in srgb, var(--primary) 50%, transparent)" : "var(--color-border)",
      }}
      transition={{
        default: { type: "spring", stiffness: 190, damping: 28, mass: 0.9 },
        borderColor: { duration: DURATION.navigation, ease: EASE_OUT },
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={ROUTE_PHASES.includes(phase) ? "route" : phase}
          className="size-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.ui, ease: EASE_OUT }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
