"use client";

/**
 * Matchmaking, watched rather than waited out.
 *
 *   profile → scan → match → route → handoff → /trip
 *
 * The five phases are a *view* of one real thing: `buildTrip()`. Nothing after "scan" can
 * start until the real trip is in hand, so the shortlist that is scored and the route that
 * is drawn are the day the traveller is about to open — and a slow backend simply leaves
 * the scanner reviewing real places instead of replaying entrances it has already played.
 *
 * There is still no branch that fails to navigate: past TIMEOUTS.tripGenerationMs the
 * locally built day is shown anyway.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TIMEOUTS } from "@/config/app";
import { EASE_OUT, prefersReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cloneGoldenTrip } from "@/data/fixtures";
import { profileChips } from "@/features/home";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { MessageKey } from "@/lib/i18n";
import type { TripProfile } from "@/types/profile";
import type { Trip } from "@/types/trip";
import { buildTrip } from "./build-trip";
import {
  CandidateStage,
  MatchStage,
  ProfileStage,
  ROUTE_PHASES,
  RouteStage,
  StageSurface,
  type GenerationPhase,
} from "./generation-stages";
import {
  GenerationDidYouKnowCard,
  GenerationStatusFooter,
  GenerationSummary,
} from "./generation-panels";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Three tempos for the same choreography, picked from how fast the backend actually
 * answered — a result in 400 ms must not be held behind a cinematic, and a result in
 * twelve seconds must not be padded with one.
 *
 * `scan` is a FLOOR, never a ceiling: that phase ends when generation resolves, however
 * long that takes, and the stream keeps reviewing real places until it does. Every other
 * number is an exact beat, because by then there is nothing left to wait for.
 *
 * `ready` is the one beat that exists for the reader rather than for the work. It is
 * never shortened by a fast backend and never skipped: whatever the backend did, the
 * finished route has to be lookable-at before the screen is allowed to take it away.
 *
 *   full   1.15 + 1.75 + 1.35 + 1.15 + 1.00 + 0.34  ≈ 6.7 s floor
 *   quick  0.85 + 1.30 + 1.10 + 1.00 + 0.95 + 0.30  ≈ 5.5 s
 *   reduced 0.20 + 0.26 + 0.30 + 0.32 + 0.70 + 0.16 ≈ 1.9 s
 */
interface Tempo {
  profile: number;
  scan: number;
  match: number;
  route: number;
  ready: number;
  handoff: number;
}

const TEMPO: Record<"full" | "quick" | "reduced", Tempo> = {
  full: { profile: 1_150, scan: 1_750, match: 1_350, route: 1_150, ready: 1_000, handoff: 340 },
  quick: { profile: 850, scan: 1_300, match: 1_100, route: 1_000, ready: 950, handoff: 300 },
  /* Reduced motion compresses everything that is movement and keeps what is meaning: the
     ready hold keeps most of its length, because "your route is ready" is information,
     not animation. */
  reduced: { profile: 200, scan: 260, match: 300, route: 320, ready: 700, handoff: 160 },
};

const COPY: Record<GenerationPhase, { title: MessageKey; lead: MessageKey }> = {
  profile: { title: "generation.understandingTitle", lead: "generation.understandingSubtitle" },
  scan: { title: "generation.discoveringTitle", lead: "generation.discoveringSubtitle" },
  match: { title: "generation.matchingTitle", lead: "generation.matchingSubtitle" },
  route: { title: "generation.optimizingTitle", lead: "generation.optimizingSubtitle" },
  ready: { title: "generation.readyTitle", lead: "generation.readySubtitle" },
  handoff: { title: "generation.readyTitle", lead: "generation.readySubtitle" },
};

/** The thread back to what the traveller actually gave us. Their words, or none. */
function inspirationOf(profile: TripProfile): string | null {
  if (profile.detectedPlace) return profile.detectedPlace;
  const transcript = profile.transcript?.trim();
  return transcript ? transcript.slice(0, 90) : null;
}

/**
 * One attempt, remounted on retry — which is why nothing here has to reset itself: fresh
 * state comes from the `key`, not from a setState at the top of an effect.
 */
