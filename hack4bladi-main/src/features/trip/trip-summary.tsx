"use client";

/**
 * The top of `/trip`: who, what shape, how much — in about 150px.
 *
 * What this replaced: a 32px title, a 128px hero photo, a three-column boxed metric card,
 * a two-line trust paragraph and a green local-impact panel. Five bordered blocks, ~330px,
 * all of it above the map — so the itinerary the user had just generated started below
 * two scrolls. Everything survives; almost none of it keeps a box. Typography does the
 * hierarchy (Airbnb's move, not a dashboard's), the photo shrinks to a thumbnail beside
 * the destination, and the two claims that need substantiating — the local-impact figure
 * and where the places come from — keep their numbers on the screen and put their
 * evidence one tap away.
 */
import { useState } from "react";
import { ArrowCounterClockwise, SealCheck, Sparkle, Storefront } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/bottom-sheet";
import { poiName } from "@/data/poi-utils";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { cn, formatDistance, formatDuration, formatRange } from "@/lib/utils";
import { PoiImage } from "./poi-image";
import { useCountUp } from "./use-count-up";
import { dayWindow, localImpact } from "./trip-insights";
import { provenanceSummary, tripProvenance } from "./provenance";
import { ProvenanceBadge } from "./provenance-badge";
import type { WeatherSummary } from "@/types/experience";
import type { Trip } from "@/types/trip";

/**
 * Where am I going, and what kind of day is this — answered in one block.
 *
 * The thumbnail is the whole of the photography budget up here. A 128px hero answered
 * neither question any better than 64px does, and it cost the map a third of its height.
 */
