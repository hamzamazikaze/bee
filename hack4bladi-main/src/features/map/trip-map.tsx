"use client";

/**
 * The map half of the reveal. Public surface for the whole app:
 *
 *   <TripMap trip={trip} activeStopId={id} onSelectStop={setActiveStop} />
 *
 * MapLibre itself is imported lazily — the GL bundle must never block first render, and
 * a trip is fully usable from the timeline alone if tiles never arrive.
 */
import dynamic from "next/dynamic";
import { useState } from "react";
import { ArrowLeft, Info, Crosshair, NavigationArrow } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { navigationUrl } from "@/lib/routing/navigation";
import { poiName } from "@/data/poi-utils";
import { cn, formatDuration } from "@/lib/utils";
import type { Trip } from "@/types/trip";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <div className="bg-surface-muted h-full w-full animate-pulse" />,
});

export interface TripMapProps {
  trip: Trip;
  activeStopId: string | null;
  onSelectStop: (stopId: string) => void;
  /** Segments an adaptation just rewrote — the map animates exactly these. */
  changedSegmentIds?: readonly string[];
  /** Optional: the mini card's "View stop" action, e.g. open the place detail. */
  onViewStop?: (stopId: string) => void;
  /** Optional pill label in the top bar. The bar itself renders for back/info alone. */
  title?: string;
  onBack?: () => void;
  onInfo?: () => void;
  /** The active-stop callout. Off where the screen already shows that stop right under the map. */
  stopCard?: boolean;
  className?: string;
}

const ROUND =
  "bg-background/85 border-border text-foreground pointer-events-auto pressable grid size-10 place-items-center rounded-full border shadow-md backdrop-blur-sm transition hover:border-primary";

/**
 * The one route map on screen at a time — `/trip` and `/experience` never coexist. Having
 * a stable id means anything that rewrites the day (Adapt My Day, a Day check fix) can
 * bring the redraw into view instead of animating it below the fold.
 */
export const ROUTE_MAP_ID = "route-map";

/**
 * Scrolls the route map into view. Called the moment an adaptation lands: `docs/DEMO_PATH.md`
 * names the route redraw as the animation of the demo, and at rest on `/trip` the map is a
 * ~90px sliver under the sticky action bar, so it was redrawing where nobody could see it.
 */
export function revealRouteMap() {
  if (typeof document === "undefined") return;
  const map = document.getElementById(ROUTE_MAP_ID);
  if (!map) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* After the sheet's close animation, so the scroll is not competing with it. */
  requestAnimationFrame(() =>
    map.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }),
  );
}

export function TripMap({
  trip,
  activeStopId,
  onSelectStop,
  changedSegmentIds,
  onViewStop,
  title,
  onBack,
  onInfo,
  stopCard = true,
  className,
}: TripMapProps) {
  const { t, locale } = useTranslation();
  const [recenterKey, setRecenterKey] = useState(0);

  const stop = trip.stops.find((candidate) => candidate.id === activeStopId) ?? null;
  const arriveBy = stop
    ? (trip.segments.find((segment) => segment.toStopId === stop.id) ?? null)
    : null;

  function navigate() {
    if (!stop) return;
    const url = navigationUrl(
      stop.poi.coordinates,
      arriveBy?.mode ?? "walking",
      typeof navigator === "undefined" ? "" : navigator.userAgent,
      poiName(stop.poi, locale),
    );
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div id={ROUTE_MAP_ID} className={cn("bg-surface-muted relative overflow-hidden", className)}>
      <MapCanvas
        trip={trip}
        activeStopId={activeStopId}
        onSelectStop={onSelectStop}
        changedSegmentIds={changedSegmentIds}
        recenterKey={recenterKey}
        /* The recenter button alone, or the recenter button plus the callout. */
        bottomInset={stopCard ? 150 : 84}
      />

      {(title || onBack || onInfo) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 p-3">
          {onBack && (
            <button type="button" onClick={onBack} aria-label={t("common.back")} className={ROUND}>
              <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden  weight="bold" />
            </button>
          )}
          {title ? (
            <p className="bg-background/85 border-border pointer-events-auto min-w-0 flex-1 truncate rounded-full border px-4 py-2.5 text-sm font-semibold backdrop-blur-sm">
              {title}
            </p>
          ) : (
            <span className="flex-1" aria-hidden />
          )}
          {onInfo && (
            <button type="button" onClick={onInfo} aria-label={t("place.info")} className={ROUND}>
              <Info className="size-5" aria-hidden />
            </button>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-end gap-2 p-3 pb-7">
        <button
          type="button"
          onClick={() => setRecenterKey((key) => key + 1)}
          aria-label={t("place.recenter")}
          className="bg-primary text-primary-foreground hover:bg-primary-hover pointer-events-auto pressable grid size-11 place-items-center rounded-full shadow-lg transition"
        >
          <Crosshair className="size-5" aria-hidden  weight="bold" />
        </button>

        {stopCard && stop && (
          <article
            key={stop.id}
            className="bg-background/95 border-border pointer-events-auto flex w-full items-center gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-primary-ink eyebrow">
                {t(`onboarding.interest.${stop.poi.categories[0]}`)}
              </p>
              <h3 className="truncate text-[15px] font-semibold">{poiName(stop.poi, locale)}</h3>
              <p className="text-muted-foreground truncate text-xs">
                {stop.arrivalTime} · {formatDuration(stop.durationMinutes, locale)}
                {arriveBy && ` · ${formatDuration(arriveBy.durationMinutes, locale)}`}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              {onViewStop && (
                <button
                  type="button"
                  onClick={() => onViewStop(stop.id)}
                  className="border-border text-foreground hover:border-primary pressable min-h-9 rounded-md border px-3 text-xs font-semibold transition"
                >
                  {t("trip.viewStop")}
                </button>
              )}
              <button
                type="button"
                onClick={navigate}
                className="bg-primary text-primary-foreground hover:bg-primary-hover pressable flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition"
              >
                <NavigationArrow className="size-3.5" aria-hidden />
                {t("experience.navigate")}
              </button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
