"use client";

/**
 * The graphic that stands in for a photograph we do not have.
 *
 * 30 of the 36 curated records ship no image of their own and fall through to one of six
 * category photographs (see docs/prompts/CATEGORY_DATA.md §4). On a shelf that renders as
 * the same market stall three rows running, or two identical beaches side by side — which
 * reads as a broken grid, not as two places.
 *
 * A borrowed photograph is also a small lie: it shows a market that is not this market.
 * An ornament is honest — it is visibly decoration, it never claims to be the place — and
 * it is already the product's own language: the zellige of `ornament.tsx`, drawn in
 * `currentColor` on the black ground and the deep green.
 *
 * Two axes, no randomness:
 *   - the MOTIF comes from the category, so one shelf reads as one family;
 *   - ground, rotation, density and weight come from the slug, so no two records match.
 * The same record therefore draws the same tile on every render and on every machine.
 *
 * It retires itself: `MediaCard` only reaches for a tile once the real `heroImage` has
 * 404'd, so dropping `public/images/poi/<slug>.webp` on disk removes it with no code change.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";
import type { POICategory } from "@/types/poi";

/** FNV-1a. Small, stable, dependency-free — a tile must never shift between runs. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One motif per category, each a real zellige construction rather than a generic lattice,
 * drawn inside a 60×60 tile so two categories side by side still share a rhythm.
 */
const MOTIF: Record<POICategory, string> = {
  /* The khatim — the eight-point star, the figure zellige is known by. */
  culture:
    "M30 3 37 23 57 30 37 37 30 57 23 37 3 30 23 23Z M30 15 34 26 45 30 34 34 30 45 26 34 15 30 26 26Z",
  /* Interlaced squares on a grid: a tiled floor, a market table. */
  food: "M30 6 54 30 30 54 6 30Z M30 18 42 30 30 42 18 30Z M0 0H60M0 60H60M0 0V60M60 0V60",
  /* Open waves — the one motif that is not closed geometry, because a coast is not. */
  coast_nature: "M0 20Q15 8 30 20T60 20M0 34Q15 22 30 34T60 34M0 48Q15 36 30 48T60 48",
  /* A lattice with a held centre: the moucharabieh you look through, not at. */
  hidden_gems:
    "M0 30H60M30 0V60M12 12 48 48M48 12 12 48M30 22A8 8 0 1 1 30 38A8 8 0 1 1 30 22Z",
  /* The pointed arch repeated — the product's own frame, straight from `archClip`. */
  art_creative: "M6 58V34Q6 14 30 8Q54 14 54 34V58M18 58V38Q18 26 30 22Q42 26 42 38V58",
  /* A path crossing a field: the only motif that reads as movement. */
  activities: "M0 52Q30 44 60 8M0 60Q30 52 60 16M14 30 22 22M38 16 46 8M2 40 8 34",
};

/** Three charter grounds, all lighter than the page black — a tile has to read as a card
    with an edge, not as a hole. Alternating them per slug is what stops a shelf of
    ornaments flattening into one texture. */
const GROUND = ["bg-surface", "bg-deep-green", "bg-surface-muted"] as const;
/** Ornament, never information: quiet enough not to compete with the title beneath it,
    loud enough to be seen. The first pass sat at /15–/25 and read as an empty card. */
const TONE = ["text-primary-ink/35", "text-primary-ink/25", "text-primary-ink/30"] as const;
const WEIGHT = [1, 1.25, 1.5] as const;
const DENSITY = [0.85, 1, 1.2] as const;

export function ZelligeTile({
  seed,
  category = "culture",
  className,
}: {
  /** The record's slug. Same slug, same tile, always. */
  seed: string;
  category?: POICategory;
  className?: string;
}) {
  const h = hash(seed);
  const ground = GROUND[h % GROUND.length];
  const tone = TONE[(h >> 3) % TONE.length];
  const weight = WEIGHT[(h >> 6) % WEIGHT.length];
  const density = DENSITY[(h >> 9) % DENSITY.length];
  const rotation = [0, 15, 30, 45][(h >> 12) % 4];
  /* Per-INSTANCE, not per-seed: Explore renders the same POI in more than one shelf, and
     two <pattern id="zellige-x"> in one document is invalid HTML — the second `url(#…)`
     silently resolves to the first. useId is stable across hydration. */
  const id = `zellige${useId().replace(/:/g, "")}`;

  return (
    <div aria-hidden className={cn(ground, "relative size-full overflow-hidden", className)}>
      <svg
        className={cn(tone, "absolute inset-0 size-full")}
        viewBox="0 0 240 240"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <pattern
            id={id}
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${rotation} 30 30) scale(${density})`}
          >
            <path
              d={MOTIF[category]}
              fill="none"
              stroke="currentColor"
              strokeWidth={weight}
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width="240" height="240" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
