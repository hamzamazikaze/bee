import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/config/env";
import { handleTextMessage } from "@/lib/whatsapp/agent";

/**
 * POST — one inbound message relayed by scripts/whatsapp-bridge.mts (WhatsApp Web on a spare
 * number), as JSON { id, from, text, name }. Authenticated by the shared WHATSAPP_BRIDGE_SECRET.
 */
export async function POST(request: Request) {
  const secret = serverEnv.whatsapp.bridge.secret;
  if (!secret) return new Response("not configured", { status: 503 });
  const given = Buffer.from(request.headers.get("x-bridge-secret") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response("forbidden", { status: 403 });
  if (!serverEnv.whatsapp.enabled) return new Response("ok");

  const message = (await request.json().catch(() => null)) as { id?: string; from?: string; text?: string; name?: string } | null;
  if (!message?.id || !message.from || !/^\d{6,15}$/.test(message.from)) return new Response("bad message", { status: 400 });
  try {
    await handleTextMessage(message.id, message.from, (message.text ?? "").slice(0, 500), message.name);
  } catch (error) {
    console.error("[whatsapp] bridge message failed:", error instanceof Error ? error.message : error);
    return new Response("retry", { status: 500 });
  }
  return new Response("ok");
}
