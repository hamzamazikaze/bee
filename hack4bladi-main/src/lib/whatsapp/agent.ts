import "server-only";
import { serverEnv } from "@/config/env";
import { loadTodaysMenu } from "@/lib/benna/menu-source";
import {
  firstSighting, loadSession, loadSlots, loadWorkplaces, placeOrder, recentOrders, saveSession, type OrderView,
} from "@/lib/benna/orders";
import { errorReply, respond, statusLabel, type FlowDeps, type Inbound, type Session } from "@/features/benna/whatsapp-flow";
import { lastTextOptions, maskPhone, sendWhatsApp } from "./client";
import { pickOption } from "./twilio-text";

/** A conversation idle this long starts over (the menu and cutoffs will have moved). */
const SESSION_TTL_MS = 2 * 60 * 60_000;

const deps: FlowDeps = {
  workplaces: loadWorkplaces,
  menu: (workplaceId) => loadTodaysMenu(workplaceId),
  slots: loadSlots,
  placeOrder,
  recentOrders: async (phone) =>
    (await recentOrders(phone)).map((order) => ({
      reference: order.reference, dish: order.dishes.name, qty: order.qty, total: order.total_mad, status: order.status,
    })),
  get supportPhone() {
    return serverEnv.benna.supportPhone;
  },
};

type WaMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  interactive?: { button_reply?: { id: string }; list_reply?: { id: string } };
  button?: { text: string };
};
type WaChange = {
  value?: {
    contacts?: { wa_id: string; profile?: { name?: string } }[];
    messages?: WaMessage[];
    statuses?: { id: string; status: string; recipient_id: string; errors?: { code: number; title?: string }[] }[];
  };
};
export type WaWebhook = { object?: string; entry?: { changes?: WaChange[] }[] };

function toInbound(message: WaMessage, name?: string): Inbound {
  // A tapped button/row carries its id; its title is display text and must not re-trigger keywords.
  const replyId = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
  const text = replyId ? "" : (message.text?.body ?? message.button?.text ?? "");
  return { from: message.from, messageId: message.id, name, text: text.slice(0, 500), replyId };
}

async function handleMessage(message: WaMessage, name?: string): Promise<void> {
  if (!(await firstSighting(message.id))) {
    console.info(`[whatsapp] duplicate ${message.id} ignored`);
    return;
  }
  const stored = await loadSession(message.from);
  const fresh = stored && Date.now() - Date.parse(stored.updatedAt) < SESSION_TTL_MS;
  const previous = fresh ? (stored.state as Session) : stored ? { ...(stored.state as Session), step: "idle" as const } : null;
  try {
    const { session, replies } = await respond(previous, toInbound(message, name), deps);
    await saveSession(message.from, session);
    for (const reply of replies) await sendWhatsApp(message.from, reply);
  } catch (error) {
    console.error(`[whatsapp] flow failed for ${maskPhone(message.from)}:`, error instanceof Error ? error.message : error);
    await sendWhatsApp(message.from, errorReply(previous?.lang));
  }
}

/** Processes one verified webhook payload: inbound messages in order, statuses logged. */
export async function handleWebhook(payload: WaWebhook): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const { value } of entry.changes ?? []) {
      for (const status of value?.statuses ?? []) {
        const errors = status.errors?.map((error) => `${error.code} ${error.title ?? ""}`).join("; ");
        console.info(`[whatsapp] status ${status.status} ${status.id} → ${maskPhone(status.recipient_id)}${errors ? ` errors: ${errors}` : ""}`);
      }
      for (const message of value?.messages ?? []) {
        const name = value?.contacts?.find((contact) => contact.wa_id === message.from)?.profile?.name;
        await handleMessage(message, name);
      }
    }
  }
}

/** One text-only message (Twilio sandbox, bridge): a bare number picks from the options last sent. */
export async function handleTextMessage(sid: string, from: string, body: string, name?: string): Promise<void> {
  const replyId = pickOption(body, lastTextOptions(from));
  const message: WaMessage = replyId
    ? { id: sid, from, type: "interactive", interactive: { button_reply: { id: replyId } } }
    : { id: sid, from, type: "text", text: { body } };
  await handleMessage(message, name);
}

/** Tells a WhatsApp customer their order moved, in the language of their conversation. */
export async function notifyOrderStatus(order: OrderView): Promise<void> {
  if (order.source !== "whatsapp" || !order.customer_phone) return;
  const lang = ((await loadSession(order.customer_phone))?.state as Session | undefined)?.lang ?? "dr";
  await sendWhatsApp(order.customer_phone, {
    kind: "text",
    body: `BENNA — *${order.reference}*: ${statusLabel(lang, order.status)}\n${order.qty} × ${order.dishes.name} · ${order.total_mad} MAD`,
  });
}
