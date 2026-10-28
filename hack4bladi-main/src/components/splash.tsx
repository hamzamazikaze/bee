"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { SplashSky, SplashSkyline } from "./splash-skyline";

const FADE_MS = 420;

/**
 * The opening screen on every full page load (refresh included), over the app until
 * "Commencer" is tapped. It lives in the root layout, so in-app navigation never brings
 * it back. The app is already routing behind it (Today sends a first visit to
 * /bienvenue), so the splash never owns navigation.
 *
 * Rendered visible from the server — no flash of the app before it — and dismissed by
 * writing to the DOM node: there is nothing here React needs to re-render.
 */
export function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus({ focusVisible: false } as FocusOptions);
  }, []);

  // Stays until the person taps through; the app is already routing behind it.
  function enter() {
    const element = ref.current;
    if (!element) return;
    element.style.opacity = "0";
    setTimeout(() => {
      element.style.display = "none";
    }, FADE_MS);
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="BENNA"
      className="splash-stage absolute inset-0 z-[70] h-full overflow-hidden rounded-[inherit] transition-opacity duration-[420ms] ease-out motion-reduce:transition-none"
    >
      <SplashSky />

      {/* Brand block, centred on the screen and nudged up a little. The emblem
          pops in, then the BENNA letters slide down from behind it. */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 pb-[16%] text-center">
        {/* The tajine alone, cream on the red (public/icons/benna-tajine.png: the emblem without its disc). */}
        <Image
          src="/icons/benna-tajine.png"
          alt=""
          width={409}
          height={387}
          priority
          className="splash-logo relative z-[2] w-[clamp(7rem,34vw,9rem)] drop-shadow-[0_14px_22px_rgba(60,0,4,0.45)]"
        />
        {/* The space is reserved from the start, so nothing shifts while the word arrives. */}
        <span className="relative z-[1] block overflow-hidden pt-[clamp(1rem,4.5vw,1.5rem)]">
          <span className="splash-word-inner block">
            <Image
              src="/icons/benna-wordmark.png"
              alt="BENNA"
              width={1038}
              height={302}
              priority
              className="h-[clamp(3.5rem,17vw,4.75rem)] w-auto"
            />
          </span>
        </span>
        <div className="splash-after flex w-full flex-col items-center">
          <p className="text-cream mt-[clamp(1.5rem,6vw,2rem)] text-[clamp(1.0625rem,4.6vw,1.25rem)] leading-snug font-medium opacity-90">
            Le goût de la maison,
            <br />
            là où vous travaillez.
          </p>
          <button
            type="button"
            onClick={enter}
            className="pressable bg-cream mt-[clamp(1.25rem,6vw,1.75rem)] h-11 rounded-full px-8 text-[0.9375rem] font-semibold text-[#A8060F] shadow-[0_14px_30px_-14px_rgba(60,0,4,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFF4E6]"
          >
            Commencer
          </button>
        </div>
      </div>

      <SplashSkyline className="splash-rise pointer-events-none absolute inset-x-0 bottom-0 h-[34%] w-full" />
    </div>
  );
}
