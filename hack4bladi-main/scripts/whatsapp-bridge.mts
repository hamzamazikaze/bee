/**
 * WhatsApp Web bridge for the demo: a spare WhatsApp number becomes the BENNA bot while the
 * Meta account is blocked. Unofficial (Baileys) — use a spare SIM, never a personal number.
 *
 *   node scripts/whatsapp-bridge.mts     scan the QR with the spare phone (WhatsApp → Linked devices)
 *
 * Inbound text → POST {APP_URL}/api/whatsapp/bridge; the server's replies come back on
 * POST 127.0.0.1:{BRIDGE_PORT}/send. Both carry x-bridge-secret = WHATSAPP_BRIDGE_SECRET.
 * Needs WHATSAPP_PROVIDER=bridge in .env.local. The login is kept in .wa-bridge-auth/.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  // Baileys, not a React hook: renamed so react-hooks/rules-of-hooks does not misread it.
  useMultiFileAuthState as loadMultiFileAuthState,
  type WAMessage,
} from "@whiskeysockets/baileys";
// @ts-expect-error qrcode-terminal ships no types
import qrcode from "qrcode-terminal";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .map((line) => /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => [match[1], match[2]]),
);
const secret = env.WHATSAPP_BRIDGE_SECRET;
if (!secret) throw new Error("WHATSAPP_BRIDGE_SECRET missing in .env.local");
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const port = Number(new URL(env.WHATSAPP_BRIDGE_URL || "http://127.0.0.1:3001").port || 3001);

// Baileys logs every frame as JSON; keep only its errors so the QR stays readable.
const quiet = {
  level: "error",
  child: () => quiet,
  trace() {}, debug() {}, info() {}, warn() {},
  error: (...args: unknown[]) => console.error("[baileys]", ...args.map((arg) => (typeof arg === "string" ? arg : (arg as { msg?: string })?.msg ?? ""))),
};

const jids = new Map<string, string>(); // phone digits → the chat jid to answer on (may be a @lid)
let sock: ReturnType<typeof makeWASocket> | undefined;

/** The customer's phone digits: the jid itself, or its phone-number alias when WhatsApp uses a @lid. */
function phoneOf(message: WAMessage): string | undefined {
  const { remoteJid, remoteJidAlt } = message.key as { remoteJid?: string | null; remoteJidAlt?: string };
  const jid = remoteJid?.endsWith("@s.whatsapp.net") ? remoteJid : remoteJidAlt;
  return jid?.endsWith("@s.whatsapp.net") ? jid.split("@")[0].split(":")[0] : undefined;
}

async function connect() {
  const { state, saveCreds } = await loadMultiFileAuthState(new URL("../.wa-bridge-auth", import.meta.url).pathname);
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ auth: state, version, markOnlineOnConnect: false, logger: quiet as never });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("Scan with the spare phone: WhatsApp → Settings → Linked devices → Link a device");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log(`✅ bridge connected as ${sock?.user?.id} — relaying to ${appUrl}`);
    if (connection === "close") {
      const code = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error("Logged out — delete .wa-bridge-auth/ and run again to re-link.");
        process.exit(1);
      }
      console.log(`connection closed (${code}), reconnecting…`);
      setTimeout(connect, 2_000);
    }
  });
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      if (message.key.fromMe || !message.message) continue;
      const phone = phoneOf(message);
      const text = message.message.conversation ?? message.message.extendedTextMessage?.text;
      if (!phone || text == null) continue; // groups, statuses, media
      jids.set(phone, message.key.remoteJid!);
      const response = await fetch(`${appUrl}/api/whatsapp/bridge`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-bridge-secret": secret },
        body: JSON.stringify({ id: `wa.bridge.${message.key.id}`, from: phone, text, name: message.pushName ?? undefined }),
      }).catch((error: Error) => ({ status: 0, text: async () => error.message }));
      console.log(`← ${phone.slice(0, 4)}…${phone.slice(-2)}: ${text.slice(0, 40)}  → app ${response.status}`);
    }
  });
}

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/send" || request.headers["x-bridge-secret"] !== secret) {
    response.writeHead(403).end("forbidden");
    return;
  }
  let raw = "";
  for await (const chunk of request) raw += chunk;
  try {
    const { to, body } = JSON.parse(raw) as { to: string; body: string };
    if (!sock?.user) throw new Error("not connected yet");
    await sock.sendMessage(jids.get(to) ?? `${to}@s.whatsapp.net`, { text: body });
    console.log(`→ ${to.slice(0, 4)}…${to.slice(-2)}: ${body.split("\n")[0].slice(0, 50)}`);
    response.writeHead(200).end("ok");
  } catch (error) {
    response.writeHead(503).end(error instanceof Error ? error.message : "send failed");
  }
}).listen(port, "127.0.0.1", () => console.log(`bridge listening on 127.0.0.1:${port}`));

await connect();
