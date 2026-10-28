"use client";

/**
 * MapLibre canvas. Loaded only through <TripMap>, which imports it lazily so the GL
 * bundle never blocks first render.
 *
 * Visual direction: calm and premium. Four numbered pins, one route, nothing else —
 * no category icons, no clutter, no dashboard chrome.
 */
import { LngLatBounds, MapLibreMap, Marker, setWorkerUrl } from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP } from "@/config/app";
import { poiName } from "@/data/poi-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { Trip } from "@/types/trip";

const SOURCE = "trip-route";
const CASING_LAYER = "trip-route-casing";
const WALK_LAYER = "trip-route-walk";
const CAR_LAYER = "trip-route-car";
const FADE_MS = 220;
/** Stable identity: a fresh [] on every render would re-run the redraw effect. */
const NO_CHANGES: readonly string[] = [];

/*
 * The visual circle is an inner span. MapLibre places the outer button with an inline
 * transform, so a transform of our own — the pin-in scale on the reveal, the active grow —
 * has to live one level down or it fights the marker's placement (and a transition on the
 * outer transform made pins lag behind the tiles while the map moved).
 */
/*
 * Small mint circles with a dark ring; the active one grows and gets a soft halo.
 *
 * The growth is a transform, not a width/height change: animating the box made the browser
 * lay out and paint the marker on every frame of the transition, on top of whatever the map
 * itself was doing. Same 24 → 36px, one composited property. The face keeps a fixed box so
 * the number inside does not reflow.
 */
const PIN_FACE =
  "flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-background " +
  "bg-primary font-bold text-primary-foreground " +
  "transition-[transform,box-shadow] duration-200 ease-out will-change-transform";
const PIN_BASE = `${PIN_FACE} scale-[0.667] text-base shadow-md`;
const PIN_ACTIVE = `${PIN_FACE} scale-100 text-sm shadow-xl ring-4 ring-primary/30`;

/** Colours come from the design tokens in globals.css — no palette lives in this file. */
function token(name: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || "black";
}

function coordinatesOf(trip: Trip): Record<string, [number, number]> {
  return Object.fromEntries(
    trip.stops.map((stop) => [
      stop.id,
      [stop.poi.coordinates.lng, stop.poi.coordinates.lat] as [number, number],
    ]),
  );
}

/** `geometry: null` is legal and means "straight line" — the routing-failure path. */
function routeData(trip: Trip, changedSegmentIds: readonly string[]) {
  const points = coordinatesOf(trip);

  return {
    type: "FeatureCollection" as const,
    features: trip.segments.map((segment) => {
      const path = segment.geometry
        ? segment.geometry.map(
            (point) => [point.lng, point.lat] as [number, number],
          )
        : [points[segment.fromStopId], points[segment.toStopId]].filter(
            Boolean,
          );

      return {
        type: "Feature" as const,
        properties: {
          mode: segment.mode,
          changed: changedSegmentIds.includes(segment.id),
        },
        geometry: { type: "LineString" as const, coordinates: path },
      };
    }),
  };
}

/**
 * The bottom of the map is not free space: the recenter button and the active-stop
 * callout float there. Fitting with uniform padding parked a pin underneath the card,
 * so tapping "stop 1" on the map opened Navigate instead. The frame reserves that band.
 */
function fitToStops(map: MapLibreMap, trip: Trip, animate: boolean, bottomInset: number) {
  const points = Object.values(coordinatesOf(trip));
  if (points.length === 0) return;

  const bounds = points.reduce(
    (box, point) => box.extend(point),
    new LngLatBounds(points[0], points[0]),
  );
  /* Never let the reserved band eat the map: on the short /experience canvas an
     unclamped inset collapsed all four pins into one cluster. */
  const height = map.getContainer().clientHeight || 0;
  const bottom = Math.max(
    MAP.fitPadding,
    Math.min(bottomInset, Math.round(height * 0.45)),
  );
  map.fitBounds(bounds, {
    padding: { top: MAP.fitPadding, left: MAP.fitPadding, right: MAP.fitPadding, bottom },
    maxZoom: 15,
    duration: animate ? 600 : 0,
  });
}

export interface MapCanvasProps {
  trip: Trip;
  activeStopId: string | null;
  onSelectStop: (stopId: string) => void;
  changedSegmentIds?: readonly string[];
  /** Bump to re-fit the map to the stops (the recenter button). */
  recenterKey?: number;
  /** Pixels at the map's bottom kept free of pins — the floating controls live there. */
  bottomInset?: number;
}

