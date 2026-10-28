/**
 * Local WhatsApp simulator: posts Meta-shaped, correctly signed webhooks to the dev server.
 *
 *   node scripts/whatsapp-sim.mts              interactive; type text, or #id to tap a button/row
 *   node scripts/whatsapp-sim.mts "Salam" #menu #wp:casanearshore-2b   scripted turns
 *
 * Flags: --dup re-sends each event twice (dedupe check), --bad-sig sends a wrong signature.
 * In dry-run (WHATSAPP_DRY_RUN=true or no token) the bot's replies are read back from the dev
 * server log and printed here; with a real token they go to SIM_PHONE's actual WhatsApp.
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => [match[1], match[2]]),
);
const url = process.env.SIM_URL ?? "http://localhost:3000/api/whatsapp/webhook";
const phone = process.env.SIM_PHONE ?? "212600000000";
const secret = env.META_APP_SECRET;
const args = process.argv.slice(2);
const dup = args.includes("--dup");
const badSig = args.includes("--bad-sig");
const turns = args.filter((arg) => !arg.startsWith("--"));

const log = new URL("../.next/dev/logs/next-development.log", import.meta.url);
const logSize = () => { try { return statSync(log).size; } catch { return 0; } };

/** Prints the dry-run replies the server logged since `from` (byte offset), as a chat would show them. */
function printReplies(from: number) {
  let text = "";
  try { text = readFileSync(log).subarray(from).toString("utf8"); } catch { return; }
  for (const line of text.split("\n")) {
    const message: string = (() => { try { return JSON.parse(line).message ?? ""; } catch { return ""; } })();
    const quoted = /\[whatsapp\] dry-run → [^:]+: ("[\s\S]*")$/.exec(message)?.[1];
    if (!quoted) continue;
    const body = JSON.parse(JSON.parse(quoted));
    const i = body.interactive;
    console.log(`bot> ${body.text?.body ?? i?.body?.text ?? ""}`);
    for (const b of i?.action?.buttons ?? []) console.log(`     [#${b.reply.id}] ${b.reply.title}`);
    for (const s of i?.action?.sections ?? []) for (const r of s.rows) console.log(`     [#${r.id}] ${r.title}${r.description ? ` · ${r.description}` : ""}`);
  }
}

async function send(turn: string) {
  const from = logSize();
  const id = `wamid.sim.${randomUUID()}`;
  const message = turn.startsWith("#")
    ? { from: phone, id, timestamp: `${Date.now() / 1000 | 0}`, type: "interactive", interactive: { type: "button_reply", button_reply: { id: turn.slice(1), title: turn.slice(1) } } }
    : { from: phone, id, timestamp: `${Date.now() / 1000 | 0}`, type: "text", text: { body: turn } };
  const body = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "sim", changes: [{ field: "messages", value: { messaging_product: "whatsapp", contacts: [{ wa_id: phone, profile: { name: "Sim" } }], messages: [message] } }] }],
  });
  const signature = `sha256=${createHmac("sha256", badSig ? "wrong" : secret).update(body).digest("hex")}`;
  for (let i = 0; i < (dup ? 2 : 1); i++) {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-hub-signature-256": signature }, body });
    console.log(`→ ${turn}  ←  ${response.status} ${await response.text()}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 400)); // let the dev server flush its log
  printReplies(from);
}

if (turns.length) {
  for (const turn of turns) await send(turn);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  for (;;) await send(await rl.question("you> "));
}
