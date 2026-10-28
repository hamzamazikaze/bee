"use client";

/**
 * "✦ Your day at a glance" — the two sentences under the map.
 *
 * No API, no spinner, no assistant. `dayBrief()` reads the same trip object the map and
 * the timeline render and returns sentence keys with numbers already in them, so the copy
 * is generated the moment the day is and cannot name a place, a price or a time the
 * itinerary does not contain. Cosmetic prose is not worth a network round trip, and a
 * summary that can invent things is worse than no summary on the screen a traveller is
 * about to act on.
 *
 * `omitShape` drops the "4 stops around El Jadida, 09:30 to 15:00 — 3.1 km on foot"
 * opener. On /trip every number in that sentence is already sitting in the facts strip
 * two blocks above it, and a summary whose first half repeats the screen teaches the
 * reader to skip the second half, which is the part that says something new.
 */
import { Sparkle } from "@phosphor-icons/react";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import { dayBrief, interestMatch } from "./trip-insights";
import type { WeatherSummary } from "@/types/experience";
import type { Trip } from "@/types/trip";

export function DayGlance({
  trip,
  weather,
  omitShape = false,
  className,
}: {
  trip: Trip;
  weather?: WeatherSummary | null;
  /** Skip the opening sentence when the surrounding screen already states those facts. */
  omitShape?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const localized = useLocalized();

  const match = interestMatch(trip);
  const all = dayBrief({
    trip,
    weather,
    weatherLabel: weather ? localized(weather.label) : undefined,
    interestNames: (match?.hit ?? []).map((interest) => t(`onboarding.interest.${interest}`)),
  });

  /* Never return nothing: on a day with no weather and no interest match the shape
     sentence is the only one there is, and it stays. */
  const shaped = all.filter((line) => !line.key.startsWith("shape"));
  const lines = omitShape && shaped.length > 0 ? shaped : all;

  return (
    <section
      className={cn(
        "border-border/70 bg-surface/50 flex flex-col gap-1.5 rounded-2xl border p-3.5",
        className,
      )}
    >
      <h2 className="text-primary-ink flex items-center gap-1.5 eyebrow">
        <Sparkle aria-hidden className="size-3.5" weight="fill" />
        {trip.guide?.headline || t("brief.title")}
      </h2>
      {/* The curator's own line — the one place the model talks to the traveller about
          the day it chose, including "we do not have X, so here is Y". */}
      {trip.guide?.note ? (
        <p className="text-[13px] leading-relaxed text-pretty">{trip.guide.note}</p>
      ) : null}
      <p className="text-muted-foreground text-[13px] leading-relaxed text-pretty">
        {lines.map((line) => t(`brief.${line.key}`, line.params)).join(" ")}
      </p>
    </section>
  );
}
