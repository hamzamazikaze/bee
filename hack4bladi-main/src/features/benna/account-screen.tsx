"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Buildings, CalendarCheck, CaretRight, Coins, Palette, Sparkle, Translate, UsersThree } from "@phosphor-icons/react";
import { LanguageMenu } from "@/components/language-menu";
import { PageShell } from "@/components/page-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { formatMad, workplaceById } from "./data";
import { POINTS, pointsBalance, useCart, useCartHydration } from "./cart";

function Row({ icon, label, hint, href, children }: { icon: ReactNode; label: string; hint?: string; href?: string; children?: ReactNode }) {
  const body = (
    <>
      <span className="text-primary-ink shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {hint ? <span className="text-muted-foreground block truncate text-[0.75rem]">{hint}</span> : null}
      </span>
      {children ?? <CaretRight aria-hidden className="text-muted-foreground size-4 shrink-0 rtl:rotate-180" />}
    </>
  );
  return href ? (
    <Link href={href} className="flex min-h-15 items-center gap-3 py-2.5">
      {body}
    </Link>
  ) : (
    <div className="flex min-h-15 items-center gap-3 py-2.5">{body}</div>
  );
}

export function AccountScreen() {
  useCartHydration();
  const workplace = workplaceById(useCart((state) => state.workplaceId));
  const balance = pointsBalance(useCart((state) => state.orders));
  const customer = useCart((state) => (state.account ? state.customer : null));
  const ready = balance >= POINTS.redeem;
  const toNext = POINTS.redeem - (balance % POINTS.redeem);

  return (
    <PageShell nav className="space-y-4 px-5 pb-8">
      <header className="pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-[1.5rem] leading-tight font-semibold tracking-[-0.02em]">Mon compte</h1>
      </header>

      <section className="flex items-center gap-4">
        <Image src="/images/people/me-profile.webp" alt="" aria-hidden width={128} height={128} className="size-16 shrink-0 rounded-full object-cover" />
        <span className="min-w-0">
          <span className="block text-[1.125rem] font-semibold">{customer?.name ?? "Vous"}</span>
          <span className="text-muted-foreground block truncate text-[0.8125rem]">Profil de démonstration</span>
        </span>
      </section>

      <Link href="/points" aria-label={`Mes points : ${balance}. Échanger mes points`} className="bg-saffron-soft block rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Coins aria-hidden className="text-saffron-ink size-8 shrink-0" weight="fill" />
          <p className="min-w-0 flex-1">
            <span className="block text-[1.75rem] leading-none font-semibold tabular-nums">{balance}</span>
            <span className="text-saffron-ink block text-[0.8125rem]">points · démo</span>
          </p>
          <span className="text-saffron-ink text-end text-[0.75rem]">
            <span className="tabular-nums">{POINTS.redeem}</span> pts ={" "}
            <span dir="ltr" className="tabular-nums">
              −{formatMad(POINTS.worth)}
            </span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Vers la prochaine réduction"
          aria-valuemin={0}
          aria-valuemax={POINTS.redeem}
          aria-valuenow={ready ? POINTS.redeem : balance}
          className="bg-surface/70 mt-3 h-2 overflow-hidden rounded-full"
        >
          <div className="bg-saffron h-full rounded-full" style={{ width: `${ready ? 100 : (balance / POINTS.redeem) * 100}%` }} />
        </div>
        <span className="text-saffron-ink mt-2 block text-[0.8125rem] font-medium">
          {ready ? (
            <>
              <span dir="ltr" className="tabular-nums">
                −{formatMad(POINTS.worth)}
              </span>{" "}
              disponible au panier
            </>
          ) : (
            <>
              Encore <span className="tabular-nums">{toNext}</span> points pour{" "}
              <span dir="ltr" className="tabular-nums">
                −{formatMad(POINTS.worth)}
              </span>
            </>
          )}
        </span>
        <span className="text-saffron-ink mt-3 flex items-center justify-between border-t border-current/15 pt-3 text-[0.875rem] font-semibold">
          Échanger mes points
          <CaretRight aria-hidden className="size-4 rtl:rotate-180" />
        </span>
      </Link>

      <nav aria-label="Compte" className="card divide-border divide-y px-4">
        <Row icon={<Buildings aria-hidden className="size-5" />} label="Mon site" hint={workplace?.name ?? "Aucun lieu de travail"} href="/bienvenue" />
        <Row icon={<UsersThree aria-hidden className="size-5" />} label="Mon groupe" href="/groupe" />
        <Row icon={<CalendarCheck aria-hidden className="size-5" weight="fill" />} label="Planifier ma semaine" hint="Préférences, budget, 5 déjeuners proposés" href="/semaine" />
        <Row icon={<Sparkle aria-hidden className="size-5" weight="fill" />} label="Laboratoire IA" href="/ai" />
        <Row icon={<Translate aria-hidden className="size-5" />} label="Langue">
          <LanguageMenu />
        </Row>
        <Row icon={<Palette aria-hidden className="size-5" />} label="Apparence">
          <ThemeToggle />
        </Row>
      </nav>

      <p className="text-muted-foreground text-xs">BENNA pilote · données et paiements de démonstration.</p>
    </PageShell>
  );
}
