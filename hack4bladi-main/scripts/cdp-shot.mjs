#!/usr/bin/env node
// Drive headless Chrome over CDP: real 390x844 mobile viewport, locale via localStorage,
// a tiny action list, PNG screenshots. Usage:
//   node scripts/cdp-shot.mjs --url /trip --out shot.png [--w 390 --h 844] [--locale ar]
//        [--actions "wait=1200;click=Start trip;wait=800;shot=after.png;scroll=600"]
// Actions: wait=<ms> | click=<visible text> | shot=<file> | scroll=<px> | eval=<js> | reload
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]);
    return acc;
  }, []),
);
const W = Number(args.w ?? 390), H = Number(args.h ?? 844);
const BASE = args.base ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "khotwa-cdp-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--hide-scrollbars", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist", "--mute-audio", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).webSocketDebuggerUrl; } catch { await sleep(200); }
}
if (!wsUrl) { console.error("chrome did not start"); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) rej(new Error(JSON.stringify(msg.error))); else res(msg.result); }
  else if (msg.method) events.push(msg);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("DOM.enable"); await S("Log.enable");
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });
await S("Emulation.setTouchEmulationEnabled", { enabled: true });
if (args.locale) await S("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem("siyaha:v1:locale",${JSON.stringify(JSON.stringify(args.locale))})}catch{}` });
if (args.fresh) await S("Page.addScriptToEvaluateOnNewDocument", { source: `try{for(const k of ["trip","profile","passport"])localStorage.removeItem("siyaha:v1:"+k)}catch{}` });

const evaluate = async (expression) => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
const shot = async (file) => {
  const { data } = await S("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(file, Buffer.from(data, "base64")); console.log("shot", file);
};
const clickText = async (text) => {
  const ok = await evaluate(`(() => {
    const t = ${JSON.stringify(text)};
    const els = [...document.querySelectorAll('button, a, label, [role="button"], summary')];
    const el = els.find(e => ((e.innerText || e.textContent || "") + " " + (e.getAttribute("aria-label") || "")).trim().replace(/\\s+/g," ").includes(t) && e.getClientRects().length);
    if (!el) return false;
    el.scrollIntoView({ block: "center" }); el.click(); return true; })()`);
  console.log(ok ? "click" : "MISSING click", text);
};

await S("Page.navigate", { url: BASE + (args.url ?? "/") });
await sleep(Number(args.settle ?? 2500));
for (const step of (args.actions ?? "").split(";").map((s) => s.trim()).filter(Boolean)) {
  const [k, ...rest] = step.split("="); const v = rest.join("=");
  if (k === "wait") await sleep(Number(v));
  else if (k === "click") await clickText(v);
  else if (k === "shot") await shot(v);
  else if (k === "scroll") await evaluate(`document.getElementById("app-viewport").scrollBy(0, ${Number(v)})`);
  else if (k === "eval") console.log("eval", await evaluate(v));
  else if (k === "reload") { await S("Page.reload"); await sleep(2500); }
  else if (k === "console") { for (const e of events) if (/console|exception|Log.entry/.test(e.method)) console.log("  >", e.method, JSON.stringify(e.params).slice(0, 300)); }
  else if (k === "upload") {
    const { root } = await S("DOM.getDocument", { depth: 1 });
    const { nodeId } = await S("DOM.querySelector", { nodeId: root.nodeId, selector: "input[type=file]" });
    await S("DOM.setFileInputFiles", { files: [v], nodeId }); console.log("upload", v);
  }
}
if (args.out) await shot(args.out);
ws.close(); chrome.kill("SIGKILL"); rmSync(profile, { recursive: true, force: true });
