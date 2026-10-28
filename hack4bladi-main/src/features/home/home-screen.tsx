"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChatCircleDots, Sparkle } from "@phosphor-icons/react";
import { APP } from "@/config/app";
import { BrandLockup } from "@/components/brand";
import { LanguageMenu } from "@/components/language-menu";
import { MediaCard } from "@/components/media-card";
import { pauseIfReducedMotion, rise } from "@/components/motion";
import { PageShell } from "@/components/page-shell";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { CATEGORIES } from "@/features/explore/categories";
import { POPULAR, addSource, type Preset } from "./presets";

export function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useAppStore((state) => state.profile);
  const patchProfile = useAppStore((state) => state.patchProfile);

  /** A preset prefills onboarding. It never builds a trip on its own. */
  function choosePreset(preset: Pick<Preset, "interests">) {
    patchProfile({
      interests: preset.interests,
      destination: profile.destination ?? APP.defaultDestination,
      sources: addSource(profile.sources, "preset"),
    });
    router.push("/onboarding");
  }

  return (
    <PageShell nav className="pb-8">
      {/* Target 01: video hero with the greeting on it, and the call to action clear of
          its lower edge — the footage is the sell, so nothing sits on top of it. */}
      <section>
        <div className="relative h-[21rem] overflow-hidden">
          <video
            ref={pauseIfReducedMotion}
            className="washed absolute inset-0 size-full object-cover object-[50%_18%]"
            src="/videos/hero.mp4"
            poster="/images/hero.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label={t("home.heroImageAlt")}
          />
          <div
            aria-hidden
            className="from-background via-background/30 to-background/35 absolute inset-0 bg-gradient-to-t"
          />
          {/* Over footage the lockup is the charter's on-dark version in both themes. */}
          <div
            data-theme="dark"
            className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.875rem,env(safe-area-inset-top))]"
          >
            <BrandLockup className="gap-2 text-white [&_svg]:size-6 [&_span]:text-base" />
            {/* Seven languages do not fit as pills over a video. One glass trigger, and
                the list only exists while it is open. */}
            <LanguageMenu variant="onMedia" />
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-6">
            <p className="text-primary-ink text-base font-medium">{t("home.greeting")}</p>
            <h1 className="font-display mt-0.5 text-[1.625rem] leading-[1.15] text-balance text-foreground">
              {t("home.greetingQuestion")}
            </h1>
          </div>
        </div>
        {/* The hero's single call to action: it opens the planner fresh at step 1
            (`?new`), the same front door as the Inspiration tab.

            It sits below the video, not on it. The `-mt-7` overlap it inherited came from
            the search pill, which needed to read as an edge the hero handed you; a solid
            green block doing the same thing just cropped the footage. */}
        <div className="px-4 pt-5">
          <Link
            href="/onboarding?new"
            className="group bg-primary text-primary-foreground hover:bg-primary-hover pressable flex h-14 items-center justify-center gap-2.5 rounded-2xl px-6 text-[0.95rem] font-bold tracking-[-0.01em] shadow-[0_10px_30px_-8px_color-mix(in_srgb,var(--primary)_45%,transparent)] ring-1 ring-inset ring-white/15 transition-[transform,opacity,background-color,box-shadow] duration-200 hover:shadow-[0_14px_38px_-8px_color-mix(in_srgb,var(--primary)_60%,transparent)]"
          >
            <Sparkle
              aria-hidden
              weight="fill"
              className="size-[1.15rem] shrink-0 transition-transform duration-200 group-hover:scale-110"
            />
            {t("home.heroCta")}
          </Link>
          {/* The CTA says "we'll plan it"; it does not say "you can tell us in your own
              words". This quiet second line is the only thing on the home screen that
              still advertises the typed sentence, so it keeps the composer's own prompt
              as its label — the link promises what the next screen shows. */}
          <Link
            href="/onboarding?new"
            className="text-muted-foreground hover:text-foreground mx-auto mt-3 block w-fit text-center text-xs underline decoration-current/30 underline-offset-4 transition"
          >
            {t("home.inspirationPrompt")}
          </Link>
          {/* The other front door. The planner asks four questions and answers with a day;
              this one answers a question — and only builds a day once the conversation has
              produced one. Deliberately the quieter of the two: it is the way in for the
              traveller who does not yet know what they want to ask for. */}
          <Link
            href="/chat"
            className="border-border bg-surface hover:border-primary pressable mt-3 flex h-12 items-center justify-center gap-2 rounded-2xl border text-[0.875rem] font-semibold transition"
          >
            <ChatCircleDots aria-hidden weight="regular" className="size-[1.05rem] shrink-0" />
            {t("chat.homeCta")}
          </Link>
        </div>
      </section>

      <section className="px-4 pt-6">
        <h2 className="font-display text-base font-semibold">{t("home.exploreTitle")}</h2>
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.li key={category.id} {...rise(index)} className="shrink-0">
                {/* A browse tile browses. It used to skip straight into the planner —
                    five tiles that all looked like a shelf and all opened a wizard. */}
                <Link
                  href={`/explore/${category.id}`}
                  className="pressable group flex w-[4.25rem] flex-col items-center gap-1.5"
                >
                  <span className="border-border bg-surface text-primary-ink group-hover:border-primary grid size-12 place-items-center rounded-full border transition">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  {/* Fixed two-line box: without it "Hidden gems" wrapping shoved its neighbours up. */}
                  <span className="text-muted-foreground flex min-h-[1.6rem] items-start text-center text-[0.6875rem] leading-tight">
                    {t(category.labelKey)}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </section>

      <section className="pt-6">
        <h2 className="font-display px-4 text-base font-semibold">{t("home.suggestionsTitle")}</h2>
        <ul className="mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {POPULAR.map((preset, index) => (
            <motion.li key={preset.id} {...rise(index, 0.08, 2)} className="w-[17rem] shrink-0">
              <button type="button" onClick={() => choosePreset(preset)} className="group w-full text-start">
                <MediaCard
                  src={preset.image}
                  fallbackSrc={preset.fallbackImage}
                  alt=""
                  ratio="landscape"
                  scrim
                  washed={false}
                  className="group-hover:opacity-90 transition"
                  overlay={
                    <span className="flex size-full flex-col justify-end p-3.5">
                      <span className="block text-[0.9375rem] leading-tight font-semibold text-white">
                        {t(preset.titleKey)}
                      </span>
                      <span className="mt-1 block text-[0.6875rem] text-white/75">{t(preset.metaKey)}</span>
                    </span>
                  }
                />
              </button>
            </motion.li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
