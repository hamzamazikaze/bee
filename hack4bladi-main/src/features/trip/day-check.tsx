"use client";

/**
 * "Day check" — the screen saying what it knows, in one line.
 *
 * Everything here is computed from the day itself (see trip-insights.ts), written as a
 * sentence, and where an adapter can really act, fixable in one tap.
 *
 * It used to be a panel: a header, a two-row list, a "show 3 more" control — ~355px of
 * the 696px a 390x844 phone has above the sticky actions, spent on information that is
 * true but almost never urgent. A traveller reading this screen needs *the* thing that
 * is wrong with the day, not the audit. So the audit moved into a sheet and the one
 * highest-priority row stayed on the screen, with its fix still attached to it.
 */
import { useState } from "react";
import {
  CheckCircle,
  Clock,
  CloudRain,
  Footprints,
  Hourglass,
  CaretRight,
  Sparkle,
  Wallet,
  Warning,
  Wind,
} from "@phosphor-icons/react";
import { BottomSheet } from "@/components/bottom-sheet";
import { adapt } from "@/lib/adaptation";
import { revealRouteMap } from "@/features/map";
import { poiName } from "@/data/poi-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { cn, formatDuration } from "@/lib/utils";
import {
  buildInsights,
  interestMatch,
  type HoursIssueKind,
  type InsightTone,
  type TripInsight,
} from "./trip-insights";
import type { WeatherSummary } from "@/types/experience";
import type { Trip } from "@/types/trip";

const ICON: Record<string, typeof Clock> = {
  hours: Clock,
  rain: CloudRain,
  wind: Wind,
  walkingHeavy: Footprints,
  budgetOver: Wallet,
  budgetOk: Wallet,
  matchPartial: Sparkle,
  matchFull: CheckCircle,
  length: Hourglass,
  tooLong: Hourglass,
};

const TONE: Record<InsightTone, string> = {
  warn: "text-warning",
  good: "text-primary-ink",
  info: "text-muted-foreground",
};

/** Module-level so the icon is a stable component, not one created per render. */
function InsightIcon({ insight, className }: { insight: TripInsight; className?: string }) {
  const Icon = ICON[insight.key] ?? ICON[insight.key.split(".")[0]] ?? Sparkle;
  return <Icon className={cn("size-4 shrink-0", TONE[insight.tone], className)} aria-hidden weight="bold" />;
}

/**
 * The day check, as one row and a sheet.
 *
 * The row carries the first insight the builder ranked — warnings sort first, so on a day
 * with a problem this is the problem, and on a clean day it is the quiet confirmation.
 * Everything else is one tap away and nothing is lost.
 */
export function DayCheck({
  trip,
  weather,
  className,
}: {
  trip: Trip;
  weather?: WeatherSummary | null;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const applyAdaptation = useAppStore((state) => state.applyAdaptation);
  const [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const insights = buildInsights({ trip, weather, name: (poi) => poiName(poi, locale) });
  const match = interestMatch(trip);
  const warnings = insights.filter((insight) => insight.tone === "warn").length;
  const lead = insights[0];

  async function runFix(insight: TripInsight) {
    if (!insight.fix || pending) return;
    setPending(insight.id);
    const result = await adapt({ type: insight.fix, trip });
    if (result.applied) {
      applyAdaptation(result);
      /* Same contract as the Adapt sheet: a day that was just rewritten shows itself. */
      setOpen(false);
      revealRouteMap();
    }
    setPending(null);
  }

  /** The interests the day delivers, spelled out — the missing half of "83% match". */
  const interestList = match?.hit
    .map((interest) => t(`onboarding.interest.${interest}`))
    .join(" · ");

  /** The sentence for a row: the builder's key, with the one duration it needs formatted. */
  function sentence(insight: TripInsight) {
    const params =
      insight.id === "length"
        ? {
            ...insight.params,
            duration: formatDuration(Number(insight.params?.minutes ?? 0), locale),
          }
        : insight.params;
    return t(`insight.${insight.key}`, params);
  }

  if (!lead) return null;

  const leadBusy = pending === lead.id;

  return (
    <>
      {/* A contained row, vertically centred. It used to be a bare flex with
          `items-start`, so on a two-line sentence the "View details" label and its caret
          landed beside the FIRST line — reading as an interruption in the middle of the
          sentence ("About 230 MAD to get in, View details › inside your budget."). The
          label now appears only when it has something to add, and the caret does the
          disclosure work on its own. */}
      <div
        className={cn(
          "border-border bg-surface/70 flex items-center gap-1 rounded-2xl border py-1.5 pe-2 ps-2.5",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pressable flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 text-start"
        >
          <InsightIcon insight={lead} />
          {/* Two lines, not one truncated one: the second half of an hours warning is the
              half that tells you what to do about it. */}
          <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug text-pretty">
            {sentence(lead)}
          </span>
          {/* Only when it says something the sentence does not: how many other things
              want looking at. One warning is already the sentence you are reading. */}
          {warnings > 1 && (
            <span className="text-warning bg-warning/10 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {t("insight.needsAttention", { n: warnings })}
            </span>
          )}
          <CaretRight
            aria-hidden
            className="text-muted-foreground size-3 shrink-0 rtl:rotate-180"
            weight="bold"
          />
        </button>

        {lead.fix && (
          <button
            type="button"
            onClick={() => runFix(lead)}
            disabled={pending !== null}
            aria-busy={leadBusy}
            className="pressable border-primary/40 text-primary-ink hover:bg-primary-soft min-h-8 shrink-0 rounded-lg border px-2.5 text-[11px] font-semibold disabled:opacity-50"
          >
            {leadBusy ? t("common.loading") : t("insight.fix")}
          </button>
        )}
      </div>

      {/* The whole audit, on request. Same rows, same fixes, none of the vertical rent. */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("insight.title")}>
        <ul className="divide-border divide-y">
          {insights.map((insight) => {
            const busy = pending === insight.id;
            return (
              <li key={`${insight.id}-${insight.key}`} className="flex items-center gap-3 py-3">
                <InsightIcon insight={insight} />
                <p className="flex-1 text-[13px] leading-snug text-pretty">
                  {sentence(insight)}
                  {insight.key.startsWith("match") && interestList ? (
                    <span className="text-muted-foreground"> {interestList}</span>
                  ) : null}
                </p>

                {insight.fix && (
                  <button
                    type="button"
                    onClick={() => runFix(insight)}
                    disabled={pending !== null}
                    aria-busy={busy}
                    className="pressable border-primary/40 text-primary-ink hover:bg-primary-soft min-h-9 shrink-0 rounded-lg border px-3 text-[11px] font-semibold disabled:opacity-50"
                  >
                    {busy ? t("common.loading") : t("insight.fix")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

/** The hours warning as a timeline badge — same source, said where the stop lives. */
export function HoursBadge({ kind, time }: { kind: HoursIssueKind; time: string }) {
  const { t } = useTranslation();
  return (
    <span className="text-warning mt-1 inline-flex items-center gap-1 text-[11px] font-semibold">
      <Warning className="size-3 shrink-0" aria-hidden weight="fill" />
      {t(`insight.badge.${kind}`, { time })}
    </span>
  );
}
