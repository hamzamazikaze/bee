"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  BookmarkSimple as Bookmark,
  CaretRight as ChevronRight,
  Coins,
  Compass,
  Translate as Languages,
  Lock,
  Palette,
  SignOut as LogOut,
  SlidersHorizontal,
  Stamp,
  User,
  type Icon as LucideIcon,
} from "@phosphor-icons/react";
import { AppHeader } from "@/components/app-header";
import { LanguageMenu } from "@/components/language-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { PageShell } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { ZelligeField, ZelligeStar } from "@/components/ornament";
import { WalletSheet } from "@/features/wallet";
import { useAppStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";
import { TRIP_STOP_COUNT } from "@/types/trip";
import type { PassportStamp } from "@/types/experience";

/** Hand-stamped, not print-aligned. Deterministic so it never jitters between renders. */
const TILT = [-4, 3.5, -2.5, 5, -3, 2] as const;

function formatDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
}

function StampBadge({ stamp, index }: { stamp: PassportStamp; index: number }) {
  const { t, locale } = useTranslation();
  return (
    <motion.li
      initial={{ scale: 1.5, opacity: 0, rotate: 0 }}
      animate={{ scale: 1, opacity: 1, rotate: TILT[index % TILT.length] }}
      transition={{ delay: 0.08 * index, type: "spring", stiffness: 260, damping: 18 }}
      className="flex justify-center"
    >
      <div className="border-saffron text-saffron relative grid aspect-square w-full max-w-40 place-items-center rounded-full border-[3px] p-4 text-center">
        <span
          aria-hidden
          className="border-saffron/45 absolute inset-1.5 rounded-full border border-dashed"
        />
        <ZelligeStar className="text-saffron/20 absolute size-24" />
        <span className="relative">
          <span className="font-display block text-sm leading-tight text-balance">
            {stamp.poiName}
          </span>
          <span className="mt-1 block text-[0.625rem] tracking-[0.18em] uppercase">
            {stamp.city}
          </span>
          <span className="text-saffron mt-1 block text-[0.625rem]">
            {t("passport.visitedOn", { date: formatDate(stamp.visitedAt, locale) })}
          </span>
        </span>
      </div>
    </motion.li>
  );
}

