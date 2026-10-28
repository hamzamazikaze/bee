"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { ChoiceChip } from "@/components/choice-chip";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { InspirationComposer, profileChips } from "@/features/home";
import { APP } from "@/config/app";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import type { MessageKey } from "@/lib/i18n";
import { BUDGET_OPTIONS, INTEREST_OPTIONS, PACE_OPTIONS, TIME_OPTIONS, WALKING_OPTIONS } from "./options";
import { ProcessingScreen } from "./processing-screen";
import { MAX_INTERESTS, STEP_COUNT, initialStep, inspirationSummary, toggleInterest } from "./steps";

type Step = 1 | 2 | 3;

const TITLE_KEY: Record<Step, MessageKey> = {
  1: "onboarding.inspirationTitle",
  2: "onboarding.vibeTitle",
  3: "onboarding.dayTitle",
};

const LEAD_KEY: Record<Step, MessageKey> = {
  1: "onboarding.inspirationLead",
  2: "onboarding.vibeLead",
  3: "onboarding.dayLead",
};

/** One group of mutually exclusive, always-deselectable choices. Nothing is mandatory. */
function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; labelKey: MessageKey }[];
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend className="text-muted-foreground text-xs font-medium">{label}</legend>
      <div className="mt-2.5 flex gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option.value}
            selected={value === option.value}
            onSelect={() => onChange(value === option.value ? null : option.value)}
          >
            {t(option.labelKey)}
          </ChoiceChip>
        ))}
      </div>
    </fieldset>
  );
}

