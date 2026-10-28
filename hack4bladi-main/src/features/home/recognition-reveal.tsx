"use client";

import { motion } from "motion/react";
import { MapPin } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { PoiCandidate } from "@/types/intent";
import type { Recognition } from "./analyze";
import { draftChips } from "./draft-summary";

/**
 * The interpretation reveal — one screen for every modality.
 *
 * A product moment, not a result panel: whatever the traveller gave us becomes the place,
 * full-bleed inside the app viewport. `app-anchored` pins it to the phone's own box, so it
 * covers the application and not the desktop stage around it.
 *
 * It has three states, and which one shows is decided by evidence, never by optimism:
 *
 *  - **a place we can name** — the headline is the place, with the day we understood
 *    underneath and, when we are not certain, the other places it could have been;
 *  - **no place but a day** — a link or a spoken sentence that told us plenty about the
 *    day and nothing about a monument still deserves a confirmation, not an apology;
 *  - **neither** — the honest dead end, which still moves forward.
 *
 * Nothing here is invented. The match score only appears when a real provider returned
 * one (see `Recognition.confidence`), and the alternatives are curated POIs the local
 * resolver ranked — never a model's guess.
 */
export function RecognitionReveal({
  preview,
  recognition,
  onConfirm,
  onRetry,
  onPickCandidate,
}: {
  preview: string | null;
  recognition: Recognition;
  onConfirm: () => void;
  onRetry: () => void;
  onPickCandidate?: (candidate: PoiCandidate) => void;
}) {
  const { t } = useTranslation();
  const { draft } = recognition;

  const found = Boolean(recognition.detectedPlace);
  const percent = recognition.confidence ? Math.round(recognition.confidence * 100) : null;
  const chips = draftChips(draft);
  const understoodOnly = !found && chips.length > 0;

  /* Alternatives are only worth the traveller's attention when we are genuinely unsure.
     Offering them at HIGH confidence turns a good answer into a quiz. */
  const alternatives =
    draft.band === "high"
      ? []
      : draft.candidates.filter((candidate) => candidate.poiId !== draft.destination.detectedPoiId);
  /* Every alternative is a coverage stand-in: the place was read, we just do not cover it. */
  const coverage =
    alternatives.length > 0 && alternatives.every((candidate) => candidate.kind === "coverage");

  return (
    <motion.div
      data-theme="dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="app-anchored z-50"
      role="dialog"
      aria-modal="true"
      aria-label={
        recognition.detectedPlace ??
        (understoodOnly ? t("recognition.understoodTitle") : t("recognition.failedTitle"))
      }
    >
      <MediaCard
        src={preview}
        fallbackSrc="/images/poi/hassan-ii.webp"
        alt=""
        ratio="fill"
        rounded="none"
        scrim
        scrimStrength="strong"
        sizes="(min-width: 1024px) 430px, 100vw"
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.34, ease: "easeOut" }}
        className="absolute inset-x-0 bottom-0 max-h-full overflow-y-auto px-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        {found || understoodOnly ? (
          <>
            {recognition.destination ? (
              <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.18em] text-white/75 uppercase">
                <MapPin aria-hidden className="size-3.5" />
                {t("recognition.foundIn", { city: recognition.destination })}
              </p>
            ) : null}
            <h2 className="font-display mt-2.5 text-[2.25rem] leading-[1] text-balance text-white">
              {found ? recognition.detectedPlace : t("recognition.understoodTitle")}
            </h2>

            {/* Visual clues for a photo, the day we understood for everything else. */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {percent !== null ? (
                <span className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide">
                  {t("recognition.match", { percent })}
                </span>
              ) : null}
              {(found ? recognition.labels.slice(0, 3) : []).map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/30 px-3 py-1.5 text-[0.6875rem] font-semibold text-white/85 capitalize"
                >
                  {label}
                </span>
              ))}
              {chips.slice(0, found ? 3 : 5).map((key) => (
                <span
                  key={key}
                  className="rounded-full bg-white/15 px-3 py-1.5 text-[0.6875rem] font-semibold text-white/90"
                >
                  {t(key)}
                </span>
              ))}
            </div>

            {draft.band === "low" && found ? (
              <p className="mt-3 text-[0.8125rem] leading-snug text-white/70">
                {t("recognition.unsure")}
              </p>
            ) : null}

            {alternatives.length > 0 && onPickCandidate ? (
              <div className="mt-4">
                <p className="text-[0.6875rem] font-bold tracking-[0.14em] text-white/60 uppercase">
                  {/* "Or did you mean" is a question about what they photographed. A
                      coverage candidate is not that question — we read the place fine and
                      simply do not have it — so it gets its own, honest, label. */}
                  {t(coverage ? "recognition.nearestCovered" : "recognition.orDidYouMean")}
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {alternatives.slice(0, 2).map((candidate) => (
                    <li key={candidate.poiId}>
                      <button
                        type="button"
                        onClick={() => onPickCandidate(candidate)}
                        className={cn(
                          "rounded-full border border-white/40 px-3 py-1.5 text-[0.75rem] font-semibold text-white",
                          "transition hover:bg-white/15",
                        )}
                      >
                        {candidate.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button size="lg" block className="mt-7" onClick={onConfirm}>
              {found ? t("recognition.build") : t("recognition.confirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              block
              className="mt-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={onRetry}
            >
              {found ? t("recognition.tryAnother") : t("recognition.edit")}
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-[1.75rem] leading-tight text-balance text-white">
              {t("recognition.failedTitle")}
            </h2>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-white/75 text-pretty">
              {t("recognition.failedBody")}
            </p>
            <Button size="lg" block className="mt-6" onClick={onConfirm}>
              {t("recognition.exploreInstead")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              block
              className="mt-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={onRetry}
            >
              {t("recognition.tryAnother")}
            </Button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
