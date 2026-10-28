"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultOptions, dishById, optionExtra, workplaceById } from "./data";
import { EMPTY_DIET, type Diet } from "./m3ak";

/** `reward`: offered against loyalty points — costs 0 MAD and `rewardCost` points at checkout. */
export type Line = { key: string; dishId: string; options: string[]; note: string; qty: number; reward?: boolean };

export type Payment = "card" | "cash";

/** Who ordered, as typed at checkout. Demo: stays on this device, sent nowhere. */
export type Customer = { name: string; phone: string };

export type Order = {
  id: string;
  at: string;
  workplaceId: string;
  lines: Line[];
  total: number;
  saved: number;
  payment: Payment;
  /** Index into ORDER_STEPS; advanced by hand in the demo. */
  step: number;
  /** Set when the eater taps "J'ai récupéré mon repas". */
  pickedUp?: boolean;
  /** Cancelled by the eater; only possible before the group closes (step 0). */
  cancelled?: boolean;
  /** Loyalty points spent on this order, and the MAD they took off `total`. */
  pointsUsed?: number;
  discount?: number;
  customer?: Customer;
  /** The eater's own verdict after pickup — never shown as a public rating. */
  rating?: "up" | "down";
  /** Shown on the presenter's /live board (QR guests only); retried until it lands. */
  relayed?: boolean;
};

/** Loyalty rule agreed with the owner (2026-10-23), demo points: 1 point per MAD paid, 100 points = 10 MAD off. */
export const POINTS = { perMad: 1, redeem: 100, worth: 10 } as const;

/** A dish exchanged for points, at the agreed rate (100 points = 10 MAD, so 10 points per MAD of group price). */
export const rewardCost = (dishId: string) => (dishById(dishId)?.groupPrice ?? 0) * (POINTS.redeem / POINTS.worth);

/** Points the reward lines in a cart will spend. */
export const rewardPoints = (lines: Line[]) => lines.reduce((sum, line) => (line.reward ? sum + rewardCost(line.dishId) * line.qty : sum), 0);

export const pointsEarned = (order: Pick<Order, "total">) => Math.floor(order.total * POINTS.perMad);

/** Derived from the orders, so a cancelled order gives back what it spent and loses what it earned. */
export function pointsBalance(orders: Order[]) {
  return orders.reduce((sum, order) => (order.cancelled ? sum : sum + pointsEarned(order) - (order.pointsUsed ?? 0)), 0);
}

type CartState = {
  workplaceId: string | null;
  /** The workplace whose group the eater joined today; adding a dish joins too. */
  joined: string | null;
  /** What this eater never wants (said once on Compte); M3AK, picks and the menu respect it. */
  diet: Diet;
  setDiet: (diet: Diet) => void;
  customer: Customer | null;
  setCustomer: (customer: Customer) => void;
  /** Points only count as "added" once the eater creates an account from the confirmation. */
  account: boolean;
  createAccount: () => void;
  /** Arrived from a QR site page (/casanearshore…): a first-time guest, so checkout asks for a name. */
  guest: boolean;
  startGuest: () => void;
  lines: Record<string, Line>;
  orders: Order[];
  setWorkplace: (id: string) => void;
  join: () => void;
  addLine: (dishId: string, options: string[], qty?: number, note?: string) => void;
  /** One offered dish per kitchen dish; false when the balance cannot cover it. */
  addReward: (dishId: string) => boolean;
  quickAdd: (dishId: string) => void;
  inc: (key: string) => void;
  dec: (key: string) => void;
  place: (payment: Payment, usePoints?: boolean) => string | null;
  advance: (orderId: string) => void;
  clear: () => void;
  pickUp: (orderId: string) => void;
  cancel: (orderId: string) => void;
  rate: (orderId: string, rating: "up" | "down") => void;
  markRelayed: (orderId: string) => void;
};

const lineKey = (dishId: string, options: string[], note: string) =>
  [dishId, [...options].sort().join(","), note.trim()].join("|");

export function linePrice(line: Pick<Line, "dishId" | "options">) {
  const dish = dishById(line.dishId);
  if (!dish) return { group: 0, solo: 0 };
  const extra = optionExtra(dish, line.options);
  return { group: dish.groupPrice + extra, solo: dish.soloPrice + extra };
}

export function totals(lines: Line[]) {
  let count = 0;
  let total = 0;
  let solo = 0;
  for (const line of lines) {
    count += line.qty;
    if (line.reward) continue;
    const price = linePrice(line);
    total += price.group * line.qty;
    solo += price.solo * line.qty;
  }
  return { count, total, saved: solo - total };
}

