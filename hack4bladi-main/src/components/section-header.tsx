import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One label style for every section of a screen, so a long scroll reads as a sequence of
 * named blocks rather than a stack of unannounced widgets.
 *
 * The label whispers (uppercase eyebrow, muted); the content under it does the talking.
 * `aside` carries the one number worth putting beside the name — stops and distance for a
 * route, the day's window for a timeline.
 */
export function SectionHeader({
  label,
  aside,
  className,
}: {
  label: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 className="eyebrow text-muted-foreground">{label}</h2>
      {aside ? (
        <span className="text-muted-foreground shrink-0 text-[11px] font-semibold tabular-nums">
          {aside}
        </span>
      ) : null}
    </div>
  );
}