/** A still-locked slot: shows the collection has a fixed size and how a stamp will look. */
function EmptySlot({ index }: { index: number }) {
  const { t } = useTranslation();
  return (
    <li className="flex justify-center">
      <div className="border-border text-muted-foreground relative grid aspect-square w-full max-w-40 place-items-center rounded-full border-[3px] border-dashed p-4 text-center">
        <span
          aria-hidden
          className="border-border/60 absolute inset-1.5 rounded-full border border-dashed"
        />
        <span
          aria-hidden
          className="text-muted-foreground/15 font-display absolute text-5xl leading-none"
        >
          {index + 1}
        </span>
        <span className="relative flex flex-col items-center gap-1">
          <Lock aria-hidden className="size-5" />
          <span className="text-[0.625rem] tracking-[0.18em] uppercase">
            {t("passport.locked")}
          </span>
        </span>
      </div>
    </li>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  href,
  end,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  href?: string;
  end?: ReactNode;
}) {
  const body = (
    <>
      <span className="bg-surface-muted text-primary-ink grid size-10 shrink-0 place-items-center rounded-md">
        <Icon aria-hidden className="size-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {hint ? <span className="text-muted-foreground block text-xs">{hint}</span> : null}
      </span>
      {end ?? <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" />}
    </>
  );
  const className = "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start";
  return href ? (
    <Link href={href} className={cn(className, "hover:bg-surface-muted/60 transition")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function PassportScreen() {
  const { t } = useTranslation();
  const stamps = useAppStore((state) => state.passport.stamps);
  const profile = useAppStore((state) => state.profile);
  const resetAll = useAppStore((state) => state.resetAll);
  const wallet = useAppStore((state) => state.wallet);
  const [confirmReset, setConfirmReset] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const subtitle = profile.destination
    ? `${profile.destination} · ${t("passport.stampsLine", { count: stamps.length, total: TRIP_STOP_COUNT })}`
    : t("passport.region");

  const collected = stamps.length;
  const total = TRIP_STOP_COUNT;
  const progressPct = Math.round((Math.min(collected, total) / total) * 100);
  const complete = collected >= total;

  return (
    <PageShell
      nav
      header={<AppHeader backHref="/" title={t("nav.profile")} />}
      className="px-4 pb-10"
    >
      {/* Identity */}
      <section className="flex items-center gap-4 pt-1 pb-6">
        <span className="bg-primary-soft text-primary-ink ring-primary/40 grid size-16 shrink-0 place-items-center rounded-full ring-2">
          <User aria-hidden className="size-7" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-[1.375rem] leading-tight">{t("passport.guest")}</h2>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">{subtitle}</p>
        </div>
      </section>

      {/* Passport — the collection is always drawn as a fixed board of four slots, so the
          goal (one stamp per finished stop) is legible before the first one is earned:
          filled stamps sit next to still-locked slots, with a progress bar above. */}
      <section className="border-border bg-surface relative overflow-hidden rounded-lg border">
        <ZelligeField className="text-primary-ink/10 pointer-events-none absolute inset-0 size-full" />
        <div className="relative flex items-start gap-3 p-4">
          <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-md">
            <Stamp aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base leading-tight">{t("passport.title")}</p>
            <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
              {t("passport.subtitle")}
            </p>
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="bg-surface-muted h-1.5 flex-1 overflow-hidden rounded-full">
                <span
                  className="bg-primary block h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </span>
              <span className="text-primary-ink eyebrow shrink-0">
                {t("passport.collected", { count: collected, total })}
              </span>
            </div>
          </div>
        </div>

        <ul className="relative grid grid-cols-2 gap-x-4 gap-y-6 border-t px-4 py-5">
          {Array.from({ length: TRIP_STOP_COUNT }).map((_, index) => {
            const stamp = stamps[index];
            return stamp ? (
              <StampBadge key={stamp.poiId} stamp={stamp} index={index} />
            ) : (
              <EmptySlot key={`slot-${index}`} index={index} />
            );
          })}
        </ul>

        {!complete && (
          <div className="relative flex items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-muted-foreground text-xs text-pretty">{t("passport.emptyBody")}</p>
            <Link href="/" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
              {t("passport.backHome")}
            </Link>
          </div>
        )}
      </section>

      {/* Khotwa Wallet — rewards earned by taking part, next to the memories of where. */}
      <button
        type="button"
        onClick={() => setWalletOpen(true)}
        className="border-border bg-surface hover:border-primary/50 mt-4 flex w-full items-center gap-3 rounded-lg border p-4 text-start transition"
      >
        <span className="bg-saffron-soft text-saffron grid size-10 shrink-0 place-items-center rounded-md">
          <Coins aria-hidden className="size-5" weight="fill" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-display block text-base leading-tight">{t("wallet.title")}</span>
          <span className="text-saffron eyebrow mt-0.5 block">
            {t("wallet.balance", { count: wallet.balance })}
          </span>
        </span>
        <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" weight="bold" />
      </button>

      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} />

      {/* Settings */}
      <section className="border-border bg-surface divide-border mt-4 divide-y overflow-hidden rounded-lg border">
        <Row
          icon={SlidersHorizontal}
          label={t("passport.preferences")}
          hint={t("passport.preferencesHint")}
          href="/onboarding?new"
        />
        <Row icon={Bookmark} label={t("passport.saved")} href="/saved" />
        <Row icon={Compass} label={t("passport.explore")} href="/explore" />
        <Row icon={Languages} label={t("passport.language")} end={<LanguageMenu />} />
        <Row icon={Palette} label={t("passport.theme")} end={<ThemeToggle />} />
      </section>

      {/* Reset */}
      <section className="mt-6">
        {confirmReset ? (
          <div className="border-danger/40 bg-surface rounded-lg border p-4">
            <p className="text-muted-foreground text-sm text-pretty">{t("passport.resetHint")}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmReset(false)}>
                {t("common.close")}
              </Button>
              <Button
                className="bg-danger text-primary-foreground hover:bg-danger flex-1"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                }}
              >
                {t("passport.reset")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            block
            className="text-danger border-danger/30 hover:border-danger"
            onClick={() => setConfirmReset(true)}
          >
            <LogOut aria-hidden className="size-4 rtl:rotate-180" />
            {t("passport.reset")}
          </Button>
        )}
      </section>
    </PageShell>
  );
}
