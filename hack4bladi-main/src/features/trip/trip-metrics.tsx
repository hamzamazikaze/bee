"use client";

/**
 * The numbers the presenter says out loud. They animate between the before and the after
 * of an adaptation, and they always come from `trip.metrics` — never from arithmetic
 * done here (docs/CONTRACTS.md).
 */
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn, formatDistance, formatDuration, formatRange } from "@/lib/utils";
import { useCountUp } from "./use-count-up";
import { LocalImpact, TrustNote } from "./local-impact";
import { AdaptationBanner } from "./trip-summary";
import type { Trip } from "@/types/trip";

/**
 * Compact result row: the label whispers, the number is read from a metre away.
 *
 * The label gets a fixed two-line box. In English all three fit on one line; in German
 * "Fahrzeit" does and "Budget ca. · MAD" does not, and a label that wraps in only one of
 * three columns pushes that column's number a line lower than its neighbours. Reserving
 * the second line costs 13px and keeps the three figures on one baseline in every
 * language.
 */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground flex min-h-[2.2em] items-start text-[11px] leading-tight text-pretty">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[13px] leading-tight font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}

export function TripMetrics({ trip, className }: { trip: Trip; className?: string }) {
  const { t, locale } = useTranslation();

  const distance = useCountUp(trip.metrics.walkingMeters + trip.metrics.carMeters);
  const moving = useCountUp(trip.metrics.movementMinutes);

  const [costMin, costMax] = trip.metrics.estimatedCostMad;

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <dl className="bg-surface border-border grid grid-cols-3 divide-x divide-border rounded-xl border px-0.5 py-3 [&>div]:px-2.5">
        <Metric label={t("result.distance")} value={`~${formatDistance(distance, locale)}`} />
        <Metric label={t("result.routeTime")} value={`~${formatDuration(moving, locale)}`} />
        <Metric label={`${t("result.budget")} · ${t("common.mad")}`} value={formatRange(costMin, costMax)} />
      </dl>

      {/* What of that budget stays local, and where the four places came from. */}
      <LocalImpact trip={trip} />
      <TrustNote />

      <AdaptationBanner />
    </section>
  );
}
