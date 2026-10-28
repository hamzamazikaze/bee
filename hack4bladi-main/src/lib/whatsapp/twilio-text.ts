import { createHmac, timingSafeEqual } from "node:crypto";
import type { Reply } from "@/features/benna/whatsapp-flow";

/**
 * The Twilio WhatsApp Sandbox only carries plain text: buttons and lists are written as
 * numbered lines, and a bare number sent back is turned into the id of that option.
 */

/** Renders a reply as text plus the option ids its numbers stand for (empty for plain text). */
export function toText(reply: Reply): { body: string; options: string[] } {
  if (reply.kind === "text") return { body: reply.body, options: [] };
  const items = reply.kind === "buttons"
    ? reply.buttons.map((button) => button.title)
    : reply.rows.map((row) => (row.description ? `${row.title} · ${row.description}` : row.title));
  const options = reply.kind === "buttons" ? reply.buttons.map((button) => button.id) : reply.rows.map((row) => row.id);
  // The welcome message already numbers its choices in the body.
  const listed = /^1\. /m.test(reply.body) ? "" : `\n\n${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
  return { body: `${reply.body}${listed}\n\n↩️ 1–${options.length}`, options };
}

/** "2" → the second option's id, when the last message offered options. */
export function pickOption(text: string, options: string[]): string | undefined {
  const match = /^\s*(\d{1,2})\s*$/.exec(text);
  return match ? options[Number(match[1]) - 1] : undefined;
}

/** X-Twilio-Signature: base64 HMAC-SHA1 of the URL followed by every POST param (key+value, keys sorted). */
export function validTwilioSignature(url: string, params: Record<string, string>, header: string | null, authToken: string) {
  if (!header) return false;
  const data = url + Object.keys(params).sort().map((key) => key + params[key]).join("");
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest();
  const given = Buffer.from(header, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
