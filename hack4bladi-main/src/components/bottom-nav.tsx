"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, ForkKnife, Sparkle, UserCircle, UsersThree, type Icon } from "@phosphor-icons/react";
import { useCart } from "@/features/benna/cart";
import { M3akSheet } from "@/features/benna/m3ak-sheet";
import type { MessageKey } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/use-translation";
import { cn } from "@/lib/utils";

type Tab = { href: string; icon: Icon; labelKey: MessageKey; match: (path: string) => boolean };

/* BENNA: four destinations around the M3AK button. The cart is the footer pill, not a tab;
   orders live under Compte → Mes commandes and the AI lab under Compte, so tomorrow's poll has a tab. */
const LEFT: Tab[] = [
  { href: "/", icon: ForkKnife, labelKey: "nav.today", match: (path) => path === "/" },
  { href: "/groupe", icon: UsersThree, labelKey: "nav.group", match: (path) => path.startsWith("/groupe") },
];
const RIGHT: Tab[] = [
  { href: "/sondage", icon: ChartBar, labelKey: "nav.poll", match: (path) => path.startsWith("/sondage") },
  { href: "/compte", icon: UserCircle, labelKey: "nav.account", match: (path) => path.startsWith("/compte") },
];

/**
 * A white tab bar on a hairline: icon over a short label, selection shown by weight (fill
 * icon) plus colour. In the middle, M3AK sits raised in the brand red and opens the
 * assistant over whatever screen you are on.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  // A QR guest (benna.ma/<site>) stays on the order path: no tabs into the rest of the app until they have an account.
  const guest = useCart((state) => state.guest && !state.account);
  // The jury deployment publishes only the order path, so its tabs would all bounce back.
  if (guest || process.env.NEXT_PUBLIC_BENNA_SCOPE === "jury") return null;

  const tab = ({ href, icon: Icon, labelKey, match }: Tab) => {
    const active = match(pathname);
    return (
      <li key={href} className="flex-1">
        <Link
          href={href}
          // Every page is dynamic (the layout reads the theme cookie), so the default prefetch stops
          // short and a tab tap waits on the server. Four tabs are cheap to load in full.
          prefetch
          aria-current={active ? "page" : undefined}
          className={cn(
            "pressable flex h-12 flex-col items-center justify-center gap-0.5",
            active ? "text-primary-ink" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon aria-hidden size={20} weight={active ? "fill" : "regular"} />
          <span className="text-[0.6875rem] font-medium">{t(labelKey)}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label={t("nav.label")}
      className="border-border bg-surface border-t pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:px-4 lg:pb-3"
    >
      <ul className="mx-auto flex max-w-md">
        {LEFT.map(tab)}
        <li className="flex-1">
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="pressable relative flex h-12 w-full flex-col items-center justify-end gap-0.5 pb-1"
          >
            <span className="bg-brand-red ring-surface absolute -top-4 grid size-11 place-items-center rounded-full text-white shadow-[0_10px_22px_-10px_rgba(168,6,15,0.85)] ring-4">
              <Sparkle aria-hidden size={20} weight="fill" />
            </span>
            <span className="text-accent-red text-[0.6875rem] font-semibold">M3AK</span>
          </button>
        </li>
        {RIGHT.map(tab)}
      </ul>
      <M3akSheet open={asking} onClose={() => setAsking(false)} />
    </nav>
  );
}
