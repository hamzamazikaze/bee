import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/config/env";
import type { Reply } from "@/features/benna/whatsapp-flow";
import { toText } from "./twilio-text";

/**
 * Meta WhatsApp Cloud API: signature check on the way in, Graph API sends on the way out.
 * Without WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID the send is logged instead,
 * so the simulator works with no Meta account at all.
 */

/** `X-Hub-Signature-256: sha256=<hex HMAC of the raw body with the app secret>`. */
export function validSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const maskPhone = (phone: string) => `${phone.slice(0, 4)}…${phone.slice(-2)}`;

function payload(to: string, reply: Reply) {
  const base = { messaging_product: "whatsapp", recipient_type: "individual", to };
  switch (reply.kind) {
    case "text":
      return { ...base, type: "text", text: { body: reply.body, preview_url: true } };
    case "buttons":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: reply.body },
          action: { buttons: reply.buttons.map((reply) => ({ type: "reply", reply })) },
        },
      };
    case "list":
      return {
        ...base,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: reply.body },
          action: { button: reply.button, sections: [{ title: "BENNA", rows: reply.rows }] },
        },
      };
  }
}

/** Meta errors worth a hint in the log; the rest are logged by code and message. */
const HINTS: Record<number, string> = {
  131047: "outside the 24h customer-service window — only a template can be sent",
  131030: "recipient not in the test number's allowed list",
  190: "access token expired or invalid (temporary tokens last 24h)",
};

// ponytail: in-memory, per server process; a restart forgets the numbered options (customer re-asks).
const textOptions: Map<string, string[]> = ((globalThis as { __bennaTextOptions?: Map<string, string[]> }).__bennaTextOptions ??= new Map());

/** The option ids behind the numbers of the last text-only message sent to this phone. */
export const lastTextOptions = (phone: string) => textOptions.get(phone) ?? [];

/** Sends one message. Retries 429/5xx/network twice with backoff; never throws. */
export async function sendWhatsApp(to: string, reply: Reply): Promise<boolean> {
  const { accessToken, phoneNumberId, graphVersion, dryRun, provider, twilio, bridge } = serverEnv.whatsapp;
  if (provider !== "meta") {
    const { body, options } = toText(reply);
    textOptions.set(to, options);
    const configured = provider === "bridge" ? bridge.secret : twilio.accountSid && twilio.authToken;
    if (dryRun || !configured) {
      console.info(`[whatsapp] dry-run → ${maskPhone(to)}:`, JSON.stringify({ text: { body } }));
      return true;
    }
    if (provider === "bridge") {
      return withRetry(to, () =>
        fetch(`${bridge.url}/send`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-bridge-secret": bridge.secret! },
          body: JSON.stringify({ to, body }),
          signal: AbortSignal.timeout(15_000),
        }), async (response) => (await response.text()).slice(0, 200));
    }
    return withRetry(to, () =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`, {
        method: "POST",
        headers: { authorization: `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64")}` },
        body: new URLSearchParams({ From: twilio.from, To: `whatsapp:+${to}`, Body: body }),
        signal: AbortSignal.timeout(10_000),
      }), async (response) => {
        const error = (await response.json().catch(() => null)) as { code?: number; message?: string } | null;
        return `code=${error?.code} ${error?.message ?? ""}`;
      });
  }

  const body = payload(to, reply);
  if (dryRun || !accessToken || !phoneNumberId) {
    console.info(`[whatsapp] dry-run → ${maskPhone(to)}:`, JSON.stringify(body));
    return true;
  }
  return withRetry(to, () =>
    fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    }), async (response) => {
      const error = ((await response.json().catch(() => null)) as { error?: { code?: number; message?: string; fbtrace_id?: string } } | null)?.error;
      const hint = error?.code && HINTS[error.code] ? ` (${HINTS[error.code]})` : "";
      return `code=${error?.code} ${error?.message ?? ""}${hint} trace=${error?.fbtrace_id ?? "-"}`;
    });
}

async function withRetry(to: string, send: () => Promise<Response>, describe: (response: Response) => Promise<string>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await send();
      if (response.ok) return true;
      const retryable = response.status === 429 || response.status >= 500;
      console.error(`[whatsapp] send failed ${response.status} ${await describe(response)} to=${maskPhone(to)} attempt=${attempt + 1}`);
      if (!retryable) return false;
    } catch (error) {
      console.error(`[whatsapp] send error attempt=${attempt + 1}:`, error instanceof Error ? error.message : error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 3 ** attempt));
  }
  return false;
}
