/**
 * Minimal CDP driver for the jury smoke suite. No Playwright: the repo already drives
 * headless Chrome over CDP (scripts/cdp-shot.mjs) and one more dependency is not worth
 * 90 seconds of test time.
 *
 * Selectors are role/accessible-name first (`text=`, `label=`), never nth-child.
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function chromeBinary() {
  const { existsSync } = require("node:fs");
  return CHROME_CANDIDATES.find(existsSync) ?? CHROME_CANDIDATES[0];
}

export async function launch({
  width = 390,
  height = 844,
  base = "http://localhost:3000",
  locale = null,
  fresh = true,
} = {}) {
  const { existsSync } = await import("node:fs");
  const bin = CHROME_CANDIDATES.find((p) => existsSync(p)) ?? CHROME_CANDIDATES[0];
  const port = 9222 + Math.floor(Math.random() * 900);
  const profile = mkdtempSync(join(tmpdir(), "khotwa-jury-"));
  const chrome = spawn(
    bin,
    [
      "--headless=new",
      "--hide-scrollbars",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--mute-audio",
      "--no-first-run",
      "--disable-popup-blocking",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
    } catch {
      await sleep(150);
    }
  }
  if (!wsUrl) throw new Error("chrome did not start");

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const pageErrors = [];

  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      /* A click that navigates kills the in-flight command; that is the click working,
         not a failure. */
      if (msg.error) {
        const text = JSON.stringify(msg.error);
        if (/navigated or closed|Target closed/.test(text)) res({});
        else rej(new Error(text));
      } else res(msg.result);
      return;
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params?.exceptionDetails;
      pageErrors.push(d?.exception?.description ?? d?.text ?? "unknown exception");
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
      consoleErrors.push((msg.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" "));
    }
  };

  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params, sessionId }));
    });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);

  await S("Page.enable");
  await S("Runtime.enable");
  await S("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: true });
  await S("Emulation.setTouchEmulationEnabled", { enabled: true });

  const seed = [];
  if (locale) seed.push(`try{localStorage.setItem("siyaha:v1:locale",${JSON.stringify(JSON.stringify(locale))})}catch{}`);
  /* The splash is a 900ms brand hold; skipping it keeps the suite honest about timing. */
  seed.push(`try{sessionStorage.setItem("siyaha:splash","1")}catch{}`);
  /* window.open must never spawn a real tab in the suite: record the URL instead. */
  seed.push(`window.__opened=[];const _o=window.open;window.open=(u,...r)=>{window.__opened.push(String(u));return null};`);
  if (seed.length) await S("Page.addScriptToEvaluateOnNewDocument", { source: seed.join("\n") });
  /* Once, not per document: a per-load clear would wipe the store a refresh test is
     supposed to recover from. */
  if (fresh) await S("Storage.clearDataForOrigin", { origin: base, storageTypes: "all" });

  const evaluate = async (expression) => {
    const r = await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
    return r.result.value;
  };

  const page = {
    consoleErrors,
    pageErrors,
    evaluate,
    async goto(path, settle = 1600) {
      await S("Page.navigate", { url: base + path });
      await sleep(settle);
    },
    async reload(settle = 1600) {
      await S("Page.reload");
      await sleep(settle);
    },
    async back(settle = 900) {
      await evaluate("history.back()");
      await sleep(settle);
    },
    async forward(settle = 900) {
      await evaluate("history.forward()");
      await sleep(settle);
    },
    url: () => evaluate("location.pathname + location.search"),
    async wait(ms) {
      await sleep(ms);
    },
    /** Poll a JS predicate. Returns true when it becomes truthy inside `timeout`. */
    async until(expression, timeout = 8000, step = 120) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        try {
          if (await evaluate(`!!(${expression})`)) return true;
        } catch {
          /* mid-navigation: retry */
        }
        await sleep(step);
      }
      return false;
    },
    /** Click by accessible name / visible text. Returns false when nothing matched. */
    async click(text, settle = 350) {
      const ok = await evaluate(`(() => {
        const want = ${JSON.stringify(text)}.toLowerCase();
        const els = [...document.querySelectorAll('button,a[href],label,[role="button"],summary')];
        const named = (e) => ((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || e.textContent || ''))
          .replace(/\\s+/g, ' ').trim().toLowerCase();
        const el = els.find((e) => e.getClientRects().length && named(e).includes(want));
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      })()`);
      if (ok) await sleep(settle);
      return ok;
    },
    /** Click the element at the CSS selector (first visible match). */
    async clickSelector(selector, settle = 350) {
      const ok = await evaluate(`(() => {
        const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.getClientRects().length);
        if (!el) return false;
        el.scrollIntoView({ block: 'center' });
        el.click();
        return true;
      })()`);
      if (ok) await sleep(settle);
      return ok;
    },
    text: () => evaluate("document.body.innerText"),
    async shot(file) {
      const { data } = await S("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(file, Buffer.from(data, "base64"));
    },
    async close() {
      try {
        ws.close();
      } catch {}
      chrome.kill("SIGKILL");
      rmSync(profile, { recursive: true, force: true });
    },
  };

  return page;
}
