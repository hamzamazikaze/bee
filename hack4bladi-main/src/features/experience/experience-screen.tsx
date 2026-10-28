"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, Check, MapPin, NavigationArrow } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { Button, buttonVariants } from "@/components/ui/button";
import { TripMap } from "@/features/map";
import { AdaptSheet, LocalImpact, TripMetrics, TripTimeline } from "@/features/trip";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { poiName } from "@/data/poi-utils";
import { cn, formatDistance, formatDuration } from "@/lib/utils";
import type { TripStop } from "@/types/trip";
import { RewardToast } from "@/features/wallet";
import { CulturalSheet } from "./cultural-sheet";

function ProgressRail({
  stops,
  activeStopId,
  onSelect,
}: {
  stops: TripStop[];
  activeStopId: string | null;
  onSelect: (stopId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ol className="flex items-center gap-1.5">
      {stops.map((stop, index) => {
        const visited = stop.visitState === "visited";
        const active = stop.id === activeStopId;
        return (
          <li key={stop.id} className="flex flex-1 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelect(stop.id)}
              aria-current={active ? "step" : undefined}
              aria-label={t("experience.progress", { current: stop.order, total: stops.length })}
              className={cn(
                "pressable grid size-11 shrink-0 place-items-center rounded-full border text-sm font-semibold transition",
                visited && "border-deep-green bg-deep-green text-deep-green-foreground",
                !visited && active && "border-primary bg-primary text-primary-foreground",
                !visited && !active && "border-border bg-surface text-muted-foreground",
              )}
            >
              {visited ? <Check aria-hidden className="size-5"  weight="bold" /> : stop.order}
            </button>
            {index < stops.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  visited ? "bg-deep-green" : "bg-border",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function ExperienceScreen() {
  const { t, locale } = useTranslation();
  const hydrated = useAppStore((state) => state.hydrated);
  const trip = useAppStore((state) => state.trip);
  const mode = useAppStore((state) => state.mode);
  const activeStopId = useAppStore((state) => state.activeStopId);
  const startTrip = useAppStore((state) => state.startTrip);
  const setActiveStop = useAppStore((state) => state.setActiveStop);
  const adaptation = useAppStore((state) => state.adaptation);
  const markVisited = useAppStore((state) => state.markVisited);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* Landing here directly (a jury clicking around) must behave like Start Trip did. */
  useEffect(() => {
    if (trip && mode !== "experience") startTrip();
  }, [trip, mode, startTrip]);

  /* The store rehydrates in an effect, so the first client paint has no trip. Without
     this the jury sees "No day yet" flash before their running day comes back. */
  if (!hydrated) {
    return <div className="bg-surface-muted h-full w-full animate-pulse" aria-hidden />;
  }

  if (!trip) {
    return (
      <PageShell
      nav
        header={<AppHeader backHref="/" title={t("experience.emptyTitle")} />}
        className="px-5"
      >
        <p className="text-muted-foreground text-sm">{t("experience.emptyBody")}</p>
        <Link href="/" className={cn(buttonVariants({ size: "md" }), "mt-5")}>
          {t("experience.planDay")}
        </Link>
      </PageShell>
    );
  }

  const stops = trip.stops;
  const active = stops.find((stop) => stop.id === activeStopId) ?? stops[0];
  const next = stops.find((stop) => stop.order > active.order) ?? null;
  const allVisited = stops.every((stop) => stop.visitState === "visited");
  const leg = next
    ? trip.segments.find((s) => s.fromStopId === active.id && s.toStopId === next.id)
    : null;
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${active.poi.coordinates.lat},${active.poi.coordinates.lng}`;

  return (
    <PageShell
      header={
        <AppHeader
          backHref="/trip"
          eyebrow={t("experience.title")}
          title={trip.destination}
          action={
            <Link
              href="/passport"
              className="border-border bg-surface text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center rounded-full border px-4 text-xs font-semibold"
            >
              {t("passport.title")}
            </Link>
          }
        />
      }
      /* Q68: once the trip is running, Adapt My Day IS the primary action. It used to
         live only on /trip, so starting the trip made the day impossible to adapt. */
      footer={<AdaptSheet className="w-full" />}
      className="space-y-6 px-5 pb-10"
    >
      <ProgressRail stops={stops} activeStopId={active.id} onSelect={setActiveStop} />

      {/* The map is a map here: the active stop's card sits right under it, so the
          callout would show the same title and Navigate twice above the fold. */}
      <TripMap
        trip={trip}
        activeStopId={active.id}
        onSelectStop={setActiveStop}
        stopCard={false}
        className="aspect-[16/10]"
      />

      {/* Adapt is the primary action here (Q68), so its result has to be visible here
          too: the rewritten numbers, the before/after headline and Undo. Hidden until
          the day is actually adapted, so a running trip stays uncluttered. */}
      {adaptation?.applied ? <TripMetrics trip={trip} /> : null}

      <motion.section
        key={active.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <MediaCard
          src={active.poi.media.heroImage}
          fallbackSrc={active.poi.media.fallbackImage}
          alt={poiName(active.poi, locale)}
          ratio="wide"
          scrim
          scrimStrength="strong"
          overlay={
            <div className="flex h-full flex-col justify-between p-4">
              <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-full text-sm font-bold">
                {active.order}
              </span>
              <div>
                <p className="text-primary-ink eyebrow">
                  {active.visitState === "visited"
                    ? t("experience.doneStop")
                    : t("experience.currentStop")}
                </p>
                <h2 className="font-display text-2xl leading-tight text-white">
                  {poiName(active.poi, locale)}
                </h2>
              </div>
            </div>
          }
        />

        <p className="text-muted-foreground mt-3 text-sm">
          {t("experience.arriveAt", { time: active.arrivalTime })} ·{" "}
          {t("experience.stayFor", { duration: formatDuration(active.durationMinutes, locale) })}
        </p>

        {/* One filled action per screen: Adapt my day, in the footer. The cultural layer
            stays the widest, most visible control here — as the outlined secondary, so
            it never competes with the primary. Navigate and Visited are tertiary. */}
        <Button
          variant="outline"
          size="lg"
          block
          className="border-primary/50 text-primary-ink pressable mt-4"
          onClick={() => setSheetOpen(true)}
        >
          <BookOpen aria-hidden className="size-5" />
          {t("experience.readStory")}
        </Button>
        <div className="mt-2 flex gap-2">
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: "soft", size: "sm" }), "pressable flex-1")}
          >
            <NavigationArrow aria-hidden className="size-4" />
            {t("experience.navigate")}
          </a>
          <Button
            variant="soft"
            size="sm"
            className="pressable flex-1"
            disabled={active.visitState === "visited"}
            onClick={() => markVisited(active.id)}
          >
            <Check aria-hidden className="size-4"  weight="bold" />
            {active.visitState === "visited"
              ? t("experience.doneStop")
              : t("experience.markVisited")}
          </Button>
        </div>
      </motion.section>

      {allVisited ? (
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border-primary/30 bg-primary-soft rounded-xl border p-5 text-center"
        >
          <h3 className="font-display text-2xl">{t("experience.completed")}</h3>
          <p className="text-foreground/75 mt-1 text-sm text-pretty">
            {t("experience.completedBody")}
          </p>
          {/* The other half of the reward: the coins are the traveller's, this is the
              city's. Renders only when the finished day actually had a paid local stop. */}
          <LocalImpact trip={trip} className="mt-4 text-start" />
          <Link href="/passport" className={cn(buttonVariants({ size: "md" }), "mt-4")}>
            {t("experience.openPassport")}
          </Link>
        </motion.section>
      ) : next ? (
        <section>
          <SectionTitle title={t("experience.nextStop")} />
          <button
            type="button"
            onClick={() => setActiveStop(next.id)}
            className="pressable mt-3 flex w-full items-center gap-3 text-start"
          >
            <MediaCard
              src={next.poi.media.heroImage}
              fallbackSrc={next.poi.media.fallbackImage}
              alt=""
              ratio="square"
              className="w-16 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{poiName(next.poi, locale)}</span>
              <span className="text-muted-foreground block text-xs">
                {t("experience.arriveAt", { time: next.arrivalTime })}
                {leg
                  ? ` · ${formatDistance(leg.distanceMeters, locale)} ${t(
                      leg.mode === "car" ? "common.car" : "common.walking",
                    )} · ${formatDuration(leg.durationMinutes, locale)}`
                  : ""}
              </span>
            </span>
            <MapPin aria-hidden className="text-muted-foreground size-4 shrink-0" />
          </button>
        </section>
      ) : null}


      <section>
        <SectionTitle title={t("experience.timelineTitle")} className="mb-3" />
        <TripTimeline trip={trip} activeStopId={active.id} onSelectStop={setActiveStop} />
      </section>

      <CulturalSheet
        stop={active}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onVisited={markVisited}
      />

      {/* Coins earned, said once and quietly. Clears itself. */}
      <RewardToast />
    </PageShell>
  );
}