// ponytail: one local cart per device; a real group order needs a server (Phase 6, Supabase).
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      workplaceId: null,
      joined: null,
      diet: EMPTY_DIET,
      setDiet: (diet) => set({ diet }),
      customer: null,
      setCustomer: (customer) => set({ customer }),
      account: false,
      createAccount: () => set(({ customer }) => (customer ? { account: true } : {})),
      guest: false,
      startGuest: () => set({ guest: true }),
      lines: {},
      orders: [],
      setWorkplace: (workplaceId) => set({ workplaceId }),
      join: () => set(({ workplaceId }) => ({ joined: workplaceId })),
      addLine: (dishId, options, qty = 1, note = "") =>
        set(({ lines, workplaceId }) => {
          const key = lineKey(dishId, options, note);
          const existing = lines[key];
          return {
            joined: workplaceId,
            lines: {
              ...lines,
              [key]: { key, dishId, options, note: note.trim(), qty: (existing?.qty ?? 0) + qty },
            },
          };
        }),
      addReward: (dishId) => {
        const { lines, orders } = get();
        const dish = dishById(dishId);
        const key = `${dishId}|reward`;
        if (!dish || lines[key]) return false;
        if (pointsBalance(orders) - rewardPoints(Object.values(lines)) < rewardCost(dishId)) return false;
        set({ lines: { ...lines, [key]: { key, dishId, options: defaultOptions(dish), note: "", qty: 1, reward: true } } });
        return true;
      },
      quickAdd: (dishId) => {
        const dish = dishById(dishId);
        if (dish) get().addLine(dishId, defaultOptions(dish));
      },
      inc: (key) =>
        set(({ lines }) => (lines[key] && !lines[key].reward ? { lines: { ...lines, [key]: { ...lines[key], qty: lines[key].qty + 1 } } } : {})),
      dec: (key) =>
        set(({ lines }) => {
          const line = lines[key];
          if (!line) return {};
          const next = { ...lines };
          if (line.qty <= 1) delete next[key];
          else next[key] = { ...line, qty: line.qty - 1 };
          return { lines: next };
        }),
      place: (payment, usePoints = false) => {
        const { lines, workplaceId, orders, customer, guest, account } = get();
        const list = Object.values(lines);
        if (!list.length || !workplaceId) return null;
        const full = totals(list);
        const offered = rewardPoints(list);
        const left = pointsBalance(orders) - offered;
        if (left < 0) return null;
        const redeem = usePoints && left >= POINTS.redeem;
        const discount = redeem ? Math.min(POINTS.worth, full.total) : 0;
        const total = full.total - discount;
        const saved = full.saved;
        const code = workplaceById(workplaceId)?.code ?? "BN";
        const id = `BN-${code}-${String(Date.now()).slice(-4)}`;
        const order: Order = {
          id,
          at: new Date().toISOString(),
          workplaceId,
          lines: list,
          total,
          saved,
          payment,
          step: 0,
          // Only a QR guest's first order carries their name: it is what opens the مرحبا بيك screen and the live board.
          ...(customer && guest && !account ? { customer } : {}),
          ...(redeem || offered ? { pointsUsed: offered + (redeem ? POINTS.redeem : 0) } : {}),
          ...(redeem ? { discount } : {}),
        };
        set({ orders: [order, ...orders], lines: {} });
        return id;
      },
      advance: (orderId) =>
        set(({ orders }) => ({
          orders: orders.map((order) => (order.id === orderId ? { ...order, step: order.step + 1 } : order)),
        })),
      clear: () => set({ lines: {} }),
      pickUp: (orderId) =>
        set(({ orders }) => ({
          orders: orders.map((order) => (order.id === orderId ? { ...order, pickedUp: true } : order)),
        })),
      markRelayed: (orderId) =>
        set(({ orders }) => ({ orders: orders.map((order) => (order.id === orderId ? { ...order, relayed: true } : order)) })),
      rate: (orderId, rating) =>
        set(({ orders }) => ({ orders: orders.map((order) => (order.id === orderId ? { ...order, rating } : order)) })),
      cancel: (orderId) =>
        set(({ orders }) => ({
          orders: orders.map((order) => (order.id === orderId && order.step === 0 ? { ...order, cancelled: true } : order)),
        })),
    }),
    // Hydrated after mount (useCartHydration) so the server and first client render match.
    { name: "benna:v3:cart", skipHydration: true },
  ),
);

/** Lines as an array — select `state.lines` and pass it here, never select a fresh array. */
export const lineList = (lines: Record<string, Line>) => Object.values(lines);

const subscribeHydration = (onChange: () => void) => useCart.persist.onFinishHydration(onChange);

/** Rehydrates the persisted cart once mounted; returns true once it has. */
export function useCartHydration(): boolean {
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  return useSyncExternalStore(subscribeHydration, () => useCart.persist.hasHydrated(), () => false);
}
