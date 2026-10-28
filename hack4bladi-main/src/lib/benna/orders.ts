import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { boundedSignal } from "@/lib/ai/http";
import { loadTodaysMenu } from "@/lib/benna/menu-source";
import type { OrderStatus, PlaceResult, Slot, WorkplaceOption } from "@/features/benna/whatsapp-flow";

/**
 * Orders and the WhatsApp agent's state, through PostgREST with the service role key.
 * The menu and slots are re-read at confirmation and the price is computed here from
 * database rows; the cutoff is also enforced by a trigger on insert.
 */

async function rest(path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown> {
  const url = serverEnv.supabase.url;
  const key = serverEnv.supabase.serviceRoleKey;
  if (!url || !key) throw new Error("supabase service role not configured");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.prefer ? { prefer: init.prefer } : {}),
    },
    signal: boundedSignal(TIMEOUTS.bennaMenuMs),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`supabase ${response.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const SlotRow = z.object({ id: z.string(), name: z.string(), delivery_time: z.string(), cutoff_at: z.string() });

export async function loadWorkplaces(): Promise<WorkplaceOption[]> {
  const rows = z
    .array(z.object({ id: z.string(), name: z.string(), code: z.string(), pickup: z.string() }))
    .parse(await rest("workplaces?select=id,name,code,pickup&order=name"));
  return rows;
}

export async function loadSlots(workplaceId: string): Promise<Slot[]> {
  const query = new URLSearchParams({
    workplace_id: `eq.${workplaceId}`,
    select: "id,name,delivery_time,cutoff_at",
    order: "cutoff_at.asc",
  });
  const rows = z.array(SlotRow).parse(await rest(`open_group_orders?${query}`));
  return rows.map((row) => ({ id: row.id, name: row.name, delivery: row.delivery_time.slice(0, 5), cutoffAt: row.cutoff_at }));
}

const OrderRow = z.object({
  id: z.string(),
  reference: z.string(),
  source: z.string(),
  customer_phone: z.string().nullable(),
  customer_name: z.string().nullable(),
  qty: z.number(),
  unit_price_mad: z.number(),
  total_mad: z.number(),
  status: z.enum(["pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"]),
  created_at: z.string(),
  dishes: z.object({ name: z.string() }),
  workplaces: z.object({ name: z.string(), code: z.string() }),
  group_orders: z.object({ delivery_time: z.string() }),
});
export type OrderView = z.infer<typeof OrderRow>;
const ORDER_SELECT = "*,dishes(name),workplaces(name,code),group_orders(delivery_time)";

export type NewOrder = {
  phone: string;
  name?: string;
  workplaceId: string;
  dishId: string;
  qty: number;
  groupId: string;
  /** The confirming WhatsApp message id. */
  key: string;
};

export async function placeOrder(input: NewOrder): Promise<PlaceResult> {
  const existing = z.array(OrderRow).parse(
    await rest(`orders?idempotency_key=eq.${encodeURIComponent(input.key)}&select=${ORDER_SELECT}`),
  );
  if (existing[0]) return { ok: true, reference: existing[0].reference, total: existing[0].total_mad };

  const [menu, slots, places] = await Promise.all([
    loadTodaysMenu(input.workplaceId),
    loadSlots(input.workplaceId),
    loadWorkplaces(),
  ]);
  const dish = menu.find((row) => row.id === input.dishId);
  if (!dish) return { ok: false, reason: "unavailable" };
  if (!slots.some((slot) => slot.id === input.groupId)) return { ok: false, reason: "closed" };

  const code = places.find((place) => place.id === input.workplaceId)?.code ?? "BN";
  const reference = `BN-${code}-${randomInt(36 ** 4).toString(36).toUpperCase().padStart(4, "0")}`;
  const unit = dish.group_price_mad;
  try {
    await rest("orders", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        reference,
        source: "whatsapp",
        customer_phone: input.phone,
        customer_name: input.name ?? null,
        workplace_id: input.workplaceId,
        group_order_id: input.groupId,
        dish_id: dish.id,
        qty: input.qty,
        unit_price_mad: unit,
        total_mad: unit * input.qty,
        idempotency_key: input.key,
      }),
    });
  } catch (error) {
    // The trigger's 'group order closed': the cutoff passed between read and insert.
    if (error instanceof Error && error.message.includes("group order closed")) return { ok: false, reason: "closed" };
    throw error;
  }
  return { ok: true, reference, total: unit * input.qty };
}

export async function recentOrders(phone: string, limit = 3): Promise<OrderView[]> {
  const query = `customer_phone=eq.${encodeURIComponent(phone)}&select=${ORDER_SELECT}&order=created_at.desc&limit=${limit}`;
  return z.array(OrderRow).parse(await rest(`orders?${query}`));
}

export async function listOrders(): Promise<OrderView[]> {
  return z.array(OrderRow).parse(await rest(`orders?select=${ORDER_SELECT}&order=created_at.desc&limit=100`));
}

/** Moves an order on only if it is still in `from`; null when someone else moved it first. */
export async function setOrderStatus(id: string, from: OrderStatus, to: OrderStatus): Promise<OrderView | null> {
  const rows = z.array(OrderRow).parse(
    await rest(`orders?id=eq.${encodeURIComponent(id)}&status=eq.${from}&select=${ORDER_SELECT}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({ status: to, updated_at: new Date().toISOString() }),
    }),
  );
  return rows[0] ?? null;
}

/* ---------- WhatsApp state ---------- */

/** Records a message id; false when it was already seen (Meta re-delivers webhooks). */
export async function firstSighting(messageId: string): Promise<boolean> {
  const rows = await rest("whatsapp_events?on_conflict=id", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=representation",
    body: JSON.stringify({ id: messageId }),
  });
  return Array.isArray(rows) && rows.length > 0;
}

export async function loadSession(waId: string): Promise<{ state: unknown; updatedAt: string } | null> {
  const rows = z
    .array(z.object({ state: z.unknown(), updated_at: z.string() }))
    .parse(await rest(`whatsapp_sessions?wa_id=eq.${encodeURIComponent(waId)}&select=state,updated_at`));
  return rows[0] ? { state: rows[0].state, updatedAt: rows[0].updated_at } : null;
}

export async function saveSession(waId: string, state: unknown): Promise<void> {
  await rest("whatsapp_sessions?on_conflict=wa_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ wa_id: waId, state, updated_at: new Date().toISOString() }),
  });
}