export function OnboardingFlow() {
  const { t, locale } = useTranslation();
  const router = useRouter();

  const hydrated = useAppStore((state) => state.hydrated);
  const profile = useAppStore((state) => state.profile);
  const patchProfile = useAppStore((state) => state.patchProfile);
  const setTrip = useAppStore((state) => state.setTrip);

  const [step, setStep] = useState<Step>(1);
  const [building, setBuilding] = useState(false);
  /* The Inspiration tab (`/onboarding?new`) always starts at step 1 with the composer
     open; presets still jump past what the profile already knows. `?analyze` comes from
     the home search pill and means "the sentence is already in the profile — read it". */
  const params = useSearchParams();
  const fresh = params.has("new");
  const autoAnalyze = params.has("analyze");
  const [recomposing, setRecomposing] = useState(fresh);
  const jumped = useRef(false);
  const defaulted = useRef(false);

  /* Step 3 starts from a real day — Half day · Medium · Balanced — instead of three
     nulls. Applied once per visit, so a deliberate deselection is never snapped back.
     
     Deliberately not on mount: written that early, these defaults land in the profile
     before the traveller has said anything, and the understanding layer then reads them
     as deliberate choices and refuses to overrule them. A Darija sentence saying "نهار
     كامل" came back as Half day for exactly that reason. A default is not a choice, so it
     is applied when the traveller actually reaches the step that offers it. */
  useEffect(() => {
    if (!hydrated || step !== 3 || defaulted.current) return;
    defaulted.current = true;
    patchProfile({
      timeAvailable: profile.timeAvailable ?? "half_day",
      budgetLevel: profile.budgetLevel ?? "medium",
      pace: profile.pace ?? "balanced",
    });
  }, [hydrated, step, profile, patchProfile]);

  /* Progressive profiling: if we already know the inspiration, do not ask for it again. */
  useEffect(() => {
    if (!hydrated || jumped.current || fresh) return;
    jumped.current = true;
    setStep(initialStep(profile));
  }, [hydrated, profile, fresh]);

  if (building) {
    return (
      <PageShell>
        <ProcessingScreen
          profile={{ ...profile, locale }}
          onReady={(trip) => {
            setTrip(trip);
            router.push("/trip");
          }}
        />
      </PageShell>
    );
  }

  const summary = inspirationSummary(profile);
  const showComposer = step === 1 && (recomposing || !summary);
  const chips = profileChips(profile);

  function goBack() {
    if (step === 1) router.push("/");
    else setStep((step - 1) as Step);
  }

  function goNext() {
    if (step < 3) setStep((step + 1) as Step);
  }

  const footer =
    step === 3 ? (
      <div className="space-y-2">
        <Button size="lg" block onClick={() => setBuilding(true)}>
          {t("onboarding.build")}
        </Button>
        <p className="text-muted-foreground text-center text-xs">{t("onboarding.buildHint")}</p>
      </div>
    ) : showComposer ? undefined : (
      <Button size="lg" block onClick={goNext}>
        {t("common.continue")}
      </Button>
    );

  return (
    <PageShell
      /* No tab bar here on purpose: onboarding is a focused flow, and the step-1 back
         arrow already routes home, so there is always a way out. */
      header={
        <div className="bg-background sticky top-0 z-20">
          <AppHeader sticky={false} onBack={goBack} />
          <div className="px-4 pb-4">
            <p className="text-primary-ink eyebrow">
              {t("onboarding.stepOf", { current: step, total: STEP_COUNT })}
            </p>
            <div className="mt-2.5 flex gap-1.5" aria-hidden>
              {[1, 2, 3].map((index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-500",
                    index <= step
                      ? "bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_55%,transparent)]"
                      : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      }
      footer={footer}
      className="px-4 pb-10"
    >
      <h1 className="font-display text-[2rem] leading-[1.1] tracking-tight text-balance">
        {t(TITLE_KEY[step])}
      </h1>
      {step === 1 ? (
        <p className="text-muted-foreground mt-2.5 mb-6 text-[0.9375rem] leading-relaxed">
          {t("onboarding.inspirationLead")}
          <br />
          <span className="text-primary-ink">{APP.name}</span> {t("onboarding.inspirationLeadBrand")}
        </p>
      ) : (
        <p className="text-muted-foreground mt-2 mb-6 text-[0.9375rem] text-pretty">{t(LEAD_KEY[step])}</p>
      )}

      {step === 1 ? (
        showComposer ? (
          <InspirationComposer
            autoStart={autoAnalyze}
            onDone={(options) => {
              setRecomposing(false);
              /* A photo, a mood and a link with a picture were confirmed on the reveal;
                 typed and spoken input has not been confirmed yet, so it lands on the
                 "here is what we understood" card below rather than skipping past it. */
              if (options?.advance) setStep(2);
            }}
          />
        ) : (
          <div className="border-border bg-surface rounded-lg border p-4">
            <p className="text-primary-ink eyebrow">
              {t("onboarding.detectedTitle")}
            </p>
            <p className="font-display mt-1 text-2xl leading-tight">{summary}</p>
            {profile.destination ? (
              <p className="text-muted-foreground mt-1 text-sm">
                {t("home.recognisedIn", { city: profile.destination })}
              </p>
            ) : null}
            {/* The confirmation surface for typed and spoken input: what the
                understanding layer took from it, in the same words step 2 and 3 use. */}
            {chips.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((key) => (
                  <li
                    key={key}
                    className="border-border bg-surface-muted text-muted-foreground rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold"
                  >
                    {t(key)}
                  </li>
                ))}
              </ul>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setRecomposing(true)}
            >
              {t("onboarding.change")}
            </Button>
          </div>
        )
      ) : null}

      {step === 2 ? (
        <>
          <p className="text-muted-foreground mb-3 text-xs font-medium" aria-live="polite">
            {t("onboarding.vibeChosen", {
              count: profile.interests.length,
              max: MAX_INTERESTS,
            })}
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {INTEREST_OPTIONS.map((option) => {
              const selected = profile.interests.includes(option.value);
              const Icon = option.icon;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      patchProfile({ interests: toggleInterest(profile.interests, option.value) })
                    }
                    className="pressable w-full rounded-lg"
                  >
                    <MediaCard
                      src={option.image}
                      fallbackSrc={option.fallbackImage}
                      alt=""
                      ratio="landscape"
                      rounded="lg"
                      scrim
                      overlay={
                        <span
                          className={cn(
                            "flex size-full flex-col justify-between rounded-lg p-3 transition-colors duration-300",
                            selected ? "bg-primary/35 ring-primary ring-2 ring-inset" : "bg-transparent",
                          )}
                        >
                          <span className="flex items-start justify-between">
                            <Icon aria-hidden className="size-6 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
                            {selected ? (
                              <motion.span
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-full"
                              >
                                <Check aria-hidden className="size-4"  weight="bold" />
                              </motion.span>
                            ) : null}
                          </span>
                          <span className="text-start text-sm leading-tight font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                            {t(option.labelKey)}
                          </span>
                        </span>
                      }
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {step === 3 ? (
        <div className="space-y-7">
          <OptionGroup
            label={t("onboarding.time")}
            options={TIME_OPTIONS}
            value={profile.timeAvailable}
            onChange={(timeAvailable) => patchProfile({ timeAvailable })}
          />
          <OptionGroup
            label={t("onboarding.budget")}
            options={BUDGET_OPTIONS}
            value={profile.budgetLevel}
            onChange={(budgetLevel) => patchProfile({ budgetLevel })}
          />
          <OptionGroup
            label={t("onboarding.pace")}
            options={PACE_OPTIONS}
            value={profile.pace}
            onChange={(pace) => patchProfile({ pace })}
          />
          {/* Mobility is the one preference the engine weights per POI, and the one the
              understanding layer most often hears ("not too much walking"). It is here so
              a traveller can correct what we understood without going back a screen. */}
          <OptionGroup
            label={t("onboarding.walking")}
            options={WALKING_OPTIONS}
            value={profile.walkingPreference}
            onChange={(walkingPreference) => patchProfile({ walkingPreference })}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
