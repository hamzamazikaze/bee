"use client";

/**
 * The reveal, in the order a traveller actually asks the questions:
 *
 *   where am I going · what shape is this day · how long, how far, how much ·
 *   is anything wrong with it — and then, immediately, the day itself.
 *
 * The screen used to stack a 32px title, a 128px hero photo, a boxed metric grid, a trust
 * paragraph and a ~355px Day check panel above the map: ~600px of the 696px a 390x844
 * phone has above the sticky actions, so the itinerary the user had just generated showed
 * as a 160px sliver of map and nothing else. Everything on that list still exists. Almost
 * none of it still owns a card, and the two claims that need substantiating — the local
 * impact figure, the provenance of the places — keep their number on the screen and put
 * their evidence one tap away.
 *
 * NO DAY MEANS NO DAY. Landing here without having planned one used to fill the store with
 * the golden fixture, so /trip was never empty — which reads, correctly, as mocked data:
 * four monuments already sitting there before anyone asked for anything. The fixture is
 * still the floor for a generation that *fails* (see build-trip), because a traveller who
 * asked for a day should get one. It is not the floor for a traveller who never asked.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandTap, PlayCircle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { rise } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { TripMap } from "@/features/map";
import {
  AdaptSheet,
  AdaptationBanner,
  DayCheck,
  DayGlance,
  PlaceSheet,
  TripHeader,
  TripMeta,
  TripTimeline,
  VerifiedLink,
  dayWindow,
  revealTimelineStop,
} from "@/features/trip";
import { useRoutedTrip, useWeather } from "@/features/trip/use-trip-data";
import { useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function TripPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const hydrated = useAppStore((state) => state.hydrated);
  const trip = useAppStore((state) => state.trip);
  const activeStopId = useAppStore((state) => state.activeStopId);
  const setActiveStop = useAppStore((state) => state.setActiveStop);
  const adaptation = useAppStore((state) => state.adaptation);
  const startTrip = useAppStore((state) => state.startTrip);
  const [placeStopId, setPlaceStopId] = useState<string | null>(null);

  const routedTrip = useRoutedTrip(trip);
  const weather = useWeather(trip);

  /** Place detail (frame 07): from a timeline row, the map callout or the info button. */
  function openPlace(stopId: string) {
    setActiveStop(stopId);
    setPlaceStopId(stopId);
  }

  if (!routedTrip) {
    /* Two different nothings, and they must not look alike. Before hydration we do not yet
       know whether there is a day, so we say nothing; after it, we know there is none and
       say so. Both inside the shell, not instead of it: returning a bare div unmounted the
       tab bar for the length of the route build, so tapping Trip made it blink out. */
    if (!hydrated) {
      return (
        <PageShell nav>
          <div className="bg-surface-muted h-full w-full animate-pulse" aria-hidden />
        </PageShell>
      );
    }

    return (
      <PageShell nav header={<AppHeader title={t("experience.emptyTitle")} />} className="px-5">
        <p className="text-muted-foreground text-sm">{t("trip.emptyBody")}</p>
        <Link href="/onboarding?new" className={cn(buttonVariants({ size: "md" }), "mt-5")}>
          {t("experience.planDay")}
        </Link>
      </PageShell>
    );
  }

  const firstStop = routedTrip.stops[0];
  const placeStop = routedTrip.stops.find((stop) => stop.id === placeStopId) ?? null;
  const day = dayWindow(routedTrip);

  return (
    <PageShell
      nav
      className="pb-4"
      footer={
        /* One filled action. Start trip is the next beat of the demo; Adapt stays a tap
           away as the outline and becomes the primary once the day is running. */
        <div className="flex gap-2">
          <AdaptSheet variant="outline" className="flex-1" />
          <Button
            variant="accent"
            className="flex-1"
            onClick={() => {
              startTrip();
              router.push("/experience");
            }}
          >
            <PlayCircle className="size-4" aria-hidden />
            {t("trip.startTrip")}
          </Button>
        </div>
      }
    >
      {/* The result establishes itself, then the day arrives (M5): the summary rises
          first and the timeline waits until it is scrolled to. Nothing here cascades
          card-by-card — four independent entrances on one screen is a page assembling
          itself, which is a thing to watch rather than a thing to read. */}
      <motion.header {...rise(0)} className="flex flex-col gap-3 px-4 pt-4 pb-4">
        <TripHeader trip={routedTrip} weather={weather} />
        <TripMeta trip={routedTrip} />
        <AdaptationBanner />

        {/* The one thing worth knowing before looking at the route. The rest of the audit
            — every check, every fix — is behind this row. */}
        <DayCheck trip={routedTrip} weather={weather} />
      </motion.header>

      {/* The itinerary is what the user asked for, so the itinerary is the hero. No
          section header above it: the metadata row already says four stops and 6.4 km,
          and 28px of "THE ROUTE" is 28px the map does not get. */}
      <TripMap
        trip={routedTrip}
        activeStopId={activeStopId}
        /* A pin tap is the map talking to the timeline. It used to restyle the pin and
           stop there, which on a map sitting above an unscrolled day meant selecting
           stop 3 changed a colour and nothing else. */
        onSelectStop={(stopId) => {
          setActiveStop(stopId);
          revealTimelineStop(stopId);
        }}
        onViewStop={openPlace}
        changedSegmentIds={adaptation?.applied ? adaptation.changedSegmentIds : undefined}
        /* Deterministic, not history-dependent: /trip is a tab destination, so a jury
           who lands here first had `router.back()` walk them straight out of the app. */
        onBack={() => router.push("/")}
        onInfo={() => openPlace(activeStopId ?? firstStop.id)}
        className="border-border h-[42dvh] min-h-68 border-y"
      />

      {/* The map and the timeline are two views of one day, and nothing on the screen
          said so: a jury tapping a pin got a colour change and no reason to tap a second
          one. One muted line, right where the two meet. */}
      <p className="text-muted-foreground flex items-center gap-1.5 px-4 pt-3 text-[11px] leading-snug">
        <HandTap aria-hidden className="text-primary-ink size-3.5 shrink-0" weight="fill" />
        {t("trip.tapHint")}
      </p>

      {/* Two sentences, generated from the trip object itself — see day-glance.tsx. */}
      <DayGlance trip={routedTrip} weather={weather} omitShape className="mx-4 mt-3" />

      <TripTimeline
        trip={routedTrip}
        activeStopId={activeStopId}
        onSelectStop={setActiveStop}
        onOpenStop={setPlaceStopId}
        dayLabel={t("timeline.day", { n: 1, city: routedTrip.destination })}
        dayAside={`${day.start} → ${day.end}`}
        className="px-4 pt-6"
      />

      {/* The trust principle, kept — as a link at the end of the day rather than a
          paragraph in the middle of it. */}
      <VerifiedLink trip={routedTrip} className="px-4 pt-1 pb-2" />

      {/* Resolved first, then opened: an activeStopId left behind by an older trip used
          to open the sheet on nothing at all. */}
      <PlaceSheet
        trip={routedTrip}
        stop={placeStop}
        poi={placeStop?.poi ?? null}
        open={placeStop !== null}
        onClose={() => setPlaceStopId(null)}
      />
    </PageShell>
  );
}
