import { z } from "zod";
import { serverEnv } from "@/config/env";
import { dishById, workplaceById } from "@/features/benna/data";

const Order = z.object({
  name: z.string().trim().min(1).max(30),
  workplaceId: z.string(),
  dishes: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(3) })).min(1).max(3),
});

/**
 * POST /api/live — a QR guest's order, relayed to the presenter's /live board through ntfy.sh.
 *
 * No database: ntfy only relays. First name and dishes, never the phone; the total is
 * recomputed here from the menu, so a caller cannot put a price on the big screen.
 */
export async function POST(request: Request) {
  const topic = serverEnv.benna.liveTopic;
  if (!topic) return new Response(null, { status: 204 });

  const parsed = Order.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !workplaceById(parsed.data.workplaceId)) return Response.json({ error: "invalid" }, { status: 400 });
  const dishes = parsed.data.dishes.flatMap(({ id, qty }) => {
    const dish = dishById(id);
    return dish ? [{ id, qty, name: dish.name, price: dish.groupPrice * qty }] : [];
  });
  if (!dishes.length) return Response.json({ error: "invalid" }, { status: 400 });

  const event = {
    name: parsed.data.name,
    workplaceId: parsed.data.workplaceId,
    dishes: dishes.map(({ id, qty, name }) => ({ id, qty, name })),
    total: dishes.reduce((sum, dish) => sum + dish.price, 0),
    at: new Date().toISOString(),
  };
  // A dropped relay must never fail the eater's order: the board is a bonus.
  await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: "POST", body: JSON.stringify(event), signal: AbortSignal.timeout(4000) }).catch(() => null);
  return Response.json({ ok: true }, { status: 202 });
}
