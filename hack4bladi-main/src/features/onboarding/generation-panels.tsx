"use client";

/**
 * Everything under the work surface: where we are, and one card that is allowed to be
 * secondary.
 *
 * The three-line checklist this replaced said the same thing on every run and moved twice
 * in six seconds. A stage indicator has to answer "is it still working" continuously, so
 * it is a live row — the current stage named, the ones behind it ticked, the ones ahead
 * of it dim — with the brand in it at the size the brand deserves here.
 */

import { AnimatePresence, motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand";
import { DURATION, EASE_OUT } from "@/components/motion";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { MessageKey } from "@/lib/i18n";
import { cn, formatDuration } from "@/lib/utils";
import type { Trip } from "@/types/trip";
import { ROUTE_PHASES, type GenerationPhase } from "./generation-stages";

type WorkingPhase = "profile" | "scan" | "match" | "route";

const STAGE_LABEL: Record<WorkingPhase, MessageKey> = {
  profile: "generation.stepUnderstand",
  scan: "generation.stepDiscover",
  match: "generation.stepMatch",
  route: "generation.stepBuild",
};

const STAGES = Object.keys(STAGE_LABEL) as WorkingPhase[];

/** Ready and handoff are both "the work is done"; only the last working stage indexes. */
function activeStage(phase: GenerationPhase): number {
  const index = STAGES.indexOf(phase as WorkingPhase);
  return index === -1 ? STAGES.length - 1 : index;
}

const DONE: readonly GenerationPhase[] = ["ready", "handoff"];

/**
 * Four dots and one live label.
 *
 * The dots carry position, the label carries meaning, and only the label changes words —
 * so the eye tracks one moving thing instead of re-reading three lines each time a stage
 * flips. `aria-live` announces the label alone, which is the whole of the state.
 */
export function GenerationStatusFooter({ phase }: { phase: GenerationPhase }) {
  const { t } = useTranslation();
  const done = DONE.includes(phase);
  const active = activeStage(phase);

  return (
    <div
      data-testid="generation-status"
      className="bg-surface flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors duration-300"
      style={{ borderColor: done ? "color-mix(in srgb, var(--primary) 50%, transparent)" : "var(--color-border)" }}
    >
      <BrandMark aria-hidden className="size-5 shrink-0 opacity-90" />

      <div className="min-w-0 flex-1">
        {/* The live region is the stable box, not the label inside it: a node that is
            inserted already carrying aria-live is announced inconsistently. */}
        <div className="h-[1.125rem] overflow-hidden" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={done ? "done" : active}
              className="truncate text-[0.8125rem] leading-[1.125rem] font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: DURATION.ui, ease: EASE_OUT }}
            >
              {/* Past tense once the day exists. "Build your route" under a headline
                  saying the route is ready reads as a step still outstanding, however
                  many dots are filled beside it. */}
              {done ? t("generation.stepsDone") : t(STAGE_LABEL[STAGES[Math.max(0, active)]])}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-1.5 flex gap-1" aria-hidden>
          {STAGES.map((stage, index) => (
            <span
              key={stage}
              className={cn(
                "h-[3px] flex-1 rounded-full transition-colors duration-500",
                /* Every stage reads as finished once the day is built — a track still
                   showing three of four filled while the headline says "ready" is the
                   footer arguing with the headline. */
                (done || index < active) && "bg-primary/45",
                !done && index === active && "bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_60%,transparent)]",
                !done && index > active && "bg-border",
              )}
            />
          ))}
        </div>
      </div>

      <span
        aria-hidden
        data-testid="generation-status-mark"
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
          done ? "border-primary bg-primary text-primary-foreground" : "border-primary/40",
        )}
      >
        {done ? (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
          >
            <Check aria-hidden className="size-3" weight="bold" />
          </motion.span>
        ) : (
          <motion.span
            className="bg-primary size-1.5 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </span>
    </div>
  );
}

/**
 * The one line of real numbers, in the same words `/trip` will use for them.
 *
 * Height is reserved so the work surface above never moves when the day arrives.
 */
export function GenerationSummary({
  trip,
  emphasised = false,
}: {
  trip: Trip | null;
  /** The ready beat: this line stops being metadata and becomes the confirmation. */
  emphasised?: boolean;
}) {
  const { t, locale } = useTranslation();
  const parts = trip
    ? [
        t("generation.experiences", { count: trip.stops.length }),
        formatDuration(trip.metrics.totalMinutes, locale),
        t("generation.readyMeta"),
      ]
    : [];

  return (
    <div className="flex h-4 items-center justify-center">
      <AnimatePresence mode="wait">
        {trip ? (
          <motion.p
            key="summary"
            data-testid="generation-summary"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.ui, ease: EASE_OUT }}
            className={cn(
              "truncate text-[0.75rem] transition-colors duration-300",
              emphasised ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {parts.join(" · ")}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Secondary by construction: no border, no card, muted throughout. It carries a regional
 * fact until we have something true and specific to say instead — the first place we
 * actually picked — and it is the first thing to go on a short phone.
 *
 * It waits for the ROUTE stage before naming that place. During matching the shortlist is
 * already listed by name a few pixels above, so switching then made the card repeat the
 * row above it; from the route stage on, the surface shows numbered stops and no names, so
 * the first find is the only place on screen that says which stop is which.
 */
export function GenerationDidYouKnowCard({
  trip,
  phase,
}: {
  trip: Trip | null;
  phase: GenerationPhase;
}) {
  const { t } = useTranslation();
  const named = trip !== null && ROUTE_PHASES.includes(phase);
  const title = named ? t("generation.firstFind") : t("analysis.factTitle");
  const body = named ? trip.stops[0]?.poi.name : t("analysis.fact");

  return (
    <div className="flex h-[3.75rem] w-full flex-col justify-center overflow-hidden px-1 text-start">
      <AnimatePresence mode="wait">
        <motion.div
          key={named ? "trip" : "fact"}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          <p className="text-muted-foreground/70 text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
            {title}
          </p>
          <p className="text-muted-foreground/80 mt-1 line-clamp-2 text-[0.75rem] leading-relaxed">
            {body}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
