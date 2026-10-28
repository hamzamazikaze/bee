"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { LanguageMenu } from "@/components/language-menu";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";

/** `rtl:rotate-180` is the only direction-aware styling in the app — the icon, not layout. */
function BackControl({ href, onBack, label }: { href?: string; onBack?: () => void; label: string }) {
  const className =
    "pressable text-foreground hover:border-primary border-border bg-surface inline-flex size-11 items-center justify-center rounded-full border";
  const icon = <ArrowLeft aria-hidden className="size-5 rtl:rotate-180"  weight="bold" />;

  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onBack} aria-label={label} className={className}>
      {icon}
    </button>
  );
}

export function AppHeader({
  eyebrow,
  title,
  backHref,
  onBack,
  action,
  showLocales = false,
  sticky = true,
}: {
  eyebrow?: string;
  title?: ReactNode;
  backHref?: string;
  onBack?: () => void;
  action?: ReactNode;
  showLocales?: boolean;
  sticky?: boolean;
}) {
  const { t } = useTranslation();
  const hasBack = Boolean(backHref || onBack);

  return (
    <header
      className={cn(
        "bg-background z-20 flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3",
        sticky && "sticky top-0",
      )}
    >
      {hasBack ? <BackControl href={backHref} onBack={onBack} label={t("common.back")} /> : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-primary-ink eyebrow">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h1 className="font-display truncate text-xl leading-tight">{title}</h1>
        ) : null}
      </div>
      {showLocales ? <LanguageMenu /> : null}
      {action}
    </header>
  );
}
