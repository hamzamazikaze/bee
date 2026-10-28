import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The BENNA emblem: the steaming tajine under a tarbouch, red disc in a cream ring
 * (public/icons/benna-logo.png, transparent corners). Reads on cream, white and on the
 * red desktop stage alike, so it has no mono variant.
 */
export function BrandMark({
  className,
  drawing = false,
}: {
  className?: string;
  /** Steps the emblem in. Splash only — respects prefers-reduced-motion. */
  drawing?: boolean;
}) {
  return (
    <Image
      src="/icons/benna-logo.png"
      alt=""
      aria-hidden
      width={512}
      height={512}
      draggable={false}
      className={cn("size-6 shrink-0 select-none", drawing && "step-in", className)}
    />
  );
}

/** The wordmark. Lowercase and tight, as the charter sets it. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[1.0625rem] leading-none font-bold tracking-[-0.01em] lowercase",
        className,
      )}
    >
      benna
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className="size-6" />
      <Wordmark />
    </span>
  );
}

/**
 * The drawn BENNA letters (public/icons/benna-wordmark.png) in any colour: the PNG is
 * used as a mask over `currentColor`, so `text-brand-red` gives the red header mark.
 */
export function WordmarkArt({ className }: { className?: string }) {
  const mask = "url(/icons/benna-wordmark.png) center / contain no-repeat";
  return (
    <span
      role="img"
      aria-label="BENNA"
      className={cn("block aspect-[1038/302] h-7 bg-current", className)}
      style={{ mask, WebkitMask: mask }}
    />
  );
}
