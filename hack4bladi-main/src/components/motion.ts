"use client";

/**
 * The product's one entrance, and the durations everything else measures itself against.
 *
 * Screens that animate must use this rather than inventing a duration each —
 * `trip-timeline`, `experience-screen` and `recognition-reveal` had already converged on
 * the same 0.32–0.35s ease-out rise, and this is that agreement written down.
 */

/**
 * Four durations, one per job. Named after what the motion is *for*, not how long it runs,
 * so a call site cannot pick "300ms" because it felt right.
 *
 *  - `fast`       a control acknowledging a tap. Below ~160ms it reads as instant.
 *  - `ui`         a component changing state in place — a chip, a row, a disclosure.
 *  - `navigation` content arriving from somewhere: a screen, a sheet, a reveal.
 *  - `emphasis`   the few moments the product wants noticed. Used sparingly.
 */
export const DURATION = {
  fast: 0.12,
  ui: 0.2,
  navigation: 0.34,
  emphasis: 0.5,
} as const;

/** Content settling into place. Never for something leaving. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * True when the reader has asked for less movement.
 *
 * `<MotionConfig reducedMotion="user">` in `PageShell` is not enough on its own: Motion
 * strips transforms and leaves opacity and delays alone, so with reduced motion on, the
 * timeline still sat at opacity 0 and still waited its turn — measured at `[0.24, 0, 0, 0]`
 * 400ms in. Anything that *delays* content has to check this itself.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ref for decorative autoplay loops: under reduced motion they hold on the poster frame. */
export function pauseIfReducedMotion(video: HTMLVideoElement | null): void {
  if (!video || !prefersReducedMotion()) return;
  video.autoplay = false;
  video.pause();
}

/** Rise-and-fade. The y is small on purpose — content settles, it does not fly in. */
export const RISE = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
} as const;

/**
 * A staggered member of a list.
 *
 * The stagger is **capped**: an Explore shelf can hold twenty-one cards, and twenty-one ×
 * 60 ms is over a second of a jury watching a grid assemble itself. The first few carry
 * the rhythm; everything after them arrives with the last of them.
 *
 * `cap` is that count, and it should be roughly what the reader can actually see. A
 * horizontal shelf shows two cards at 390px, so staggering six of them spends two thirds
 * of the rhythm off the side of the screen.
 *
 * Under reduced motion the content is simply there — no offset, no fade, no waiting.
 */
export function rise(index = 0, base = 0, cap = 6) {
  if (prefersReducedMotion()) return {};
  return {
    ...RISE,
    transition: {
      delay: base + Math.min(index, cap) * 0.06,
      duration: DURATION.navigation,
      ease: EASE_OUT,
    },
  } as const;
}

/**
 * The same entrance, spent where someone is watching.
 *
 * `rise()` runs on mount, which is right for a shelf at the top of a screen and wrong for
 * anything below the fold — the /trip timeline played its whole cascade at y≈953 of an
 * 844px viewport and was already finished by the time the reader scrolled to it. `once`
 * means scrolling back up never replays it.
 */
export function riseInView(index = 0, base = 0, cap = 6) {
  if (prefersReducedMotion()) return {};
  return {
    initial: RISE.initial,
    whileInView: RISE.animate,
    viewport: { once: true, amount: 0.35 },
    transition: {
      delay: base + Math.min(index, cap) * 0.06,
      duration: DURATION.navigation,
      ease: EASE_OUT,
    },
  } as const;
}
