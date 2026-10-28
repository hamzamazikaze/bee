import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionTitle({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-primary-ink eyebrow">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-[1.375rem] leading-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
