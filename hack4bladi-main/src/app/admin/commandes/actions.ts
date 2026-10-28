"use server";

import { revalidatePath } from "next/cache";
import { serverEnv } from "@/config/env";
import { setOrderStatus } from "@/lib/benna/orders";
import { notifyOrderStatus } from "@/lib/whatsapp/agent";
import type { OrderStatus } from "@/features/benna/whatsapp-flow";

/** The only moves the kitchen/admin can make. */
const MOVES: Record<string, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["delivering"],
  delivering: ["delivered"],
};

export async function moveOrder(form: FormData) {
  const token = serverEnv.benna.adminToken;
  if (!token || form.get("token") !== token) throw new Error("unauthorized");
  const id = String(form.get("id"));
  const from = String(form.get("from")) as OrderStatus;
  const to = String(form.get("to")) as OrderStatus;
  if (!MOVES[from]?.includes(to)) throw new Error("invalid move");

  const order = await setOrderStatus(id, from, to);
  if (order) await notifyOrderStatus(order);
  revalidatePath("/admin/commandes");
}
