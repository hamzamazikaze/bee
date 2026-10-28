"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The one selection control. A real <button> with aria-pressed — keyboard, screen reader
 * and mouse all work without a single custom handler.
 */
export function ChoiceChip({
  selected,
  onSelect,
  children,
  icon,
  disabled,
  className,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "pressable inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-center text-[0.8125rem] leading-tight font-semibold transition disabled:opacity-40",
        selected
          ? "border-primary bg-primary-soft text-primary-ink"
          : "border-border bg-surface text-muted-foreground hover:border-primary/50 hover:text-foreground",
        className,
      )}
    >
      {icon}
      <span className="text-balance">{children}</span>
    </button>
  );
}