/**
 * Turbopack does not emit maplibre's bundled worker: its URL resolved to the HTML page,
 * the worker died on a MIME-type error, and the map rendered blank with zero pins while
 * reporting no error at all. public/maplibre-gl-worker.mjs is kept in sync by
 * scripts/sync-map-worker.mjs (predev/prebuild).
 */
setWorkerUrl("/maplibre-gl-worker.mjs");

export default function MapCanvas({
  trip,
  activeStopId,
  onSelectStop,
  changedSegmentIds = NO_CHANGES,
  recenterKey = 0,
  bottomInset = MAP.fitPadding,
}: MapCanvasProps) {
  const { t, locale } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, HTMLButtonElement>());
  const modesRef = useRef("");
  const revealedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Read inside the build-once effect without re-creating the map.
  const insetRef = useRef(bottomInset);
  useEffect(() => {
    insetRef.current = bottomInset;
  }, [bottomInset]);

  // Keep the latest select handler without re-creating the map.
  const selectRef = useRef(onSelectStop);
  useEffect(() => {
    selectRef.current = onSelectStop;
  }, [onSelectStop]);

  useEffect(() => {
    if (!containerRef.current) return;
    const pins = markersRef.current;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: document.documentElement.dataset.theme === "light" ? MAP.lightStyleUrl : MAP.styleUrl,
      center: [MAP.defaultCenter.lng, MAP.defaultCenter.lat],
      zoom: MAP.defaultZoom,
      /* Non-compact: MapLibre auto-opens the compact control into a white bar on load.
         The styling lives in globals.css (.maplibregl-ctrl-attrib). */
      attributionControl: { compact: false },
      // A tourist map is for reading, not for flying through.
      pitchWithRotate: false,
      dragRotate: false,
    });
    mapRef.current = map;

    // A tile that 404s after the style is up is not a broken map. Only a style that
    // never loads costs us the map — and the timeline alone is a complete trip.
    let loaded = false;
    map.on("error", () => {
      if (!loaded) setFailed(true);
    });
    map.on("load", () => {
      loaded = true;
      /* Pins depend on the map only. Mark ready before touching layers so a paint-spec
         problem can never cost us the four markers — losing the route line is a
         degraded map, losing the pins is a blank one. */
      setReady(true);
      try {
        map.addSource(SOURCE, { type: "geojson", data: routeData(trip, []) });

        map.addLayer({
          id: CASING_LAYER,
          type: "line",
          source: SOURCE,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": token("--background"),
            "line-width": 6,
            "line-opacity": 0.6,
            "line-opacity-transition": { duration: FADE_MS },
          },
        });

        map.addLayer({
          id: WALK_LAYER,
          type: "line",
          source: SOURCE,
          filter: ["==", ["get", "mode"], "walking"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": token("--primary-ink"),
            "line-width": 3,
            "line-opacity": 0.85,
            "line-opacity-transition": { duration: FADE_MS },
          },
        });

        map.addLayer({
          id: CAR_LAYER,
          type: "line",
          source: SOURCE,
          filter: ["==", ["get", "mode"], "car"],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": token("--mist"),
            "line-width": ["case", ["to-boolean", ["get", "changed"]], 4, 3],
            "line-opacity": 0.85,
            "line-opacity-transition": { duration: FADE_MS },
          },
        });

        fitToStops(map, trip, false, insetRef.current);
      } catch (error) {
        /* Never silent: map.on("error") ignores everything after load, which is exactly
           how a throwing addLayer stayed invisible while the map rendered blank. */
        console.error("[siyaha] map layer setup failed", error);
      }
    });

    return () => {
      pins.clear();
      mapRef.current = null;
      map.remove();
    };
    // Built once. Trip changes are pushed into the existing map below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pins. Rebuilt only when the stops themselves change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const pins = markersRef.current;
    // Pins pop in once, on the reveal. A rebuilt trip (an adaptation) keeps them still so
    // the route fade is the only thing moving.
    const firstReveal = !revealedRef.current;
    revealedRef.current = true;
    const markers = trip.stops.map((stop, index) => {
      const element = document.createElement("button");
      element.type = "button";
      /* The mint circle is 24px because the map has to stay readable; the tap target is
         not. Padding grows the button around the same centre — MapLibre anchors markers
         on the element's midpoint — so the pin looks identical and is thumb-sized. */
      element.className = "grid cursor-pointer place-items-center rounded-full p-2";
      element.setAttribute("aria-label", `${stop.order}. ${poiName(stop.poi, locale)}`);
      /* Three levels, one transform each: MapLibre owns the button's (placement), the
         entrance span owns the pop-in, the face owns the selected size. Sharing a level
         meant the entrance's fill-mode held `scale(1)` and pinned every pin at its
         selected size for good. */
      const entrance = document.createElement("span");
      entrance.className = "block";
      const face = document.createElement("span");
      face.className = PIN_BASE;
      face.textContent = String(stop.order);
      if (firstReveal) {
        entrance.classList.add("animate-pin-in");
        entrance.style.animationDelay = `${300 + index * 90}ms`;
      }
      entrance.appendChild(face);
      element.appendChild(entrance);
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        selectRef.current(stop.id);
      });
      pins.set(stop.id, element);

      return new Marker({ element })
        .setLngLat([stop.poi.coordinates.lng, stop.poi.coordinates.lat])
        .addTo(map);
    });

    fitToStops(map, trip, true, insetRef.current);

    return () => {
      markers.forEach((marker) => marker.remove());
      pins.clear();
    };
  }, [ready, trip, locale]);

  // Recenter: the round button over the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !recenterKey) return;
    fitToStops(map, trip, true, insetRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterKey]);

  // Selection highlight, both directions: pin tap and timeline tap land here.
  useEffect(() => {
    markersRef.current.forEach((element, stopId) => {
      const active = stopId === activeStopId;
      const face = element.firstElementChild?.firstElementChild;
      if (face) face.className = active ? PIN_ACTIVE : PIN_BASE;
      element.setAttribute("aria-current", active ? "true" : "false");
    });
  }, [activeStopId, ready, trip]);

  /**
   * Keep the selected stop on the map.
   *
   * Not a recenter: on `/trip` the map is a short band and selecting a stop from the
   * timeline would otherwise grow a pin that is off-screen — a state change with nothing
   * to show for it. This pans only when the pin is actually outside the frame, so a
   * selection that is already visible never moves the map under the reader's thumb.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !activeStopId) return;
    const stop = trip.stops.find((candidate) => candidate.id === activeStopId);
    if (!stop) return;

    const point = map.project([stop.poi.coordinates.lng, stop.poi.coordinates.lat]);
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    const edge = 48;
    const inFrame =
      point.x > edge &&
      point.x < width - edge &&
      point.y > edge &&
      point.y < height - insetRef.current;
    if (inFrame) return;

    map.easeTo({
      center: [stop.poi.coordinates.lng, stop.poi.coordinates.lat],
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420,
    });
  }, [activeStopId, ready, trip]);

  // Route redraw. When an adaptation changed segments the old route fades out first,
  // so the jury sees the day being rewritten rather than a value flicking over.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const source = map.getSource(SOURCE) as GeoJSONSource | undefined;
    if (!source) return;

    const data = routeData(trip, changedSegmentIds);
    const layers = [CASING_LAYER, WALK_LAYER, CAR_LAYER];
    const setOpacity = (value: number) =>
      layers.forEach((layer) => {
        if (map.getLayer(layer))
          map.setPaintProperty(layer, "line-opacity", value);
      });

    // Animate a rewritten day, not a geometry refill: real street paths arrive from
    // /api/route a moment after an adaptation, and replaying the fade would look glitchy.
    const modes = trip.segments
      .map((segment) => `${segment.id}:${segment.mode}`)
      .join(",");
    const rewritten = modesRef.current !== "" && modesRef.current !== modes;
    modesRef.current = modes;

    if (changedSegmentIds.length === 0 || !rewritten) {
      source.setData(data);
      return;
    }

    setOpacity(0);
    const timer = setTimeout(() => {
      source.setData(data);
      setOpacity(1);
    }, FADE_MS);

    return () => clearTimeout(timer);
  }, [ready, trip, changedSegmentIds]);

  if (failed) {
    return (
      <div className="bg-surface-muted text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
        {t("trip.mapUnavailable")}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="application"
      aria-label={t("trip.mapLabel")}
    />
  );
}
