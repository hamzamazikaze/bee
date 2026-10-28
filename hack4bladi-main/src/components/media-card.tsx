"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { pauseIfReducedMotion } from "./motion";
import { archClip } from "./ornament";
import { ZelligeTile } from "./zellige-tile";
import type { POICategory } from "@/types/poi";

/** Always resolves, always local. The demo never depends on a remote image. */
const LAST_RESORT = "/images/placeholder.svg";

const RATIO = {
  hero: "aspect-[4/5]",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[16/10]",
  wide: "aspect-[2/1]",
  /** Menu cards: a short band, so more of the list fits on a phone. */
  banner: "aspect-[12/5]",
  square: "aspect-square",
  /**
   * No intrinsic ratio — the CALLER owns the box.
   *
   * `aspect-*` combined with a max-height makes the box hold its ratio by shrinking
   * its WIDTH, so anything height-constrained (a full-bleed reveal) must use this.
   */
  fill: "h-full w-full",
} as const;

export type MediaRatio = keyof typeof RATIO;

const ROUNDED = {
  none: "rounded-none",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
} as const;

/**
 * One image element in the whole product. A remote hero that 404s falls back to the
 * POI's local `fallbackImage`, then to the packaged placeholder — a broken URL can
 * never blank a screen.
 */
export function MediaCard({
  src,
  video,
  fallbackSrc,
  alt,
  ratio = "landscape",
  arch = false,
  overlay,
  scrim = false,
  scrimStrength = "soft",
  washed = true,
  rounded = "xl",
  position,
  className,
  imageClassName,
  priority = false,
  /* The app is a 430px column, so no image is ever rendered wider than that. One honest
     default beats per-call-site tuning: the browser stops at the 430px candidate instead
     of pulling the full 1200px source for a thumbnail. */
  sizes = "430px",
  ornamentSeed,
  ornamentCategory,
}: {
  src?: string | null;
  /** Looping clip laid over the still. The still remains underneath as the poster. */
  video?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  ratio?: MediaRatio;
  arch?: boolean;
  overlay?: ReactNode;
  scrim?: boolean;
  /** `strong` is for type sitting directly on the image, not beside it. */
  scrimStrength?: "soft" | "strong";
  /** Organic's system-level image treatment. Off only where a photo must stay literal. */
  washed?: boolean;
  /** `arch` clips its own silhouette and ignores this. */
  rounded?: "none" | "md" | "lg" | "xl";
  /** CSS object-position, e.g. "50% 35%". Photography crop control. */
  position?: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
  /**
   * The record's slug. When `src` 404s and this is set, the card draws a deterministic
   * zellige tile instead of continuing to `fallbackSrc` — which is a category photograph
   * shared by up to eight records. See `zellige-tile.tsx`.
   */
  ornamentSeed?: string;
  ornamentCategory?: POICategory;
}) {
  const chain = [src, fallbackSrc, LAST_RESORT].filter(Boolean) as string[];
  /* Track what failed rather than an index: a new `src` is simply not in the set yet,
     so the fallback chain resets itself without an effect. */
  const [failed, setFailed] = useState<string[]>([]);
  const current = chain.find((candidate) => !failed.includes(candidate)) ?? LAST_RESORT;
  /* The ornament replaces the shared category photo, not the record's own one: it is
     reached only once `src` itself has failed. There is no flash of the borrowed image
     because we never advance to it. */
  const ornament = Boolean(ornamentSeed) && Boolean(src) && failed.includes(src as string);

  return (
    <div
      // Photo + scrim + white type: always the dark set, whatever the page theme.
      data-theme={scrim ? "dark" : undefined}
      className={cn(
        "bg-surface-muted relative isolate overflow-hidden",
        arch ? "rounded-none" : ROUNDED[rounded],
        RATIO[ratio],
        className,
      )}
      style={arch ? { clipPath: archClip } : undefined}
    >
      {ornament ? (
        <ZelligeTile seed={ornamentSeed as string} category={ornamentCategory} />
      ) : (
      <Image
        src={current}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        /* An uploaded screenshot is a blob/data URL and an SVG is already vector — the
           optimizer cannot improve either, and would 400 on the blob. */
        unoptimized={!current.startsWith("/") || current.endsWith(".svg")}
        onError={() =>
          setFailed((previous) => (previous.includes(current) ? previous : [...previous, current]))
        }
        style={position ? { objectPosition: position } : undefined}
        className={cn("object-cover", washed && "washed", imageClassName)}
      />
      )}
      {video ? (
        <video
          ref={pauseIfReducedMotion}
          aria-hidden
          className={cn("absolute inset-0 size-full object-cover", washed && "washed")}
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : null}
      {scrim ? (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 bg-gradient-to-t to-transparent",
            scrimStrength === "strong"
              ? "from-background via-background/45"
              : "from-background/85 via-background/15",
          )}
        />
      ) : null}
      {overlay ? <div className="absolute inset-0">{overlay}</div> : null}
    </div>
  );
}