export function TripHeader({
  trip,
  weather,
  className,
}: {
  trip: Trip;
  weather?: WeatherSummary | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const day = dayWindow(trip);

  /* The day's own character, from the trip it was built for — never a generic "1 day". */
  const vibe = trip.vibe[0] ?? trip.profile.interests[0] ?? null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-primary-ink eyebrow">{t("result.eyebrow")}</p>
        {weather && (
          <span className="bg-surface border-border text-muted-foreground shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
            {weather.temperatureC}° · {localized(weather.label)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3.5">
        <PoiImage
          key={trip.stops[0].poi.id}
          poi={trip.stops[0].poi}
          width={128}
          height={128}
          className="washed border-border size-16 shrink-0 rounded-2xl border object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display truncate text-[26px] leading-[1.15]">{trip.destination}</h1>
          {/* Wraps rather than truncates: "09:30 → 15:00 · Culture & Herita…" told the
              user the time and then cut off the one word that says what kind of day it
              is. Two short lines beat one clipped one. */}
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 text-[13px] leading-snug">
            <span className="tabular-nums">
              {day.start} → {day.end}
            </span>
            {vibe ? (
              <>
                <span className="text-border" aria-hidden>
                  ·
                </span>
                <span>{t(`onboarding.interest.${vibe}`)}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * How long, how far, how much — and how much of it stays here.
 *
 * One card, two tiers: the three numbers that describe the day, and under a hairline the
 * money — what it costs and how much of that stays in local hands. It spent a while as
 * two runs of dot-separated 13px text, which fits in less height and is read by nobody:
 * everything on the screen was the same size, so nothing on it was a fact.
 *
 * The numbers still count up when an adaptation rewrites them, because watching 6.4 km
 * become 2.1 km is the point of Less Walking; and the local-impact figure is still
 * `localImpact(trip)` to the dirham, with its per-stop breakdown behind the chip.
 */
export function TripMeta({ trip, className }: { trip: Trip; className?: string }) {
  const { t, locale } = useTranslation();

  const distance = useCountUp(trip.metrics.walkingMeters + trip.metrics.carMeters);
  const moving = useCountUp(trip.metrics.movementMinutes);
  const [costMin, costMax] = trip.metrics.estimatedCostMad;

  return (
    <div
      className={cn(
        "border-border bg-surface/70 flex flex-col overflow-hidden rounded-2xl border",
        className,
      )}
    >
      {/* Three numbers, each with the word that says what it is. The same facts used to
          run together as one 13px dot-separated sentence — "4 stops · ~3.1 km · ~40 min
          travel" — which reads as a caption, not as the shape of a day. Labels below
          values, hairlines between: legible at a glance, still one row tall. */}
      <div className="grid grid-cols-3 [&>*+*]:border-s [&>*+*]:border-border">
        <Stat value={String(trip.stops.length)} label={t("result.stops")} />
        <Stat value={`~${formatDistance(distance, locale)}`} label={t("result.distance")} />
        <Stat value={`~${formatDuration(moving, locale)}`} label={t("trip.travelTime")} />
      </div>

      <div className="border-border flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t px-3 py-2.5">
        {/* The label earns its place: on a day whose whole cost reaches local hands the
            two figures are the same number, and unlabelled they read as a duplication. */}
        <p className="text-muted-foreground text-[13px]">
          {t("result.budget")}{" "}
          <span className="text-foreground font-semibold tabular-nums">
            {formatRange(costMin, costMax)} {t("common.mad")}
          </span>
        </p>
      </div>
    </div>
  );
}

/** One cell of the facts strip: the number first, the word under it. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <p className="flex min-w-0 flex-col items-center gap-1 px-2 py-2.5 text-center">
      <span className="text-[15px] leading-none font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground truncate text-[10px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </span>
    </p>
  );
}

/**
 * The evidence behind the two quiet claims: where the money goes, and where the places
 * came from.
 *
 * Both used to sit in the primary flow — a green panel and a two-line paragraph — which
 * gave the product's trust story prime vertical real estate on the one screen where the
 * user wants the itinerary. The claims stay (a figure on the metadata row, a link at the
 * end of the day); the justification lives here, where someone who doubts it will look.
 */
function ProvenanceSheet({
  trip,
  open,
  onClose,
}: {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const impact = localImpact(trip);
  const summary = provenanceSummary(tripProvenance(trip));

  return (
    <BottomSheet open={open} onClose={onClose} title={t("trip.provenanceTitle")}>
      <div className="flex flex-col gap-5">
        {impact && (
          <section className="border-primary/25 bg-primary-soft overflow-hidden rounded-2xl border">
            {/* The claim, as a figure rather than as a sentence with a number in it. It
                is the one number in this sheet anybody came to check. */}
            <div className="flex flex-col gap-1 p-4">
              <p className="text-primary-ink flex items-center gap-1.5 eyebrow">
                <Storefront aria-hidden className="size-3.5" weight="fill" />
                {t("trip.impactTitle")}
              </p>
              <p className="text-primary-ink font-display text-3xl leading-none tabular-nums">
                ≈{impact.totalMad} {t("common.mad")}
              </p>
              <p className="text-muted-foreground text-[13px] leading-snug text-pretty">
                {t("trip.impactLine", { total: impact.totalMad })}
              </p>
            </div>

            {/* The receipt. It used to be 11px grey lines inside the same block as the
                claim, which is where you put something you would rather nobody read. */}
            <div className="border-primary/20 bg-background/40 border-t px-4 py-3">
              <p className="text-muted-foreground eyebrow">{t("trip.impactBreakdown")}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {impact.lines.map((line) => (
                  <li key={line.poi.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{poiName(line.poi, locale)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {line.mad} {t("common.mad")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* The heading is derived from the stops rather than asserted over them. It used
            to read "Verified places" on every day ever built, with a filled shield beside
            every row — including a day the guide had authored itself, whose coordinates
            came from a model. The data always knew better (`POI.verification`); nothing
            read it. See ./provenance.ts. */}
        <section>
          <h3 className="text-muted-foreground flex items-baseline justify-between gap-3 eyebrow">
            {t(summary.key, summary.params)}
            <span className="shrink-0 text-[11px] font-semibold tabular-nums">
              {trip.stops.length}
            </span>
          </h3>
          <p className="text-muted-foreground mt-1.5 text-[13px] leading-snug text-pretty">
            {t("trip.trustLine")}
          </p>

          {/* Name on its own line, coordinates under it. Side by side, the numbers won —
              "Cité Portugaise de …" was clipped so that eleven characters of latitude
              could sit at full width, which inverts what a traveller is checking. */}
          <ul className="border-border divide-border mt-3 divide-y rounded-2xl border">
            {trip.stops.map((stop) => (
              <li key={stop.id} className="px-3.5 py-3">
                <p className="text-[13px] leading-snug font-semibold text-pretty">
                  {poiName(stop.poi, locale)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                  {stop.poi.coordinates.lat.toFixed(4)}, {stop.poi.coordinates.lng.toFixed(4)}
                </p>
                {/* Under the numbers it qualifies, not above the name it does not. */}
                <ProvenanceBadge poi={stop.poi} className="mt-1.5" />
              </li>
            ))}
          </ul>

          {/* The narrowest correct reading of the word on the badges above. Knowing where
              a place is has never meant knowing whether it is open — and a row of ticks
              beside curated opening hours is exactly the claim we are not making. */}
          <p className="text-muted-foreground mt-3 text-[11px] leading-snug text-pretty">
            {t("trip.provenance.scope")}
          </p>
        </section>
      </div>
    </BottomSheet>
  );
}

/**
 * The trust affordance at the end of the day: a link, not a paragraph.
 *
 * Its label is now counted from the day rather than printed over it — "4 verified places"
 * when that is true, "3 curated · 1 AI" when it is not. The glyph follows the same rule as
 * the badges: a filled seal only for a day we can vouch for end to end, the app's own AI
 * spark the moment one stop came from the guide instead of the dataset.
 */
export function VerifiedLink({ trip, className }: { trip: Trip; className?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const counts = tripProvenance(trip);
  const summary = provenanceSummary(counts);
  const hasAi = counts.aiSuggested > 0;
  const allVerified = counts.verified === counts.total && counts.total > 0;
  const Icon = hasAi ? Sparkle : SealCheck;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "pressable text-muted-foreground hover:text-foreground inline-flex min-h-9 items-center gap-1.5 text-[11px] font-semibold",
          className,
        )}
      >
        <Icon
          aria-hidden
          className={cn("size-3.5", hasAi ? "text-warning" : "text-primary-ink")}
          weight={allVerified && !hasAi ? "fill" : "regular"}
        />
        {t(summary.key, summary.params)}
      </button>
      <ProvenanceSheet trip={trip} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * "Day updated" + Undo. Extracted from `TripMetrics` so `/trip` can carry it as one row
 * without carrying the metric grid `/experience` still uses.
 */
export function AdaptationBanner({ className }: { className?: string }) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const adaptation = useAppStore((state) => state.adaptation);
  const revertAdaptation = useAppStore((state) => state.revertAdaptation);
  const canUndo = useAppStore((state) => state.tripBeforeAdaptation !== null);

  if (!adaptation?.applied) return null;

  return (
    <div
      className={cn(
        "bg-primary-soft border-primary/20 flex items-center gap-3 rounded-xl border px-3 py-2",
        className,
      )}
    >
      <p className="min-w-0 flex-1">
        <span className="text-primary-ink block eyebrow">{t("trip.adaptApplied")}</span>
        <span className="block truncate text-[13px] font-semibold">
          {localized(adaptation.headline)}
        </span>
      </p>
      {canUndo && (
        <button
          type="button"
          onClick={revertAdaptation}
          className="pressable border-primary/30 text-primary-ink hover:bg-surface flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold"
        >
          <ArrowCounterClockwise className="size-3.5" aria-hidden weight="bold" />
          {t("trip.undo")}
        </button>
      )}
    </div>
  );
}
