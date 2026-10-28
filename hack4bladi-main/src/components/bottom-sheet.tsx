"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";

/**
 * Native <dialog> + showModal(): focus trapping, Escape, inert background and the top
 * layer come from the platform. No drawer library, no focus-trap dependency.
 *
 * Pointer-usable by design — tap the scrim or the close button. There is no swipe-only
 * gesture anywhere in this app.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned under the scrolling body (a chat composer, a confirm button). */
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={onClose}
      /* `text-foreground`: a native <dialog> defaults to canvastext (black), which the
         sheet's headings inherited — dark titles on the dark sheet. */
      className="text-foreground fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-transparent"
    >
      {open ? (
        <div className="app-anchored flex flex-col justify-end">
          {/* Mouse affordance only. Keyboard closes with Escape or the labelled button
              below, so the scrim stays out of the tab order — a viewport-sized focus
              ring is not a thing anyone wants to see. */}
          <motion.div aria-hidden onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="bg-foreground/45 absolute inset-0" />
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "bg-background border-border relative mx-auto flex max-h-[92%] w-full flex-col rounded-t-[1.75rem] border-t",
              className,
            )}
          >
            {/* Grabber, then one row. The title and the close button used to carry their
                own `mt-3` / `mt-2`, so a title that wrapped to two lines sat 4px off the
                button it was crowding — `items-center` and one padding, and a two-line
                title stays balanced against a circle instead of colliding with it. */}
            <div className="flex items-center justify-between gap-4 px-5 pt-6 pb-1">
              <span
                aria-hidden
                className="bg-border absolute inset-x-0 top-2.5 mx-auto h-1 w-10 rounded-full"
              />
              <h2 className="font-display min-w-0 flex-1 text-[19px] leading-tight text-balance">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("common.close")}
                className="pressable border-border bg-surface text-muted-foreground hover:text-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-full border"
              >
                <X aria-hidden className="size-4.5" weight="bold" />
              </button>
            </div>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3",
                footer ? "pb-3" : "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              )}
            >
              {children}
            </div>
            {footer ? (
              <div className="border-border border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </dialog>
  );
}
