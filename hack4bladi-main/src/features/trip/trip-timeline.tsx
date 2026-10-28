"use client";

/**
 * The vertical day. Read from three metres away: time, photo, name, duration, and the
 * leg to the next stop with its mode.
 *
 * Selection is two-way with the map through `activeStopId` / `onSelectStop`.
 * Layout is RTL-structural: logical utilities only, and the connector rail is a centred
 * column rather than an absolutely positioned left edge.
 */
import { motion } from "motion/react";
import { Car, Check, Footprints } from "@phosphor-icons/react";
import { riseInView } from "@/components/motion";
import { SectionHeader } from "@/components/section-header";
import { poiName } from "@/data/poi-utils";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { cn, formatDistance, formatDuration } from "@/lib/utils";
import { PoiImage } from "./poi-image";
import { HoursBadge } from "./day-check";
import { stopHoursIssue } from "./trip-insights";
import { ProvenanceBadge } from "./provenance-badge";
import type { PoiProvenance } from "./provenance";
import type { LocalizedText } from "@/types/common";
import type { RouteSegment, Trip, TripStop, VisitState } from "@/types/trip";

/** Module-level so the row's badge prop is a stable reference across renders. */
const AI_ONLY: readonly PoiProvenance[] = ["ai_suggested"];

export interface TripTimelineProps {
  trip: Trip;
  activeStopId: string | null;
  onSelectStop: (stopId: string) => void;
  /** Optional: tapping a row also opens its place detail. */
  onOpenStop?: (stopId: string) => void;
  /** "Day 1 · Casablanca" — omitted when absent. */
  dayLabel?: string;
  /** The one number worth sitting beside the label, e.g. the day's start → end. */
  dayAside?: string;
  className?: string;
}

/** Anchor id so any caller can bring a stop into view: `timeline-<stopId>`. */
export function timelineAnchorId(stopId: string): string {
  return `timeline-${stopId}`;
}

/**
 * Brings a stop's row into view. The map and the timeline were already two-way in state —
 * tapping a pin restyled it and nothing else — so selecting stop 3 on a map that sits above
 * an unscrolled timeline changed a colour and no more. This is the other half of that link:
 * the pin you tapped and the row it belongs to end up on screen together.
 */
export function revealTimelineStop(stopId: string) {
  if (typeof document === "undefined") return;
  const row = document.getElementById(timelineAnchorId(stopId));
  if (!row) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  requestAnimationFrame(() =>
    row.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }),
  );
}

const DOT_STYLE: Record<VisitState, string> = {
  upcoming: "bg-primary",
  current: "bg-primary ring-4 ring-primary/25",
  visited: "bg-primary",
  skipped: "bg-border",
};

/**
 * The rail between two stops reads the leg's mode, exactly like the map line does:
 * walking = dashed Majorelle, car = solid mist. A 0-width box with one logical border, so it
 * is a line in both directions and never a grey block.
 */
function railClass(mode: RouteSegment["mode"] | undefined): string {
  return mode === "car"
    ? "w-0 border-s border-mist/50"
    : "w-0 border-s border-dashed border-primary/60";
}

/** One line under the name: the "why this stop" reason, else the story's first sentence. */
function blurb(stop: TripStop, localized: (text: LocalizedText | undefined) => string): string {
  const reason = localized(stop.reason);
  if (reason) return reason;
  return localized(stop.poi.cultural.story).split(/(?<=[.!?])\s/)[0] ?? "";
}

