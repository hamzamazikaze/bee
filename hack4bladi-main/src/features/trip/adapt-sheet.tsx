"use client";

/**
 * Adapt My Day. All four options are implemented; each one either changes the day or
 * says exactly why it cannot (docs/MASTER_BRIEF.md).
 *
 * The sheet is self-contained: it reads the trip from the store and writes the result
 * back through applyAdaptation(), so mounting it is `<AdaptSheet />` and nothing else.
 * It works with a mouse — click the trigger, click an option, click the overlay or Close
 * to dismiss, Escape to cancel. Dragging is a bonus, never the only way out.
 */
import { useState } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { Bicycle, ChatCircleDots, CloudRain, Footprints, Timer, Wallet } from "@phosphor-icons/react";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { ADAPTATION_TYPES, adapt } from "@/lib/adaptation";
import { revealRouteMap } from "@/features/map";
import { useLocalized, useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { AdaptationType } from "@/types/adaptation";
import type { LocalizedText } from "@/types/common";

const ICON: Record<AdaptationType, typeof Footprints> = {
  less_walking: Footprints,
  less_time: Timer,
  spend_less: Wallet,
  rainy_day: CloudRain,
};

export interface AdaptSheetProps {
  className?: string;
  /** Filled where Adapt is the primary action (/experience); outline beside Start trip. */
  variant?: ButtonProps["variant"];
  /** Replace the default trigger button; anything clickable works. */
  trigger?: React.ReactNode;
}

export function AdaptSheet({ className, variant = "primary", trigger }: AdaptSheetProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const trip = useAppStore((state) => state.trip);
  const applyAdaptation = useAppStore((state) => state.applyAdaptation);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<AdaptationType | null>(null);
  const [rejected, setRejected] = useState<LocalizedText | null>(null);

  async function choose(type: AdaptationType) {
    if (!trip || pending) return;
    setPending(type);
    setRejected(null);

    const result = await adapt({ type, trip });
    setPending(null);

    if (result.applied) {
      // The store snapshots the day before swapping it, so Undo is a restore.
      applyAdaptation(result);
      setOpen(false);
      /* The rewritten route is the point. Bring it into view rather than redrawing it
         under the action bar. */
      revealRouteMap();
      return;
    }

    // A rejection is shown here rather than pushed into the store: recording it would
    // clear the headline and the Undo of an adaptation that is still in effect.
    setRejected(result.reason ?? null);
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRejected(null);
      }}
    >
      <Drawer.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(buttonVariants({ variant, size: "md", block: true }), className)}
          >
            <Bicycle className="size-4" aria-hidden />
            {t("trip.adaptTitle")}
          </button>
        )}
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="app-anchored z-40 bg-black/45" />
        <Drawer.Content
          /* `[&::after]:hidden` removes vaul's overscroll backfill, which paints below
             the sheet and spilled past the device shell on desktop. */
          className="bg-background border-border fixed z-50 mx-auto flex flex-col overflow-hidden rounded-t-[1.75rem] border-t outline-none [&::after]:hidden"
          style={{
            insetInline: 0,
            width: "var(--app-w)",
            maxWidth: "100%",
            bottom: "var(--app-inset-block)",
          }}
          aria-describedby={undefined}
        >
          <div className="bg-border mx-auto mt-2.5 h-1 w-10 rounded-full" aria-hidden />

          <div className="flex flex-col gap-3 p-5 pb-8">
            <Drawer.Title className="font-display text-xl">{t("trip.adaptTitle")}</Drawer.Title>
            <p className="text-muted-foreground -mt-2 text-sm">{t("trip.adaptIntro")}</p>

            <div className="grid grid-cols-2 gap-2">
              {ADAPTATION_TYPES.map((type) => {
                const Icon = ICON[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => choose(type)}
                    disabled={pending !== null || !trip}
                    aria-busy={pending === type}
                    className={cn(
                      "pressable bg-surface border-border hover:border-primary flex min-h-20 flex-col items-start justify-center gap-1.5 rounded-xl border p-3 text-start disabled:opacity-60",
                      pending === type && "border-primary",
                    )}
                  >
                    <Icon className="text-primary-ink size-5" aria-hidden />
                    <span className="text-sm font-semibold">{t(`trip.adapt.${type}`)}</span>
                  </button>
                );
              })}
            </div>

            {/* The four presets cover the common asks; everything else is a sentence to
                the guide, who already knows the day on screen and can rebuild it. */}
            <Link
              href="/chat"
              className="pressable bg-surface border-border hover:border-primary flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-sm font-semibold"
            >
              <ChatCircleDots className="text-primary-ink size-5 shrink-0" aria-hidden />
              {t("chat.adaptCta")}
            </Link>

            {rejected && (
              <p
                role="status"
                className="bg-surface-muted text-muted-foreground rounded-lg p-3 text-sm"
              >
                <span className="text-foreground block font-semibold">
                  {t("trip.adaptUnavailable")}
                </span>
                {localized(rejected)}
              </p>
            )}

            <Drawer.Close className="text-muted-foreground min-h-11 text-sm font-semibold">
              {t("common.close")}
            </Drawer.Close>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
