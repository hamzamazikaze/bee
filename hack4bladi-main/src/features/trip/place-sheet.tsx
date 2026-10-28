"use client";

/**
 * Place detail (target frame 07): full-bleed photo, name, category · city, the story,
 * an Information list built only from fields the POI actually has, and one mint CTA.
 * Opened from a timeline row, the map callout's "View stop", or an Explore card; back
 * closes it.
 *
 * `stop`/`trip` are optional because Explore has no itinerary: the rows that need one
 * (suggested time, distance from the previous stop) simply do not appear there. One
 * sheet, two call sites — a second "POI detail" component would drift within a day.
 */
import { useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Heart,
  Hourglass,
  NavigationArrow,
  Path,
  Ticket,
} from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { formatMad, formatMadRange } from "@/lib/i18n/format";
import { navigationUrl } from "@/lib/routing/navigation";
import { poiName } from "@/data/poi-utils";
import { cn, formatDistance, formatDuration } from "@/lib/utils";
import type { Locale, Weekday } from "@/types/common";
import type { POI } from "@/types/poi";
import type { Trip, TripStop } from "@/types/trip";
import { useAppStore } from "@/lib/store";
import { PoiImage } from "./poi-image";
import { ExperienceBlock } from "./experience-block";
import { ProvenanceBadge, ProvenanceNote } from "./provenance-badge";

const ROUND =
  "pressable bg-background/70 border-border text-foreground grid size-10 place-items-center rounded-full border backdrop-blur-sm hover:border-primary";

function priceLabel(poi: POI, free: string, locale: Locale): string | null {
  const [min, max] = poi.approxPriceMad ?? [];
  if (min !== undefined && max !== undefined) {
    if (max === 0) return free;
    return formatMadRange(min, max, locale);
  }
  switch (poi.priceRange) {
    case "free":
      return free;
    case "unknown":
      return null;
    case "300_plus":
      return `${formatMad(300, locale).replace(" ", "+ ")}`;
    default: {
      const [low, high] = poi.priceRange.split("_").map(Number);
      return formatMadRange(low, high, locale);
    }
  }
}

/**
 * The entry fee to charge, as a display string — or null when the place is free or its
 * price is unknown, i.e. when there is nothing to pay for. Drives the in-app booking CTA.
 */
function payAmount(poi: POI, locale: Locale): string | null {
  const [min, max] = poi.approxPriceMad ?? [];
  if (max !== undefined) return max === 0 ? null : formatMadRange(min ?? 0, max, locale);
  switch (poi.priceRange) {
    case "free":
    case "unknown":
      return null;
    case "300_plus":
      return formatMad(300, locale).replace(" ", "+ ");
    default: {
      const [low, high] = poi.priceRange.split("_").map(Number);
      return formatMadRange(low, high, locale);
    }
  }
}

function hoursLabel(poi: POI, closed: string): string | null {
  if (!poi.openingHours) return null;
  const today = new Date().getDay() as Weekday;
  const windows = poi.openingHours.weekly[today] ?? [];
  if (windows.length === 0) return closed;
  return windows.map((w) => `${w.open} – ${w.close}`).join(", ");
}

