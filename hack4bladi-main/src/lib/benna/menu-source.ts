import "server-only";
import { z } from "zod";
import { TIMEOUTS } from "@/config/app";
import { serverEnv } from "@/config/env";
import { boundedSignal } from "@/lib/ai/http";
import { MenuRowSchema, type GroupOffer, type MenuRow } from "@/features/benna/m3ak";
import { GROUP, kitchenById, todaysDishes, workplaceById } from "@/features/benna/data";

/**
 * Today's menu and open group order, read from Supabase's REST API (PostgREST) with the
 * anon key. Plain fetch, no supabase-js. Throws on any failure — the route turns that
 * into a clear "menu unavailable" answer rather than guessing a menu.
 *
 * Without Supabase configured (a deployment with no database), both come from data.ts: the
 * same rotation the screens show and the seed is generated from, so nothing is invented.
 */
const hasDatabase = () => Boolean(serverEnv.supabase.url && serverEnv.supabase.anonKey);

const GroupRowSchema = z.object({
  name: z.string(),
  host_name: z.string(),
  delivery_time: z.string(),
  cutoff_at: z.string(),
  capacity: z.number().int(),
});

async function read<T>(path: string, schema: z.ZodType<T>, outer?: AbortSignal): Promise<T> {
  const url = serverEnv.supabase.url;
  const key = serverEnv.supabase.anonKey;
  if (!url || !key) throw new Error("supabase not configured");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
    signal: boundedSignal(TIMEOUTS.bennaMenuMs, outer),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`supabase ${response.status}`);
  return schema.parse(await response.json());
}

export function loadTodaysMenu(workplaceId: string, signal?: AbortSignal): Promise<MenuRow[]> {
  if (!hasDatabase()) {
    const workplace = workplaceById(workplaceId);
    const rows = workplace
      ? todaysDishes(workplace).map((dish) => ({
          id: dish.id,
          name: dish.name,
          description: dish.description,
          slot: dish.slot,
          group_price_mad: dish.groupPrice,
          solo_price_mad: dish.soloPrice,
          ingredients: dish.ingredients,
          tag: dish.tag ?? null,
          image: dish.image,
          kitchen_name: kitchenById(dish.kitchenId)?.name ?? "",
          allergens: dish.allergens,
        }))
      : [];
    return Promise.resolve(rows);
  }
  const query = new URLSearchParams({ workplace_id: `eq.${workplaceId}`, select: "*" });
  return read(`todays_menu?${query}`, z.array(MenuRowSchema), signal);
}

export async function loadOpenGroup(workplaceId: string, signal?: AbortSignal): Promise<GroupOffer | null> {
  if (!hasDatabase()) {
    if (!workplaceById(workplaceId)) return null;
    const cutoffAt = new Date(Date.now() + GROUP.cutoffInMinutes * 60_000).toISOString();
    return { name: GROUP.name, host: GROUP.host, delivery: GROUP.delivery, cutoffAt, capacity: GROUP.capacity };
  }
  const query = new URLSearchParams({
    workplace_id: `eq.${workplaceId}`,
    select: "name,host_name,delivery_time,cutoff_at,capacity",
    order: "cutoff_at.asc",
    limit: "1",
  });
  const [row] = await read(`open_group_orders?${query}`, z.array(GroupRowSchema), signal);
  return row
    ? { name: row.name, host: row.host_name, delivery: row.delivery_time.slice(0, 5), cutoffAt: row.cutoff_at, capacity: row.capacity }
    : null;
}
