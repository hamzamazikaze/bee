"use client";

/**
 * A category shelf: everything the curated dataset holds under one of the six
 * categories, split into places and experiences.
 *
 * This screen exists because the Home category row used to be a lie. Tapping "Beaches"
 * did not show beaches — it patched the profile and dropped the jury into step 1 of the
 * planner, a wizard they had not asked for, with no way to see what the region actually
 * holds. Five tiles that all looked like browse and all did plan. Now the tile browses,
 * and planning is the one CTA at the bottom, where a CTA belongs.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { rise, riseInView } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { Button } from "@/components/ui/button";
import { PlaceSheet } from "@/features/trip";
import { addSource } from "@/features/home/presets";
import { poiName } from "@/data/poi-utils";
import { useAppStore } from "@/lib/store";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { formatMad } from "@/lib/i18n/format";
import { formatDuration } from "@/lib/utils";
import { basePriceMad } from "@/lib/wallet";
import type { POI } from "@/types/poi";
import { getCategory, poisInCategory, splitByKind } from "./categories";
import { PoiCard } from "./poi-card";

/** An experience is a person, not a photo tile: who hosts it, how long, what it costs. */
function ExperienceRow({ poi, onOpen }: { poi: POI; onOpen: (poi: POI) => void }) {
  const { t, locale } = useTranslation();
  const localized = useLocalized();
  const name = poiName(poi, locale);
  const price = basePriceMad(poi);
  /* Same fallback the place sheet uses: a role written only in English ("Local
     ceramicist") sitting inside an Arabic card is the seam a jury reads first. */
  const host = poi.experience?.host;
  const hostName = host ? localized(host.displayName) || host.name : null;
  const meta = [
    formatDuration(poi.baseDurationMinutes, locale),
    price === null ? null : price === 0 ? t("place.free") : formatMad(price, locale),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpen(poi)}
      aria-label={name}
      className="pressable border-border bg-surface hover:border-primary/50 flex w-full items-center gap-3 rounded-xl border p-2.5 text-start transition"
    >
      <span className="w-[4.5rem] shrink-0">
        <MediaCard
          src={poi.media.heroImage}
          fallbackSrc={poi.media.fallbackImage}
          alt=""
          ratio="square"
          rounded="lg"
          sizes="72px"
          ornamentSeed={poi.slug}
          ornamentCategory={poi.categories[0]}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] leading-tight font-semibold">{name}</span>
        {hostName ? (
          <span className="text-primary-ink mt-1 block truncate text-[0.75rem]">
            {t("category.hostedBy", { name: hostName })}
          </span>
        ) : null}
        <span className="text-muted-foreground mt-0.5 block text-[0.75rem]">{meta}</span>
      </span>
    </button>
  );
}

