import { serverEnv } from "@/config/env";
import { validSignature } from "@/lib/whatsapp/client";
import { handleWebhook, type WaWebhook } from "@/lib/whatsapp/agent";

/** GET — Meta's one-time verification: echo hub.challenge when the verify token matches. */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = serverEnv.whatsapp.verifyToken;
  if (token && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === token) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

/**
 * POST — messages and delivery statuses. The signature is checked over the raw body
 * before anything is parsed. A flow failure is answered in-chat ("try again") and still
 * acks 200; a 500 (database unreachable) lets Meta re-deliver, and message ids already
 * handled are dropped as duplicates.
 */
export async function POST(request: Request) {
  const secret = serverEnv.whatsapp.appSecret;
  if (!secret) {
    console.error("[whatsapp] META_APP_SECRET not set — refusing unsigned webhooks");
    return new Response("not configured", { status: 503 });
  }
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return new Response("bad signature", { status: 401 });
  }
  if (!serverEnv.whatsapp.enabled) return new Response("ok");

  let payload: WaWebhook;
  try {
    payload = JSON.parse(raw) as WaWebhook;
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (payload.object !== "whatsapp_business_account") return new Response("ignored");

  try {
    await handleWebhook(payload);
  } catch (error) {
    console.error("[whatsapp] webhook failed:", error instanceof Error ? error.message : error);
    return new Response("retry", { status: 500 });
  }
  return new Response("ok");
}