function StopRow({
  stop,
  active,
  leg,
  onSelect,
}: {
  stop: TripStop;
  active: boolean;
  /** The leg leaving this stop; absent on the last stop, so no rail below it. */
  leg: RouteSegment | undefined;
  onSelect: () => void;
}) {
  const { t, locale } = useTranslation();
  const localized = useLocalized();
  const hours = stopHoursIssue(stop);

  return (
    <div className="flex gap-3">
      {/* The rail: a mint dot, then a thin line down to the leg row. */}
      <div className="flex w-5 shrink-0 flex-col items-center pt-4">
        <span
          className={cn(
            "grid size-3.5 shrink-0 place-items-center rounded-full",
            DOT_STYLE[stop.visitState],
          )}
          aria-hidden
        >
          {stop.visitState === "visited" && <Check className="text-primary-foreground size-2.5"  weight="bold" />}
        </span>
        {leg && <span className={cn("mt-1 flex-1", railClass(leg.mode))} aria-hidden />}
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "pressable flex min-h-16 flex-1 items-center gap-3 rounded-xl border p-2.5 text-start transition",
          active
            ? "border-primary/60 bg-surface"
            : hours
              ? "border-warning/30 hover:bg-surface"
              : "border-transparent hover:bg-surface",
          stop.visitState === "visited" && "opacity-70",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="text-muted-foreground block text-xs font-semibold tabular-nums">
            {stop.arrivalTime}
            {stop.visitState === "current" && (
              <span className="text-primary-ink ms-2 uppercase">
                {t("experience.currentStop")}
              </span>
            )}
          </span>
          <span className="block truncate text-[15px] font-semibold">{poiName(stop.poi, locale)}</span>
          <span className="text-muted-foreground line-clamp-2 text-xs">
            {blurb(stop, localized)}
          </span>
          {/* The plan vs. the opening hours, said on the stop it concerns rather than
              only in the summary above. */}
          {hours && <HoursBadge kind={hours.kind} time={hours.time} />}
          {/* Only the AI state, deliberately. Four "Verified place" chips down a list is
              noise that teaches a reader to skip the row, and the one stop the guide wrote
              itself is precisely the row they should not skip. The full picture is one tap
              away in the place sheet and in the provenance panel. */}
          <ProvenanceBadge
            poi={stop.poi}
            only={AI_ONLY}
            className="mt-1 flex"
          />
        </span>
        <PoiImage
          key={stop.poi.id}
          poi={stop.poi}
          width={60}
          height={60}
          className="washed h-15 w-15 shrink-0 rounded-lg object-cover"
        />
      </button>
    </div>
  );
}

export function TripTimeline({
  trip,
  activeStopId,
  onSelectStop,
  onOpenStop,
  dayLabel,
  dayAside,
  className,
}: TripTimelineProps) {
  const { t, locale } = useTranslation();

  return (
    <div className={cn("flex flex-col", className)}>
      {dayLabel && <SectionHeader label={dayLabel} aside={dayAside} className="mb-3" />}
      <ol className="flex flex-col">
        {trip.stops.map((stop, index) => {
          const leg = trip.segments.find((segment) => segment.fromStopId === stop.id);
          const last = index === trip.stops.length - 1;

          // The reveal: the day cascades in when the day is actually looked at.
          //
          // It used to run on mount, and on /trip the first row sits at y≈953 of an 844px
          // viewport — the whole cascade played, and finished, below the fold. `whileInView`
          // spends it where someone is watching; `once` means scrolling back up never
          // replays it. Keyed by stop, so an adaptation rewrites legs and modes without
          // replaying the entrance.
          return (
            <motion.li
              key={stop.id}
              id={timelineAnchorId(stop.id)}
              className="flex flex-col"
              {...riseInView(index)}
            >
              <StopRow
                stop={stop}
                active={stop.id === activeStopId}
                leg={last ? undefined : leg}
                onSelect={() => {
                  onSelectStop(stop.id);
                  onOpenStop?.(stop.id);
                }}
              />

              {leg && !last && (
                <div className="flex gap-3">
                  <div className="flex w-5 shrink-0 justify-center self-stretch">
                    <span className={cn("self-stretch", railClass(leg.mode))} aria-hidden />
                  </div>
                  <p
                    className={cn(
                      "flex items-center gap-1.5 py-1.5 text-xs",
                      leg.mode === "car" ? "text-mist/80" : "text-muted-foreground",
                    )}
                  >
                    {leg.mode === "car" ? (
                      <Car className="size-3.5" aria-hidden />
                    ) : (
                      <Footprints className="text-primary-ink size-3.5" aria-hidden />
                    )}
                    <span>
                      {leg.mode === "car" ? t("common.car") : t("common.walking")} ·{" "}
                      {formatDistance(leg.distanceMeters, locale)} ·{" "}
                      {formatDuration(leg.durationMinutes, locale)}
                    </span>
                  </p>
                </div>
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
