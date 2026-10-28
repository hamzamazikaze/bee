import Link from "next/link";
import { serverEnv } from "@/config/env";
import { listOrders } from "@/lib/benna/orders";
import { statusLabel, type OrderStatus } from "@/features/benna/whatsapp-flow";
import { cn } from "@/lib/utils";
import { moveOrder } from "./actions";

export const metadata = { title: "BENNA · Commandes", robots: { index: false } };

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }[]>> = {
  pending: [{ to: "confirmed", label: "Accepter" }, { to: "cancelled", label: "Refuser" }],
  confirmed: [{ to: "preparing", label: "En préparation" }, { to: "cancelled", label: "Annuler" }],
  preparing: [{ to: "delivering", label: "En livraison" }],
  delivering: [{ to: "delivered", label: "Livrée" }],
};

/** The kitchen's three piles. */
const TABS: { id: string; label: string; statuses: OrderStatus[] }[] = [
  { id: "attente", label: "En attente", statuses: ["pending"] },
  { id: "cours", label: "En cours", statuses: ["confirmed", "preparing", "delivering"] },
  { id: "terminees", label: "Terminées", statuses: ["delivered", "cancelled"] },
];

const time = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", timeStyle: "short" }).format(new Date(iso));

/** /admin/commandes?token=… — every order, any channel; the kitchen accepts and advances them here. */
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; tab?: string }> }) {
  const { token, tab } = await searchParams;
  if (!serverEnv.benna.adminToken || token !== serverEnv.benna.adminToken) {
    return <main className="p-6 text-sm">Accès refusé. Ouvrez /admin/commandes?token=… (BENNA_ADMIN_TOKEN).</main>;
  }
  const orders = await listOrders();
  const current = TABS.find((entry) => entry.id === tab) ?? TABS[0];
  const shown = orders.filter((order) => current.statuses.includes(order.status));

  return (
    <main className="bg-background min-h-full space-y-4 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8">
      <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em]">Commandes du jour</h1>

      <nav aria-label="Statut" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {TABS.map((entry) => {
          const count = orders.filter((order) => entry.statuses.includes(order.status)).length;
          const active = entry.id === current.id;
          return (
            <Link
              key={entry.id}
              href={`/admin/commandes?token=${encodeURIComponent(token)}&tab=${entry.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[0.8125rem] font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-surface border-border border",
              )}
            >
              {entry.label} ({count})
            </Link>
          );
        })}
      </nav>

      {!shown.length && <p className="text-muted-foreground text-sm">Aucune commande ici pour le moment.</p>}
      <ul className="space-y-3">
        {shown.map((order) => (
          <li key={order.id} className="card p-4 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <strong className="font-mono">#{order.reference}</strong>
              <span className="text-muted-foreground tabular-nums">{time(order.created_at)}</span>
            </div>
            <p className="mt-1 text-[1rem] font-semibold">{order.dishes.name}</p>
            <p>
              {order.qty}× · <strong>{order.total_mad} DH</strong>{" "}
              <span className="text-muted-foreground">(espèces, test)</span>
            </p>
            <p className="text-muted-foreground mt-1 text-[0.8125rem]">
              {statusLabel("fr", order.status)} · {order.workplaces.name} · livraison {order.group_orders.delivery_time.slice(0, 5)} ·{" "}
              {order.source}
              {order.customer_name ? ` · ${order.customer_name}` : ""}
              {order.customer_phone ? ` · +${order.customer_phone}` : ""}
            </p>
            {NEXT[order.status]?.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(NEXT[order.status] ?? []).map((move) => (
                  <form key={move.to} action={moveOrder}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="from" value={order.status} />
                    <input type="hidden" name="to" value={move.to} />
                    <button
                      className={cn(
                        "h-11 w-full rounded-xl text-[0.875rem] font-semibold",
                        move.to === "cancelled"
                          ? "bg-accent-red-soft text-accent-red"
                          : "bg-primary text-primary-foreground hover:bg-primary-hover",
                      )}
                    >
                      {move.label}
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
