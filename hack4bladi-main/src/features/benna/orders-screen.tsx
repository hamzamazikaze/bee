"use client";

import Link from "next/link";
import { CaretRight, Receipt } from "@phosphor-icons/react";
import { MediaCard } from "@/components/media-card";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ORDER_STEPS, dishById, formatMad, workplaceById } from "./data";
import { totals, useCart, useCartHydration } from "./cart";
import { MonoTag } from "./ui";

const date = (iso: string) =>
  new Intl.DateTimeFormat("fr-MA", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(new Date(iso));

/** Every order placed on this device, newest first. */
export function OrdersScreen() {
  const hydrated = useCartHydration();
  const orders = useCart((state) => state.orders);
  const saved = orders.reduce((sum, order) => sum + (order.cancelled ? 0 : order.saved), 0);

  return (
    <PageShell nav className="px-5 pb-8">
      <header className="pt-[max(1.25rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-[1.5rem] leading-tight font-semibold tracking-[-0.02em]">Mes commandes</h1>
        {orders.length ? (
          <p className="text-muted-foreground mt-1 text-[0.875rem]">
            <span dir="ltr" className="text-primary-ink font-semibold tabular-nums">{formatMad(saved)}</span> économisés
          </p>
        ) : null}
      </header>

      {hydrated && orders.length === 0 ? (
        <section className="card mt-6 flex flex-col items-center px-6 py-10 text-center">
          <Receipt aria-hidden className="text-primary-ink size-10" />
          <p className="mt-3 text-[1.0625rem] font-semibold">Pas encore de commande</p>
          <p className="text-muted-foreground mt-1 text-sm">Choisissez un plat avant la clôture du groupe.</p>
          <Link href="/" className={cn(buttonVariants(), "mt-5 rounded-full")}>
            Voir le menu du jour
          </Link>
        </section>
      ) : null}

      <ul className="mt-5 space-y-3">
        {[...orders].reverse().map((order) => {
          const arrived = order.step >= ORDER_STEPS.length - 1;
          const first = dishById(order.lines[0]?.dishId ?? "");
          return (
            <li key={order.id}>
              <Link href={`/commande/${order.id}`} className="card flex items-center gap-3 p-3 pe-4">
                <MediaCard src={first?.image ?? ""} alt="" ratio="square" rounded="xl" ornamentSeed={order.id} className="w-16 shrink-0" sizes="64px" />
                <span className="min-w-0 flex-1">
                  <span className="text-muted-foreground block text-[0.75rem]">{date(order.at)}</span>
                  <span className="block truncate text-[0.9375rem] font-semibold">
                    {first?.name}
                    {order.lines.length > 1 ? ` + ${order.lines.length - 1}` : ""}
                  </span>
                  <span className="text-muted-foreground block truncate text-[0.8125rem]">
                    {totals(order.lines).count > 1 ? `${totals(order.lines).count} plats` : "1 plat"} · <span dir="ltr" className="tabular-nums">{formatMad(order.total)}</span> ·{" "}
                    {workplaceById(order.workplaceId)?.name.split(" · ")[0]}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <MonoTag tone={arrived ? "healthy" : "nouveau"}>{order.cancelled ? "Annulée" : arrived ? "Livrée" : "En cours"}</MonoTag>
                  <CaretRight aria-hidden className="text-muted-foreground size-4 rtl:rotate-180" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
