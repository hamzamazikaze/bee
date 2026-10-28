"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { rise, riseInView } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { ChoiceChip } from "@/components/choice-chip";
import { Button } from "@/components/ui/button";
import { PlaceSheet } from "@/features/trip";
import { POIS } from "@/data/pois";
import { PoiCard } from "./poi-card";
import { addSource } from "@/features/home/presets";
import { useAppStore } from "@/lib/store";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { INTERESTS } from "@/types/profile";
import type { POI } from "@/types/poi";

/**
 * Editorial discovery over the curated dataset — not a database view.
 *
 * Everything here is real: the 25 researched POIs, their own categories, their own
 * cities. No ratings, no popularity, no prices we do not have.
 */
function Row({ title, pois, onOpen }: { title: string; pois: POI[]; onOpen: (poi: POI) => void }) {
  if (pois.length === 0) return null;
  return (
    <section className="pt-10">
      <SectionTitle title={title} className="px-5" />
      <ul className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pois.map((poi, index) => (
          <motion.li key={poi.id} {...rise(index, 0, 2)} className="w-[52%] shrink-0 snap-start">
            <PoiCard poi={poi} onOpen={onOpen} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export function ExploreScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const patchProfile = useAppStore((state) => state.patchProfile);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<POI | null>(null);

  /** Explore's exit into the product: this place becomes the inspiration for a day. */
  function buildAround(poi: POI) {
    patchProfile({
      destination: poi.city,
      detectedPlace: poi.name,
      detectedPoiId: poi.id,
      interests: poi.categories.slice(0, 2),
      sources: addSource(profile.sources, "preset"),
    });
    setSelected(null);
    router.push("/onboarding");
  }

  const filtering = query.trim().length > 0 || category !== null;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return POIS.filter((poi) => {
      if (category && !poi.categories.includes(category as POI["categories"][number])) return false;
      if (!needle) return true;
      return (
        poi.name.toLowerCase().includes(needle) ||
        poi.city.toLowerCase().includes(needle) ||
        poi.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [query, category]);

  const signature = POIS.filter((poi) => poi.signature || poi.hero).slice(0, 8);
  const casablanca = POIS.filter((poi) => poi.city === "Casablanca" && !poi.signature).slice(0, 8);
  const coast = POIS.filter((poi) => poi.categories.includes("coast_nature")).slice(0, 8);

  return (
    <PageShell nav className="pb-10">
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-[2rem] leading-[1.05]">{t("explore.title")}</h1>
        <p className="text-muted-foreground mt-2 text-[0.9375rem]">{t("explore.lead")}</p>

        <div className="relative mt-5">
          <MagnifyingGlass
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 size-[1.125rem] -translate-y-1/2 start-4"
           weight="bold" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("explore.searchPlaceholder")}
            aria-label={t("explore.searchPlaceholder")}
            className="border-border-strong bg-surface text-foreground placeholder:text-muted-foreground h-12 w-full rounded-full border ps-11 pe-5 text-[0.9375rem]"
          />
        </div>
      </header>

      <ul className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <ChoiceChip selected={category === null} onSelect={() => setCategory(null)}>
            {t("explore.all")}
          </ChoiceChip>
        </li>
        {INTERESTS.map((interest) => (
          <li key={interest} className="shrink-0">
            <ChoiceChip
              selected={category === interest}
              onSelect={() => setCategory(category === interest ? null : interest)}
            >
              {t(`onboarding.interest.${interest}`)}
            </ChoiceChip>
          </li>
        ))}
      </ul>

      {filtering ? (
        <section className="px-5 pt-8">
          <SectionTitle title={t("explore.resultsTitle")} />
          {results.length === 0 ? (
            <div className="pt-10 text-center">
              <h3 className="font-display text-[1.375rem] leading-tight">
                {t("explore.noResults")}
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-[18rem] text-[0.875rem] text-pretty">
                {t("explore.noResultsBody")}
              </p>
              <Button
                variant="outline"
                size="md"
                className="mt-5"
                onClick={() => {
                  setQuery("");
                  setCategory(null);
                }}
              >
                <X aria-hidden className="size-4"  weight="bold" />
                {t("explore.clear")}
              </Button>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7">
              {results.map((poi, index) => (
                <motion.li key={poi.id} {...riseInView(index)}>
                  <PoiCard poi={poi} onOpen={setSelected} />
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {/* One large editorial lead-in, then the rows. */}
          {signature[0] ? (
            <section className="px-5 pt-8">
              <button
                type="button"
                onClick={() => setSelected(signature[0])}
                className="pressable w-full text-start"
                aria-label={signature[0].name}
              >
              <MediaCard
                src={signature[0].media.heroImage}
                fallbackSrc={signature[0].media.fallbackImage}
                alt=""
                ratio="landscape"
                scrim
                ornamentSeed={signature[0].slug}
                ornamentCategory={signature[0].categories[0]}
                overlay={
                  <div className="flex h-full flex-col justify-end p-4">
                    <h2 className="font-display text-[1.5rem] leading-tight text-white">
                      {signature[0].name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-[0.8125rem] text-white/80">
                      {localized(signature[0].cultural.tip)}
                    </p>
                  </div>
                }
              />
              </button>
            </section>
          ) : null}

          <Row title={t("explore.signatureTitle")} pois={signature.slice(1)} onOpen={setSelected} />
          <Row title={t("explore.nearbyTitle")} pois={casablanca} onOpen={setSelected} />
          <Row title={t("explore.coastTitle")} pois={coast} onOpen={setSelected} />
        </>
      )}

      <PlaceSheet
        poi={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        action={
          <Button
            size="lg"
            block
            onClick={() => selected && buildAround(selected)}
          >
            {t("explore.buildAround")}
          </Button>
        }
      />
    </PageShell>
  );
}
