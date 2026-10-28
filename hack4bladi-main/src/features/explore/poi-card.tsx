"use client";

/**
 * One photo tile for a curated place. Shared by Explore and every category shelf so a
 * card looks and behaves identically wherever it appears.
 *
 * The whole card is the target, not just the title: these are photo tiles and a jury
 * taps the picture.
 */
import { MediaCard } from "@/components/media-card";
import { poiName } from "@/data/poi-utils";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { POI } from "@/types/poi";

export function PoiCard({
  poi,
  size = "md",
  category,
  onOpen,
}: {
  poi: POI;
  size?: "md" | "lg";
  /** The shelf this card sits on. Without it a Food shelf captions its cards
      "Culture & Heritage" — the POI's own first category, true but disorienting. */
  category?: POI["categories"][number];
  onOpen: (poi: POI) => void;
}) {
  const { t, locale } = useTranslation();
  const name = poiName(poi, locale);
  return (
    <button
      type="button"
      onClick={() => onOpen(poi)}
      className="pressable group w-full text-start"
      aria-label={name}
    >
      <MediaCard
        src={poi.media.heroImage}
        fallbackSrc={poi.media.fallbackImage}
        alt=""
        ratio="hero"
        sizes={size === "lg" ? "300px" : "190px"}
        ornamentSeed={poi.slug}
        ornamentCategory={category ?? poi.categories[0]}
      />
      <h3
        className={
          size === "lg"
            ? "font-display mt-2.5 text-[1.25rem] leading-tight"
            : "mt-2.5 text-[0.9375rem] leading-tight font-semibold"
        }
      >
        {name}
      </h3>
      <p className="text-muted-foreground mt-1 text-[0.75rem]">
        {poi.city} · {t(`onboarding.interest.${category ?? poi.categories[0]}`)}
      </p>
    </button>
  );
}
