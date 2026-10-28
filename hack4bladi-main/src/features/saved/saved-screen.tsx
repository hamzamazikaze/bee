"use client";

import { useState } from "react";
import Link from "next/link";
import { BookmarkSimple } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { SectionTitle } from "@/components/section-title";
import { PlaceSheet } from "@/features/trip";
import { getPoiById } from "@/data/pois";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";
import type { POI } from "@/types/poi";

/**
 * Two honest lists: the places kept from Explore (the heart on a place sheet) and the
 * places actually finished, read straight from the passport. Nothing is invented, and
 * the empty state's promise — "places you keep from Explore land here" — is now true.
 */
export function SavedScreen() {
  const { t } = useTranslation();
  const stamps = useAppStore((state) => state.passport.stamps);
  const savedPoiIds = useAppStore((state) => state.savedPoiIds);
  const [selected, setSelected] = useState<POI | null>(null);

  const savedPois = savedPoiIds
    .map((id) => getPoiById(id))
    .filter((poi): poi is POI => Boolean(poi));

  return (
    <PageShell nav className="pb-10">
      <header className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-[2rem] leading-[1.05]">{t("saved.title")}</h1>
      </header>

      {savedPois.length === 0 && stamps.length === 0 ? (
        <section className="flex flex-col items-center px-8 pt-20 text-center">
          <span className="border-border text-muted-foreground grid size-14 place-items-center rounded-full border">
            <BookmarkSimple aria-hidden className="size-6" weight="light" />
          </span>
          <h2 className="font-display mt-6 text-[1.5rem] leading-tight text-balance">
            {t("saved.emptyTitle")}
          </h2>
          <p className="text-muted-foreground mt-2.5 max-w-[19rem] text-[0.875rem] leading-relaxed text-pretty">
            {t("saved.emptyBody")}
          </p>
          <Link
            href="/explore"
            className="bg-primary text-primary-foreground hover:bg-primary-hover mt-7 inline-flex h-12 items-center rounded-[0.875rem] px-6 text-[0.9375rem] font-semibold transition"
          >
            {t("saved.cta")}
          </Link>
        </section>
      ) : (
        <>
          {savedPois.length > 0 ? (
            <section className="px-5 pt-6">
              <SectionTitle title={t("saved.keptTitle")} />
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7">
                {savedPois.map((poi) => (
                  <li key={poi.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(poi)}
                      className="pressable w-full text-start"
                      aria-label={poi.name}
                    >
                      <MediaCard
                        src={poi.media.heroImage}
                        fallbackSrc={poi.media.fallbackImage}
                        alt=""
                        ratio="hero"
                        sizes="190px"
                      />
                      <h3 className="mt-2.5 text-[0.9375rem] leading-tight font-semibold">
                        {poi.name}
                      </h3>
                      <p className="text-muted-foreground mt-1 text-[0.75rem]">{poi.city}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {stamps.length > 0 ? (
        <section className="px-5 pt-6">
          <SectionTitle title={t("saved.visitedTitle")} />
          <p className="text-muted-foreground mt-2 text-[0.875rem] leading-relaxed text-pretty">
            {t("saved.visitedBody")}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7">
            {stamps.map((stamp) => {
              const poi = getPoiById(stamp.poiId);
              return (
                <li key={stamp.poiId}>
                  <MediaCard
                    src={poi?.media.heroImage ?? stamp.imageUrl}
                    fallbackSrc={poi?.media.fallbackImage ?? stamp.imageUrl}
                    alt=""
                    ratio="hero"
                    sizes="190px"
                  />
                  <h3 className="mt-2.5 text-[0.9375rem] leading-tight font-semibold">
                    {stamp.poiName}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-[0.75rem]">{stamp.city}</p>
                </li>
              );
            })}
          </ul>
        </section>
          ) : null}
        </>
      )}

      <PlaceSheet poi={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </PageShell>
  );
}