function GenerationRun({
  profile,
  onReady,
  onRetry,
}: {
  profile: TripProfile;
  onReady: (trip: Trip) => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<GenerationPhase>("profile");
  const [trip, setTrip] = useState<Trip | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    /* Kicked off on the first frame: the choreography measures itself against generation,
       never the other way round. */
    let settled = false;
    const generation = Promise.race([
      buildTrip(profile),
      wait(TIMEOUTS.tripGenerationMs).then(() => cloneGoldenTrip()),
    ]);
    void generation.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    void (async () => {
      const reduced = prefersReducedMotion();
      const full = reduced ? TEMPO.reduced : TEMPO.full;
      const quick = reduced ? TEMPO.reduced : TEMPO.quick;

      /* The first beat ends the moment generation answers, and never before `quick` nor
         after `full`. Checking a flag once at the end of a fixed beat — which is what this
         replaced — could only ever compress a result that arrived in the first frame, so
         the compressed tempo was in practice unreachable. */
      const opening = Date.now();
      await Promise.race([generation.catch(() => undefined), wait(full.profile)]);
      const spent = Date.now() - opening;
      if (spent < quick.profile) await wait(quick.profile - spent);
      if (cancelled) return;

      const beat = settled ? quick : full;
      setPhase("scan");

      /* The floor is `beat.scan`; the ceiling is generation itself, however long it takes.
         The candidate stream wraps the real pool while it waits, so the screen is never
         frozen and never shows a place we did not genuinely review. */
      let built: Trip;
      try {
        [built] = await Promise.all([generation, wait(beat.scan)]);
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled) return;

      /* From here everything on screen is the real day. */
      setTrip(built);
      setPhase("match");
      await wait(beat.match);
      if (cancelled) return;

      setPhase("route");
      await wait(beat.route);
      if (cancelled) return;

      /* READY. Nothing is still being computed and nothing on screen is still moving: the
         four stops are placed, the line is closed, and the headline says so. This beat is
         the product's answer to "did it work", and it is the only one the backend is not
         allowed to shorten — `beat.ready` is spent after generation has already settled. */
      setPhase("ready");
      await wait(beat.ready);
      if (cancelled) return;

      /* Only now does the screen begin to leave, so /trip opens as the thing the traveller
         just watched being finished rather than as the thing that interrupted it. */
      setPhase("handoff");
      await wait(beat.handoff);
      if (cancelled) return;
      onReady(built);
    })();

    return () => {
      cancelled = true;
    };
    // Runs once: the profile is frozen the moment the user taps Build my trip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-xl leading-tight">{t("generation.errorTitle")}</h1>
        <p className="text-muted-foreground max-w-xs text-sm">{t("generation.errorBody")}</p>
        <Button onClick={onRetry}>{t("common.retry")}</Button>
      </div>
    );
  }

  const inspiration = inspirationOf(profile);
  const city = trip?.destination ?? profile.destination ?? t("generation.region");
  const ready = phase === "ready";
  /* Only the handoff dims the screen. `ready` used to share this flag, which is exactly
     how the payoff came to be painted at 15% opacity for a sixth of a second. */
  const leaving = phase === "handoff";
  const chips = profileChips(profile);

  return (
    <motion.div
      data-testid="generation-screen"
      data-phase={phase}
      className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col justify-center gap-3.5 px-4 py-6"
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: leaving ? 0.06 : 0 }}
    >
      {/* Reserved and top-anchored: the headline holds its line whether the lead below it
          runs to one line or two, and neither ever moves the work surface. */}
      <div className="relative h-[4.5rem] w-full text-center">
        <AnimatePresence>
          <motion.div
            key={phase}
            className="absolute inset-x-0 top-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
          >
            <h1 className="font-display text-[1.375rem] leading-tight text-balance">
              {t(COPY[phase].title, { city })}
            </h1>
            <p className="text-muted-foreground mx-auto mt-1 max-w-[18rem] text-[0.8125rem] leading-snug text-pretty">
              {t(COPY[phase].lead, { city })}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* The traveller's own words, kept in sight for the whole run. */}
      {inspiration ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="border-border bg-surface text-muted-foreground mx-auto max-w-full truncate rounded-full border px-3.5 py-1 text-[0.6875rem]"
        >
          {inspiration}
        </motion.p>
      ) : null}

      {/* The hero: whatever the system is doing right now. */}
      <StageSurface phase={phase}>
        {phase === "profile" ? <ProfileStage chips={chips} /> : null}
        {phase === "scan" ? <CandidateStage profile={profile} /> : null}
        {phase === "match" && trip ? <MatchStage trip={trip} /> : null}
        {ROUTE_PHASES.includes(phase) && trip ? (
          <RouteStage trip={trip} settling={leaving} />
        ) : null}
      </StageSurface>

      {/* The one restrained confirmation detail, promoted out of the muted register for
          the ready beat: "4 experiences · 5 h 39 · built around your preferences". */}
      <GenerationSummary trip={trip} emphasised={ready} />
      <GenerationStatusFooter phase={phase} />

      {/* First thing to go on a short phone: it is the least load-bearing block here. */}
      <div className="[@media(max-height:740px)]:hidden">
        <GenerationDidYouKnowCard trip={trip} phase={phase} />
      </div>
    </motion.div>
  );
}

export function ProcessingScreen(props: { profile: TripProfile; onReady: (trip: Trip) => void }) {
  const [attempt, setAttempt] = useState(0);
  return <GenerationRun key={attempt} {...props} onRetry={() => setAttempt((n) => n + 1)} />;
}