export function PlaceSheet({
  poi,
  trip = null,
  stop = null,
  open,
  onClose,
  action,
}: {
  poi: POI | null;
  trip?: Trip | null;
  stop?: TripStop | null;
  open: boolean;
  onClose: () => void;
  /** An extra CTA above Navigate — Explore uses it to enter the build flow. */
  action?: ReactNode;
}) {
  const { t, locale } = useTranslation();
  const localized = useLocalized();
  const savedPoiIds = useAppStore((state) => state.savedPoiIds);
  const toggleSaved = useAppStore((state) => state.toggleSaved);
  const saved = poi ? savedPoiIds.includes(poi.id) : false;

  /* In-app booking, MVP preview. The price is real; the charge is not — this demonstrates
     the service (pay a place's entry from the app) without a payment provider or a single
     card field. `paidId` is keyed by POI so the state resets as the sheet moves place. */
  const [paidId, setPaidId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const payable = poi ? payAmount(poi, locale) : null;
  const paid = poi ? paidId === poi.id : false;

  function pay() {
    if (!poi || paid || paying) return;
    setPaying(true);
    const id = poi.id;
    window.setTimeout(() => {
      setPaidId(id);
      setPaying(false);
    }, 700);
  }

  const arriveBy = stop && trip ? trip.segments.find((s) => s.toStopId === stop.id) ?? null : null;

  const rows = poi
    ? [
        { icon: Clock, label: t("place.openHours"), value: hoursLabel(poi, t("place.closedToday")) },
        { icon: Ticket, label: t("place.entryPrice"), value: priceLabel(poi, t("place.free"), locale) },
        {
          icon: Hourglass,
          label: t("place.suggestedTime"),
          value: stop ? formatDuration(stop.durationMinutes, locale) : null,
        },
        {
          icon: Path,
          label: t("place.distanceFromPrevious"),
          value: arriveBy
            ? `${formatDistance(arriveBy.distanceMeters, locale)} · ${formatDuration(arriveBy.durationMinutes, locale)}`
            : null,
        },
      ].filter((row) => row.value)
    : [];

  function navigate() {
    if (!poi) return;
    const url = navigationUrl(
      poi.coordinates,
      arriveBy?.mode ?? "walking",
      typeof navigator === "undefined" ? "" : navigator.userAgent,
      poiName(poi, locale),
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Drawer.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="app-anchored z-40 bg-black/45" />
        <Drawer.Content
          className="bg-background border-border fixed z-50 mx-auto flex max-h-[92%] flex-col overflow-hidden rounded-t-2xl border-t outline-none [&::after]:hidden"
          style={{
            insetInline: 0,
            width: "var(--app-w)",
            maxWidth: "100%",
            bottom: "var(--app-inset-block)",
          }}
          aria-describedby={undefined}
        >
          {poi && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="relative aspect-[4/3] w-full">
                <PoiImage
                  key={poi.id}
                  poi={poi}
                  width={390}
                  height={292}
                  className="washed h-full w-full object-cover"
                />
                <div
                  className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                  <button type="button" onClick={onClose} aria-label={t("common.back")} className={ROUND}>
                    <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden  weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSaved(poi.id)}
                    aria-pressed={saved}
                    aria-label={t("place.save")}
                    className={cn(ROUND, saved && "text-primary-ink")}
                  >
                    <Heart className={cn("size-5", saved && "fill-current")} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="px-4 pt-1">
                <Drawer.Title className="font-display text-2xl leading-tight">
                  {poiName(poi, locale)}
                </Drawer.Title>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t(`onboarding.interest.${poi.categories[0]}`)} · {poi.city}
                </p>

                {/* Third in the hierarchy, and deliberately: name, then what this place is,
                    then where the app got it. It supports the decision; it does not lead. */}
                <ProvenanceBadge poi={poi} className="mt-2" />

                <p className="text-foreground/85 mt-4 text-sm leading-relaxed text-pretty">
                  {localized(poi.cultural.story)}
                </p>

                {/* Only an experience renders anything here; a place renders null. */}
                <ExperienceBlock poi={poi} />

                {rows.length > 0 && (
                  <section className="mt-5">
                    <p className="eyebrow text-muted-foreground">{t("place.information")}</p>
                    <ul className="divide-border mt-2 divide-y">
                      {rows.map(({ icon: Icon, label, value }) => (
                        <li key={label} className="flex items-center gap-3 py-2.5 text-sm">
                          <Icon className="text-primary-ink size-4 shrink-0" aria-hidden />
                          <span className="text-muted-foreground flex-1">{label}</span>
                          <span dir="ltr" className="font-semibold tabular-nums">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* The sentence behind the badge, directly under the hours and the price —
                    which are exactly the fields it declines to vouch for. Unlabelled: the
                    badge is already up beside the name, and printing it twice in one sheet
                    is the clutter this whole change is meant to avoid. */}
                <ProvenanceNote poi={poi} labelled={false} className="mt-4" />

                {action ? <div className="mt-5">{action}</div> : null}

                {/* Book-and-pay from the app: one of the services the product offers. MVP
                    preview — the amount is the place's real entry fee, the payment is
                    mocked (no provider, no card field), and the paid state resets per place. */}
                {payable ? (
                  <div className={cn("flex flex-col gap-2", action ? "mt-2.5" : "mt-5")}>
                    {paid ? (
                      <div className="border-primary/30 bg-primary-soft flex items-center gap-2.5 rounded-xl border px-3.5 py-3">
                        <CheckCircle className="text-primary-ink size-5 shrink-0" weight="fill" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="text-primary-ink block text-sm font-semibold">
                            {t("place.paid")} · {payable}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {t("place.bookedNote")}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setPaidId(null)}
                          className="text-muted-foreground shrink-0 text-xs underline underline-offset-2"
                        >
                          {t("place.payCancel")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={pay}
                          disabled={paying}
                          aria-busy={paying}
                          className={cn(
                            buttonVariants({ variant: "primary", size: "lg", block: true }),
                            "disabled:opacity-70",
                          )}
                        >
                          <CreditCard className="size-5" aria-hidden weight="bold" />
                          {paying ? t("place.paying") : t("place.payCta", { price: payable })}
                        </button>
                        <p className="text-muted-foreground text-center text-[11px]">
                          {t("place.payPreview")}
                        </p>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={navigate}
                      className={buttonVariants({ variant: "outline", size: "lg", block: true })}
                    >
                      <NavigationArrow className="size-5" aria-hidden />
                      {t("experience.navigate")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={navigate}
                    className={cn(
                      buttonVariants({ variant: action ? "outline" : "primary", size: "lg", block: true }),
                      "mt-2.5",
                      !action && "mt-5",
                    )}
                  >
                    <NavigationArrow className="size-5" aria-hidden />
                    {t("experience.navigate")}
                  </button>
                )}
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