export function CategoryScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const patchProfile = useAppStore((state) => state.patchProfile);
  const [selected, setSelected] = useState<POI | null>(null);

  const category = getCategory(id);
  const all = category ? poisInCategory(category.id) : [];
  const { places, experiences } = splitByKind(all);
  /* Prefer a POI that leads with this category: Food's hero should be a market, not the
     arch of a Habous entry that happens to be tagged food as well. */
  const hero = all.find((poi) => poi.categories[0] === category?.id) ?? all[0] ?? null;

  /** The same contract the Home tile used to have — moved to where it is honest. */
  function buildDay(interests: typeof profile.interests, poi?: POI) {
    patchProfile({
      interests,
      destination: poi?.city ?? profile.destination ?? "Casablanca",
      ...(poi ? { detectedPlace: poi.name, detectedPoiId: poi.id } : {}),
      sources: addSource(profile.sources, "preset"),
    });
    setSelected(null);
    router.push("/onboarding");
  }

  if (!category) {
    return (
      <PageShell nav className="px-5 pt-24 text-center">
        <h1 className="font-display text-[1.5rem] leading-tight">{t("category.unknown")}</h1>
        <Link href="/explore" className="text-primary-ink mt-4 inline-block text-[0.9375rem] font-semibold">
          {t("category.browseAll")}
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell
      nav
      className="pb-8"
      footer={
        <Button size="lg" block onClick={() => buildDay(category.interests)}>
          {t("category.buildDay", { category: t(category.labelKey) })}
        </Button>
      }
    >
      {/* Photo header: the category is a place in the region, not a filter value. */}
      <header className="relative">
        <div className="h-[13rem] overflow-hidden">
          {hero ? (
            <MediaCard
              src={hero.media.heroImage}
              fallbackSrc={hero.media.fallbackImage}
              alt=""
              ratio="fill"
              rounded="none"
              priority
              ornamentSeed={hero.slug}
              ornamentCategory={category.id}
            />
          ) : (
            <div className="bg-surface-muted size-full" />
          )}
        </div>
        <div
          aria-hidden
          className="from-background via-background/45 absolute inset-0 bg-gradient-to-t to-transparent"
        />
        <div className="absolute inset-x-0 top-0 px-4 pt-[max(0.875rem,env(safe-area-inset-top))]">
          {/* `/` and never router.back(): opened directly, back walks out of the app. */}
          <Link
            href="/"
            aria-label={t("common.back")}
            className="bg-background/70 border-border hover:border-primary grid size-10 place-items-center rounded-full border backdrop-blur-sm transition"
          >
            <ArrowLeft aria-hidden className="size-5" weight="bold" />
          </Link>
        </div>
        <motion.div {...rise(0)} className="absolute inset-x-0 bottom-0 px-5 pb-4">
          <p className="eyebrow text-primary-ink">{t("category.eyebrow")}</p>
          <h1 className="font-display mt-1 text-[1.75rem] leading-[1.1] text-balance text-foreground">
            {t(`onboarding.interest.${category.id}`)}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-[0.8125rem]">
            {/* "1 experiences" is exactly the kind of seam a jury reads out loud. */}
            {t(places.length === 1 ? "category.placeOne" : "category.placeMany", {
              n: places.length,
            })}
            {" · "}
            {t(experiences.length === 1 ? "category.experienceOne" : "category.experienceMany", {
              n: experiences.length,
            })}
          </p>
        </motion.div>
      </header>

      <p className="text-muted-foreground px-5 pt-4 text-[0.9375rem] text-pretty">
        {t(category.leadKey)}
      </p>

      {all.length === 0 ? (
        <div className="px-5 pt-16 text-center">
          <h2 className="font-display text-[1.375rem] leading-tight">{t("category.emptyTitle")}</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-[18rem] text-[0.875rem] text-pretty">
            {t("category.emptyBody")}
          </p>
          <Link
            href="/explore"
            className="text-primary-ink mt-5 inline-block text-[0.9375rem] font-semibold"
          >
            {t("category.browseAll")}
          </Link>
        </div>
      ) : null}

      {experiences.length > 0 ? (
        <section className="px-5 pt-8">
          <SectionTitle title={t("category.experiencesTitle")} />
          <ul className="mt-4 flex flex-col gap-2.5">
            {experiences.map((poi, index) => (
              <motion.li key={poi.id} {...riseInView(index, 0.06)}>
                <ExperienceRow poi={poi} onOpen={setSelected} />
              </motion.li>
            ))}
          </ul>
        </section>
      ) : null}

      {places.length > 0 ? (
        <section className="px-5 pt-8">
          <SectionTitle title={t("category.placesTitle")} />
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7">
            {places.map((poi, index) => (
              <motion.li key={poi.id} {...riseInView(index, 0.06)}>
                <PoiCard poi={poi} category={category.id} onOpen={setSelected} />
              </motion.li>
            ))}
          </ul>
        </section>
      ) : null}

      <PlaceSheet
        poi={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        action={
          <Button
            size="lg"
            block
            onClick={() => selected && buildDay(selected.categories.slice(0, 2), selected)}
          >
            {t("explore.buildAround")}
          </Button>
        }
      />
    </PageShell>
  );
}
