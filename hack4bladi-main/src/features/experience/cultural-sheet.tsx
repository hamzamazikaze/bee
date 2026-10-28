"use client";

import { useRef, useState } from "react";
import { Headphones, Pause } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/bottom-sheet";
import { MediaCard } from "@/components/media-card";
import { Button } from "@/components/ui/button";
import { ZelligeStar } from "@/components/ornament";
import { poiName } from "@/data/poi-utils";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import type { TripStop } from "@/types/trip";

/** Pre-recorded narration only — never runtime TTS, and hidden entirely when absent. */
function ListenButton({ src }: { src: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={playing}
        onClick={() => {
          const audio = ref.current;
          if (!audio) return;
          if (audio.paused) void audio.play().then(() => setPlaying(true));
          else {
            audio.pause();
            setPlaying(false);
          }
        }}
      >
        {playing ? (
          <Pause aria-hidden className="size-4" />
        ) : (
          <Headphones aria-hidden className="size-4" />
        )}
        {t("experience.listen")}
      </Button>
      <audio ref={ref} src={src} preload="none" onEnded={() => setPlaying(false)} />
    </>
  );
}

/**
 * The cultural layer: a 3-4 line story, one tip, optional narration. This is the
 * strongest Moroccan treatment in the product — deliberately louder than the map.
 */
export function CulturalSheet({
  stop,
  open,
  onClose,
  onVisited,
}: {
  stop: TripStop | null;
  open: boolean;
  onClose: () => void;
  onVisited: (stopId: string) => void;
}) {
  const { t, locale } = useTranslation();
  const localized = useLocalized();
  if (!stop) return null;

  const { poi } = stop;
  const audio = poi.cultural.audio?.[locale] ?? poi.cultural.audio?.en ?? null;
  const video = poi.media.heroVideo;

  return (
    <BottomSheet open={open} onClose={onClose} title={poiName(poi, locale)}>
      {video ? (
        <video
          src={video}
          poster={poi.media.fallbackImage}
          controls
          playsInline
          preload="none"
          className="bg-surface-muted aspect-[16/10] w-full rounded-xl object-cover"
        />
      ) : (
        <MediaCard
          src={poi.media.heroImage}
          fallbackSrc={poi.media.fallbackImage}
          alt={poiName(poi, locale)}
          ratio="landscape"
        />
      )}

      <p className="text-primary-ink mt-5 eyebrow">
        {t("experience.storyEyebrow")}
      </p>
      <h3 className="font-display mt-1 text-lg">{t("experience.culturalStory")}</h3>
      <p className="text-foreground/85 mt-2 text-[0.9375rem] leading-relaxed text-pretty">
        {localized(poi.cultural.story)}
      </p>

      <div className="border-border bg-surface-muted relative mt-5 overflow-hidden rounded-xl border p-4">
        <ZelligeStar className="text-primary-ink/15 pointer-events-none absolute -top-6 -end-6 size-28" />
        <p className="text-primary-ink relative eyebrow">
          {t("experience.culturalTip")}
        </p>
        <p className="relative mt-1.5 text-sm leading-relaxed">{localized(poi.cultural.tip)}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {audio ? <ListenButton src={audio} /> : null}
        <Button
          size="sm"
          className="flex-1"
          disabled={stop.visitState === "visited"}
          onClick={() => {
            onVisited(stop.id);
            onClose();
          }}
        >
          {stop.visitState === "visited" ? t("experience.doneStop") : t("experience.markVisited")}
        </Button>
      </div>
    </BottomSheet>
  );
}
