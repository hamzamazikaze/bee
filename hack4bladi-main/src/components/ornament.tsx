/**
 * The Moroccan graphic language: an eight-point zellige star, a rhythm band built from
 * it, and a pointed-arch clip path used to frame imagery.
 *
 * Everything is drawn in `currentColor` so callers tint with a token class
 * (`text-primary-ink/15`, `text-primary-ink/20`). No hex ever enters a component.
 */

export const ARCH_CLIP_ID = "siyaha-arch";

/** Rendered once per page by <PageShell>. objectBoundingBox = usable on any element. */
export function OrnamentDefs() {
  return (
    <svg aria-hidden className="pointer-events-none absolute size-0" focusable="false">
      <defs>
        <clipPath id={ARCH_CLIP_ID} clipPathUnits="objectBoundingBox">
          <path d="M0,1 L0,0.46 C0,0.2 0.19,0.05 0.5,0 C0.81,0.05 1,0.2 1,0.46 L1,1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

/** Use with `style={{ clipPath: archClip }}` on any framed image container. */
export const archClip = `url(#${ARCH_CLIP_ID})`;

/** The khatim: two squares, one rotated 45deg — the real zellige eight-point star. */
export function ZelligeStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className} fill="none" focusable="false">
      <rect x="10" y="10" width="28" height="28" stroke="currentColor" strokeWidth="1.5" />
      <rect
        x="10"
        y="10"
        width="28"
        height="28"
        transform="rotate(45 24 24)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="24" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** A quiet horizontal rhythm mark. Decorative only. */
export function ZelligeBand({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 24"
      preserveAspectRatio="none"
      aria-hidden
      className={className}
      focusable="false"
    >
      <defs>
        <pattern id="siyaha-band" width="40" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M20 2 33 12 20 22 7 12Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path d="M0 12 H4 M36 12 H40" stroke="currentColor" strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect width="320" height="24" fill="url(#siyaha-band)" />
    </svg>
  );
}

/** Large, very low-contrast backdrop geometry. Home + Passport only. */
export function ZelligeField({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden
      className={className}
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
    >
      <defs>
        <pattern id="siyaha-field" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 4 56 30 30 56 4 30Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M30 16 44 30 30 44 16 30Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="30" cy="30" r="3" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="240" height="240" fill="url(#siyaha-field)" />
    </svg>
  );
}
