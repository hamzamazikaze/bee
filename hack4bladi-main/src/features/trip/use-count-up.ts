"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number towards its new value. Used for the before/after metrics: the jury
 * should see 6.4 km become 1.5 km, not watch a value flick over.
 *
 * Motion is a garnish — with `prefers-reduced-motion` the value simply lands.
 */
export function useCountUp(value: number, durationMs = 700): number {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    const from = displayRef.current;
    if (reduced || from === value) {
      displayRef.current = value;
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduced]);

  return reduced ? value : display;
}
