import { serverEnv } from "@/config/env";
import { handleTextMessage } from "@/lib/whatsapp/agent";
import { validTwilioSignature } from "@/lib/whatsapp/twilio-text";

const emptyTwiml = () => new Response("<Response></Response>", { headers: { "content-type": "text/xml" } });

/**
 * POST — Twilio WhatsApp Sandbox inbound message (form-encoded). The signature is checked
 * against the public URL Twilio called; replies go out through the REST API, so the TwiML
 * answer is empty. A 500 lets Twilio retry; message sids already handled are dropped.
 */
export async function POST(request: Request) {
  const { authToken, webhookUrl } = serverEnv.whatsapp.twilio;
  if (!authToken) {
    console.error("[whatsapp] TWILIO_AUTH_TOKEN not set — refusing unsigned webhooks");
    return new Response("not configured", { status: 503 });
  }
  const params = Object.fromEntries(new URLSearchParams(await request.text()));
  const forwarded = request.headers.get("x-forwarded-host");
  const url = webhookUrl ?? (forwarded ? `https://${forwarded}${new URL(request.url).pathname}` : request.url);
  if (!validTwilioSignature(url, params, request.headers.get("x-twilio-signature"), authToken)) {
    console.error(`[whatsapp] bad Twilio signature for ${url} (set TWILIO_WEBHOOK_URL to the exact URL configured in Twilio)`);
    return new Response("bad signature", { status: 401 });
  }
  if (!serverEnv.whatsapp.enabled || !params.MessageSid || !params.From?.startsWith("whatsapp:")) return emptyTwiml();

  try {
    const from = params.From.replace(/^whatsapp:\+?/, "");
    await handleTextMessage(params.MessageSid, from, (params.Body ?? "").slice(0, 500), params.ProfileName);
  } catch (error) {
    console.error("[whatsapp] twilio webhook failed:", error instanceof Error ? error.message : error);
    return new Response("retry", { status: 500 });
  }
  return emptyTwiml();
}
