"use client";

import Image from "next/image";
import { BrandMark } from "./brand";
import { useTranslation } from "@/lib/i18n/use-translation";

/**
 * The desktop caption beside the device. Atmosphere, not a website: a mark, the
 * wordmark, one line. Nothing here is interactive and nothing competes with the
 * application.
 *
 * Drawn in the palette's own muted ink rather than white — this shell stands the
 * column on the ivory ground, not on a dark stage, so white would be invisible.
 * Hidden below the breakpoint where the app owns the whole viewport.
 */
export function StageBrand() {
  const { t, locale } = useTranslation();

  return (
    <>
      {/* Watermark on the far side, so the caption never sits on top of it. */}
      <BrandMark className="pointer-events-none absolute end-[-7rem] bottom-[-9rem] hidden size-[32rem] opacity-[0.08] lg:block" />
      {/* The caption owns the space between the window edge and the device (the phone is
          ~24rem wide), centred in it on both axes, sized with the window. */}
      <div className="pointer-events-none absolute inset-y-0 start-0 hidden w-[calc(50%-12rem)] items-center justify-center px-8 text-(--stage-ink) lg:flex">
        <div className="flex max-w-[24rem] flex-col gap-[clamp(1.5rem,3vh,2.25rem)]">
          <span className="flex items-center gap-[clamp(0.875rem,1.4vw,1.25rem)]">
            <BrandMark className="size-[clamp(4.5rem,6.5vw,6.5rem)]" />
            <span className="flex flex-col gap-1.5">
              {/* The drawn BENNA letters (public/icons/benna-wordmark.png, cream on transparent). */}
              <Image src="/icons/benna-wordmark.png" alt="BENNA" width={1038} height={302} priority className="h-[clamp(2.5rem,3.6vw,3.5rem)] w-auto" />
              {/* The name as it is said, in Marhey's rounded Arabic to match the letters above. */}
              <span lang="ar" dir="rtl" className="text-saffron self-start font-[family-name:var(--font-marhey)] text-[clamp(2rem,3vw,2.875rem)] leading-[1.1] font-bold">
                بنّة
              </span>
            </span>
          </span>
          {/* A small zellige star between the name and the promise. */}
          <span aria-hidden className="flex items-center gap-2.5 opacity-70">
            <span className="h-px w-12 bg-current" />
            <svg viewBox="0 0 16 16" className="text-saffron size-4 fill-current">
              <path d="M8 0l2.2 3.4L14 2l-1.4 3.8L16 8l-3.4 2.2L14 14l-3.8-1.4L8 16l-2.2-3.4L2 14l1.4-3.8L0 8l3.4-2.2L2 2l3.8 1.4z" />
            </svg>
            <span className="h-px w-12 bg-current" />
          </span>
          <span className="flex flex-col gap-3">
            <span className="text-[clamp(1.125rem,1.6vw,1.5rem)] leading-snug text-balance">{t("common.tagline")}</span>
            {/* Darija, playing on the name: "the benna of home, all the way to work". */}
            {locale !== "ar" ? (
              <span lang="ar" dir="rtl" className="text-saffron self-start font-[family-name:var(--font-marhey)] text-[clamp(1.25rem,1.8vw,1.75rem)] leading-snug">
                بنّة الدار، حتى لبلاصة الخدمة
              </span>
            ) : null}
          </span>
        </div>
      </div>
    </>
  );
}
