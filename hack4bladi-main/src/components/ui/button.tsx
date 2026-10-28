"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Hand-rolled rather than `shadcn add button`: the CLI wants to touch globals.css and
 * components.json, both Lead-owned. cva is already a dependency, so this costs nothing.
 *
 * Every size is >= 44px tall — the demo runs on a projector and on a phone.
 */
/**
 * `pressable` rather than a press of its own: the app had two press languages, this one's
 * 0.985 scale over 200ms and the utility's 0.97 over 120ms that every card, chip and map
 * control uses. On a phone the softer of the two barely registers, and two answers to
 * "did it hear me" is one too many.
 */
export const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 rounded-[0.875rem] font-semibold whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-primary text-primary-foreground hover:brightness-95",
        outline: "border border-border-strong/40 bg-surface text-foreground hover:border-primary",
        soft: "bg-surface-muted text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        quiet: "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
      },
      size: {
        sm: "h-11 px-4 text-sm",
        md: "h-12 px-5 text-sm",
        lg: "h-14 px-6 text-base",
        icon: "size-11",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}
