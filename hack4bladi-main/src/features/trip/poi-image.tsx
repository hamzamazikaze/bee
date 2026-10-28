"use client";

/**
 * Hero image with the contractual fallback. `POIMedia.fallbackImage` is always a local
 * asset that exists, so a missing or slow Tier-1 photo never leaves a hole in the day.
 *
 * Remount with `key={poi.id}` when the POI changes — the fallback state is per image.
 */
import Image from "next/image";
import { useState } from "react";
import type { POI } from "@/types/poi";

export function PoiImage({
  poi,
  width,
  height,
  className,
}: {
  poi: POI;
  width: number;
  height: number;
  className?: string;
}) {
  const [src, setSrc] = useState(poi.media.heroImage);

  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={width}
      height={height}
      className={className}
      /* A day is at most a handful of 56px thumbnails and they are the whole point of
         the screen. Lazy-loading them buys nothing.

         `unoptimized`: the dev image optimizer stalls when several of these are requested
         at once and silently leaves stops blank. The sources are already ~100KB webp, so
         serving them directly costs nothing worth a blank itinerary. */
      loading="eager"
      unoptimized
      onError={() => setSrc(poi.media.fallbackImage)}
    />
  );
}
