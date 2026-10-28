"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import { dishById, formatMad } from "./data";

type LiveOrder = { key: string; name: string; dishes: { id: string; qty: number; name: string }[]; total: number; at: string };

const noop = () => () => {};

/** `?demo=1` in dev: fake orders built from the real menu, to see the board move without a phone. */
const DEMO_NAMES = ["Salma", "Yassine", "Nadia", "Omar", "Imane", "Karim", "Hajar", "Mehdi", "Sara", "Anas", "Kenza", "Reda"];
const DEMO_DISHES = ["couscous-7-legumes", "tajine-poulet-citron", "adass", "harira-dattes", "rfissa", "tajine-kefta"];
function demoOrder(index: number): LiveOrder {
  const dish = dishById(DEMO_DISHES[index % DEMO_DISHES.length]);
  const qty = index % 4 === 3 ? 2 : 1;
  return {
    key: `demo-${index}`,
    name: DEMO_NAMES[index % DEMO_NAMES.length],
    dishes: dish ? [{ id: dish.id, qty, name: dish.name }] : [],
    total: (dish?.groupPrice ?? 0) * qty,
    at: new Date().toISOString(),
  };
}

/** A figure that counts up to its new value instead of jumping. */
function Counter({ value, format = (n: number) => String(n) }: { value: number; format?: (n: number) => string }) {
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const shown = useTransform(spring, (n) => format(Math.round(n)));
  useEffect(() => spring.set(value), [spring, value]);
  return <motion.span className="tabular-nums">{shown}</motion.span>;
}

/**
 * Who ordered what, live, for the room's screen: a red brand panel with the running counts,
 * and the orders as they land. Listens to the ntfy.sh topic the /api/live relay publishes on
 * (`since=2h` replays what landed before the page opened). Rendered in a portal over the whole
 * window: the app's phone frame is wrong for a projector.
 */
export function LiveBoard({ topic, demo = false }: { topic: string; demo?: boolean }) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [orders, setOrders] = useState<LiveOrder[]>([]);

  useEffect(() => {
    if (!demo) return;
    let index = 0;
    const timer = window.setInterval(() => {
      const order = demoOrder(index++);
      setOrders((current) => [order, ...current]);
      if (index >= 12) window.clearInterval(timer);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [demo]);

  useEffect(() => {
    if (demo) return;
    const source = new EventSource(`https://ntfy.sh/${encodeURIComponent(topic)}/sse?since=2h`);
    source.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as { id: string; event: string; message?: string };
        if (envelope.event !== "message" || !envelope.message) return;
        const order = JSON.parse(envelope.message) as Omit<LiveOrder, "key">;
        setOrders((current) => (current.some((entry) => entry.key === envelope.id) ? current : [{ ...order, key: envelope.id }, ...current]));
      } catch {
        // Not ours, or malformed: the board just skips it.
      }
    };
    return () => source.close();
  }, [topic, demo]);

  if (!mounted) return null;

  const plates = orders.reduce((sum, order) => sum + order.dishes.reduce((n, dish) => n + dish.qty, 0), 0);
  const money = orders.reduce((sum, order) => sum + order.total, 0);
  const stats = [
    { label: "clients", value: <Counter value={orders.length} /> },
    { label: "plats commandés", value: <Counter value={plates} /> },
    { label: "commandés · paiement simulé", value: <Counter value={money} format={formatMad} /> },
  ];

  return createPortal(
    <div className="bg-background text-foreground fixed inset-0 z-[200] grid grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)] overflow-hidden">
      <aside className="bg-brand-red text-[#FFF4E6] relative flex flex-col overflow-hidden p-[4vmin]">
        <div className="flex items-center gap-[1.5vmin]">
          <Image src="/icons/benna-tajine.png" alt="" width={409} height={387} priority className="w-[8vmin] drop-shadow-[0_8px_16px_rgba(60,0,4,0.45)]" />
          <Image src="/icons/benna-wordmark.png" alt="BENNA" width={1038} height={302} priority className="h-[5.5vmin] w-auto" />
        </div>
        <p className="mt-[3vmin] flex items-center gap-[1.2vmin] text-[clamp(1rem,2.6vmin,1.75rem)] font-semibold">
          <span className="relative flex size-[1.6vmin]">
            <span className="bg-[#FFF4E6] absolute inset-0 animate-ping rounded-full opacity-75" />
            <span className="bg-[#FFF4E6] relative size-full rounded-full" />
          </span>
          {demo ? "Démo · données fictives" : "En direct · Casanearshore"}
        </p>

        <dl className="mt-auto space-y-[3.5vmin]">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dd className="text-[clamp(2.5rem,9vmin,7rem)] leading-none font-semibold tracking-[-0.03em]">{stat.value}</dd>
              <dt className="mt-[0.8vmin] text-[clamp(0.95rem,2.2vmin,1.5rem)] opacity-80">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </aside>

      <main className="relative overflow-hidden p-[4vmin]">
        {orders.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto w-[16vmin]"
              >
                <Image src="/icons/benna-logo.png" alt="" width={512} height={512} />
              </motion.div>
              <p className="text-muted-foreground mt-[3vmin] text-[clamp(1.25rem,4vmin,2.5rem)]">En attente des commandes…</p>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-[2.5vmin]">
            <AnimatePresence initial={false}>
              {orders.slice(0, 8).map((order, index) => {
                const first = dishById(order.dishes[0]?.id ?? "");
                const fresh = index === 0;
                return (
                  <motion.li
                    key={order.key}
                    layout
                    initial={{ opacity: 0, y: -60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", bounce: 0.4, duration: 0.7 }}
                    className={`card relative flex items-center gap-[2.5vmin] overflow-hidden p-[2vmin] transition-shadow duration-700 ${fresh ? "ring-brand-red shadow-xl ring-[0.4vmin]" : ""}`}
                  >
                    {first ? (
                      <motion.div
                        initial={{ rotate: -8, scale: 0.6 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", bounce: 0.5, delay: 0.15 }}
                        className="shrink-0"
                      >
                        <Image src={first.image} alt="" width={240} height={240} className="size-[14vmin] rounded-2xl object-cover" />
                      </motion.div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[clamp(1.5rem,4.5vmin,3rem)] leading-tight font-semibold">{order.name}</p>
                      <p className="text-muted-foreground mt-[0.6vmin] truncate text-[clamp(1.1rem,2.8vmin,2rem)]">
                        {order.dishes.map((dish) => (dish.qty > 1 ? `${dish.qty} × ${dish.name}` : dish.name)).join(", ")}
                      </p>
                      <p dir="ltr" className="text-primary-ink mt-[0.6vmin] text-[clamp(1.1rem,2.8vmin,2rem)] font-semibold tabular-nums rtl:text-end">
                        {formatMad(order.total)}
                      </p>
                    </div>
                    {fresh ? (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", bounce: 0.6, delay: 0.3 }}
                        className="bg-brand-red text-[#FFF4E6] absolute start-[1vmin] top-[1vmin] shadow-md rounded-full px-[1.4vmin] py-[0.5vmin] text-[clamp(0.8rem,1.8vmin,1.1rem)] font-semibold"
                      >
                        Nouveau
                      </motion.span>
                    ) : null}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </main>
    </div>,
    document.body,
  );
}
