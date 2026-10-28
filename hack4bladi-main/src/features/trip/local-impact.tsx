"use client";

/**
 * Two quiet claims made where the day is read: where the money goes, and where the places
 * came from.
 *
 * Both exist because the product's two hardest-to-see advantages are exactly these — that
 * a Khotwa day puts cash in a local person's hand, and that the planner's stops are ours
 * rather than a model's. Neither is worth a panel; both are worth a line.
 *
 * Nothing here is decorative and nothing is rounded up. The figure is `localImpact()`,
 * summed from the curated prices of the stops actually in this day, and it does not render
 * at all when the day has no such stop.
 */
import { Storefront, SealCheck } from "@phosphor-icons/react";
import { poiName } from "@/data/poi-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import { formatMad } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { useCountUp } from "./use-count-up";
import { localImpact } from "./trip-insights";
import type { Trip } from "@/types/trip";

export function LocalImpact({ trip, className }: { trip: Trip; className?: string }) {
  const { t, locale } = useTranslation();
  const impact = localImpact(trip);
  /* Hooks before the early return: an adapted day that drops its last experience must not
     change how many hooks this component runs. */
  const total = useCountUp(impact?.totalMad ?? 0);

  if (!impact) return null;

  return (
    <section
      className={cn("border-primary/20 bg-primary-soft rounded-xl border p-3", className)}
    >
      <p className="text-primary-ink flex items-center gap-1.5 eyebrow">
        <Storefront aria-hidden className="size-3.5" weight="fill" />
        {t("trip.impactTitle")}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-pretty">
        {t("trip.impactLine", { total })}
      </p>

      {/* The breakdown, so the number is checkable rather than assertable. It is also the
          whole justification for the claim, which is why there is no explanatory note
          under it — a line saying "counted from the prices" beside the prices is filler on
          a screen where the itinerary is already below the fold. */}
      <ul className="text-muted-foreground mt-2 space-y-0.5 text-[11px]">
        {impact.lines.map((line) => (
          <li key={line.poi.id} className="flex justify-between gap-3">
            <span className="truncate">{poiName(line.poi, locale)}</span>
            <span className="shrink-0 tabular-nums">{formatMad(line.mad, locale)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One line: where the planner's stops come from, and what happens when the guide adds one
 * of its own.
 *
 * It used to end "It never invents a location or a coordinate", which was true of the
 * planner and false of the guide — and it was printed on every day either of them built.
 * The sentence now describes the two paths separately, which is both honest and the more
 * interesting claim. The filled shield went with it: a seal is a claim about provenance,
 * a shield is a claim about safety, and only one of those is ours to make.
 */
export function TrustNote({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p
      className={cn(
        "text-muted-foreground flex items-start gap-1.5 text-[11px] leading-snug text-pretty",
        className,
      )}
    >
      <SealCheck aria-hidden className="text-primary-ink mt-px size-3.5 shrink-0" />
      <span>{t("trip.trustLine")}</span>
    </p>
  );
}
