"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown, Check, Translate } from "@phosphor-icons/react";
import { DURATION, EASE_OUT, prefersReducedMotion } from "@/components/motion";
import { LOCALES, LOCALE_FLAG, LOCALE_LABEL, LOCALE_SHORT } from "@/lib/i18n/locales";
import { useLocale, useTranslation } from "@/lib/i18n/use-translation";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/common";

/**
 * The language selector: a compact trigger and an anchored dropdown.
 *
 * WHY A DROPDOWN AND NOT SEVEN PILLS. Three languages fitted in a segmented control.
 * Seven do not — at 320px they wrap the header onto a second line and each target falls
 * under 44px. One trigger showing the current language, and a list that only exists while
 * it is open, costs the header 64px in every layout.
 *
 * WHY NOT A FLAG ALONE. A language is not a country: Arabic is not Morocco and Portuguese
 * is not Portugal. The native name is the label and always renders; the flag is a
 * recognition aid sitting beside it, never the only signal.
 *
 * ANCHORING IS LOGICAL, NOT LEFT/RIGHT. `inset-inline-end: 0` pins the panel to the
 * trigger's trailing edge, so it opens inwards from the right in French and inwards from
 * the left in Arabic without a single direction-specific rule.
 */
export function LanguageMenu({
  className,
  variant = "default",
}: {
  className?: string;
  /** `onMedia` is the glass trigger the Home hero needs over its video. Panel is unchanged. */
  variant?: "default" | "onMedia";
}) {
  const locale = useLocale();
  const setLocale = useAppStore((state) => state.setLocale);
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  /** Keyboard cursor. Separate from `locale`: you arrow past options before choosing. */
  const [active, setActive] = useState(0);
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(
    (refocus = true) => {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    },
    [],
  );

  const choose = useCallback(
    (next: Locale) => {
      // Only the store changes. No navigation, no reload: the trip, the map camera and
      // anything half-typed in the composer are still exactly where they were.
      setLocale(next);
      close();
    },
    [setLocale, close],
  );

  /* Opening puts the cursor on the current language, so ArrowDown moves from where you
     are rather than from the top of the list. Set here rather than in an effect: it is a
     consequence of the tap, not of the render. */
  function toggle() {
    setOpen((wasOpen) => {
      if (!wasOpen) setActive(Math.max(0, LOCALES.indexOf(locale)));
      return !wasOpen;
    });
  }

  useEffect(() => {
    if (!open) return;
    optionRefs.current[active]?.focus();
  }, [open, active]);

  /* A tap outside is a dismissal, and so is scrolling the screen underneath: an anchored
     panel that stays put while its trigger leaves is worse than one that simply closes. */
  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    window.addEventListener("resize", dismiss);
    document.getElementById("app-viewport")?.addEventListener("scroll", dismiss, { passive: true });
    return () => {
      window.removeEventListener("resize", dismiss);
      document.getElementById("app-viewport")?.removeEventListener("scroll", dismiss);
    };
  }, [open]);

  function onListKeyDown(event: React.KeyboardEvent) {
    const last = LOCALES.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => (index >= last ? 0 : index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => (index <= 0 ? last : index - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        // Tabbing out of a popover closes it. Focus continues where it was going.
        setOpen(false);
        break;
    }
  }

  const reduced = prefersReducedMotion();

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={`${t("home.language")}: ${LOCALE_LABEL[locale]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={cn(
          "pressable inline-flex h-11 items-center gap-1.5 rounded-full border ps-2.5 pe-2 transition",
          variant === "onMedia"
            ? "border-white/25 bg-black/30 text-white backdrop-blur-md hover:border-white/50"
            : "border-border bg-surface text-foreground hover:border-primary/60",
          open && variant === "default" && "border-primary/60 bg-surface-muted",
          open && variant === "onMedia" && "border-white/50 bg-black/45",
        )}
      >
        <Translate
          aria-hidden
          className={cn(
            "size-[1.125rem] shrink-0",
            variant === "onMedia" ? "text-white" : "text-primary-ink",
          )}
        />
        <span className="text-xs font-semibold tracking-wide">{LOCALE_SHORT[locale]}</span>
        <CaretDown
          aria-hidden
          weight="bold"
          className={cn(
            "size-3 shrink-0 transition-transform duration-200",
            variant === "onMedia" ? "text-white/70" : "text-muted-foreground",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            {/* Dismiss layer. Fixed to the whole stage so a tap anywhere closes the
                panel, and aria-hidden because Escape is the keyboard's way out. */}
            <div
              aria-hidden
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.ul
              id={listId}
              role="listbox"
              aria-label={t("home.language")}
              onKeyDown={onListKeyDown}
              initial={reduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : DURATION.ui, ease: EASE_OUT }}
              className={cn(
                "border-border bg-background absolute top-[calc(100%+0.5rem)] end-0 z-50 origin-top",
                "max-h-[min(21rem,60dvh)] w-[13.5rem] max-w-[calc(100vw-2rem)]",
                "overflow-y-auto overscroll-contain rounded-2xl border p-1.5 shadow-xl",
              )}
            >
              {LOCALES.map((code, index) => {
                const selected = code === locale;
                return (
                  <li key={code}>
                    <button
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      lang={code}
                      tabIndex={index === active ? 0 : -1}
                      onClick={() => choose(code)}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-start transition",
                        selected
                          ? "bg-primary-soft text-primary-ink"
                          : "text-foreground hover:bg-surface-muted",
                      )}
                    >
                      <span aria-hidden className="shrink-0 text-base leading-none">
                        {LOCALE_FLAG[code]}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">
                        {LOCALE_LABEL[code]}
                      </span>
                      <span
                        aria-hidden
                        className="text-muted-foreground shrink-0 text-[0.6875rem] font-semibold tracking-wider"
                      >
                        {LOCALE_SHORT[code]}
                      </span>
                      {selected ? (
                        <Check aria-hidden weight="bold" className="text-primary-ink size-4 shrink-0" />
                      ) : (
                        <span aria-hidden className="size-4 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
