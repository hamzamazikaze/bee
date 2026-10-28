#!/usr/bin/env node
/**
 * `pnpm jury:smoke` — the pre-pitch check. Fifteen assertions over the demo path plus the
 * screens a jury wanders into, on a real 390x844 Chrome. Targets under 90 seconds.
 *
 * Selectors are accessible names, never nth-child or generated classes: the point is to
 * catch a broken product, not a re-styled one.
 */
import { launch } from "./driver.mjs";

const BASE = process.env.JURY_BASE ?? "http://localhost:3000";
const V = "document.getElementById('app-viewport')";
const results = [];
let page;

/** Console noise we do not own. Anything else fails TEST 14. */
const IGNORED_ERROR = /wood-pattern|ReadPixels|SwiftShader|Download the React DevTools|maplibre.*sprite/i;

async function test(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  PASS  ${name}  (${Date.now() - started}ms)`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: String(error.message ?? error) });
    console.log(`  FAIL  ${name}  (${Date.now() - started}ms)\n        ${error.message ?? error}`);
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/** Is this control's own centre the topmost element there? */
const hitTest = (name) => `(() => {
  const want = ${JSON.stringify(name)}.toLowerCase();
  const els = [...document.querySelectorAll('button,a[href],[role="button"]')];
  const named = (e) => ((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || e.textContent || ''))
    .replace(/\\s+/g, ' ').trim().toLowerCase();
  const el = els.find((e) => e.getClientRects().length && named(e).includes(want));
  if (!el) return 'MISSING';
  const r = el.getBoundingClientRect();
  const cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
  if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return 'OFFSCREEN';
  const top = document.elementFromPoint(cx, cy);
  return top && (el.contains(top) || top.contains(el))
    ? 'OK'
    : 'BLOCKED:' + ((top && (top.innerText || top.tagName)) || '?').replace(/\\s+/g, ' ').trim().slice(0, 30);
})()`;

const activeStopLabel = `(() => {
  const pin = [...document.querySelectorAll('button[aria-current="true"][aria-label]')]
    .map((b) => b.getAttribute('aria-label')).find((l) => /^\\d\\./.test(l || ''));
  const row = document.querySelector('ol li button[aria-current="true"]');
  const card = [...document.querySelectorAll('article')].find((a) => (a.className || '').includes('bg-background'));
  return JSON.stringify({
    pin: pin ? pin.replace(/^\\d\\.\\s*/, '').trim() : null,
    row: row ? (row.innerText || '').split('\\n').filter(Boolean)[1] : null,
    card: card ? (card.querySelector('h3')?.innerText || '').trim() : null,
  });
})()`;

const started = Date.now();
console.log(`\nKHOTWA JURY SMOKE — ${BASE}\n`);

page = await launch({ base: BASE, fresh: true });

await test("1  Fresh Home loads", async () => {
  await page.goto("/", 1800);
  const text = await page.text();
  assert(/Where are we going today|إلى أين|Où allons/i.test(text), "hero greeting missing");
  assert(await page.evaluate("document.documentElement.scrollWidth <= 390"), "horizontal overflow");
});

await test("2  A demo entry point reaches onboarding", async () => {
  assert(await page.click("Culture in Casablanca", 1200), "popular preset not found");
  assert((await page.url()).startsWith("/onboarding"), `expected /onboarding, got ${await page.url()}`);
  assert(/Step \d of 3|الخطوة|Étape/i.test(await page.text()), "onboarding step header missing");
});

await test("3  Onboarding reaches processing and lands on the trip", async () => {
  assert(await page.click("Continue", 700), "Continue missing");
  assert(await page.click("Build my trip", 300), "Build my trip missing");
  assert(await page.until("/Matching|Analy|Optimi/i.test(document.body.innerText)", 3000), "no processing screen");
  assert(await page.until("location.pathname === '/trip'", 14000), "never reached /trip");
  await page.wait(1200);
});

await test("4  The trip has four valid stops", async () => {
  const trip = await page.evaluate("localStorage.getItem('siyaha:v1:trip')");
  const parsed = JSON.parse(trip ?? "null");
  assert(parsed && parsed.stops?.length === 4, `expected 4 stops, got ${parsed?.stops?.length}`);
  assert(parsed.stops.every((s) => s.poi?.coordinates?.lat && s.poi?.coordinates?.lng), "a stop has no coordinates");
  assert(parsed.stops.every((s) => s.arrivalTime), "a stop has no arrival time");
  assert(parsed.segments?.length === 3, `expected 3 segments, got ${parsed.segments?.length}`);
});

await test("13 No core CTA is blocked by another element", async () => {
  await page.evaluate(`${V}.scrollTo(0, ${V}.scrollHeight)`);
  await page.wait(400);
  for (const cta of ["Start trip", "Adapt my day"]) {
    const verdict = await page.evaluate(hitTest(cta));
    assert(verdict === "OK", `${cta} -> ${verdict}`);
  }
  await page.evaluate(`${V}.scrollTo(0, 420)`);
  await page.wait(600);
  for (const cta of ["Recenter map", "Navigate", "View stop"]) {
    const verdict = await page.evaluate(hitTest(cta));
    assert(verdict === "OK", `${cta} -> ${verdict}`);
  }
});

await test("12 Map pins and the selected stop stay synchronized", async () => {
  /* MapLibre on software GL takes its time in a headless run; on a real GPU this
     resolves in well under a second. The wait is generous so a slow machine reports a
     broken map, not a slow one. */
  assert(
    await page.until(`[...document.querySelectorAll('button[aria-label]')].some((b) => /^3\\./.test(b.getAttribute('aria-label')))`, 25000),
    "map pins never rendered",
  );
  await page.clickSelector('button[aria-label^="3."]', 800);
  const state = JSON.parse(await page.evaluate(activeStopLabel));
  assert(state.pin, "no active pin after tapping pin 3");
  assert(state.card && state.pin.includes(state.card), `pin "${state.pin}" vs card "${state.card}"`);
  assert(state.row && state.pin.includes(state.row.trim()), `pin "${state.pin}" vs timeline row "${state.row}"`);
  // Every pin must be its own topmost element — nothing may sit on top of a stop.
  for (const n of [1, 2, 3, 4]) {
    const verdict = await page.evaluate(hitTest(`${n}.`));
    assert(verdict === "OK" || verdict === "OFFSCREEN", `pin ${n} -> ${verdict}`);
  }
});

await test("7  Less walking applies and Undo restores the day", async () => {
  await page.evaluate(`${V}.scrollTo(0, ${V}.scrollHeight)`);
  await page.wait(300);
  assert(await page.click("Adapt my day", 700), "Adapt trigger missing");
  assert(await page.click("Less walking", 1500), "Less walking option missing");
  assert(await page.until("/Undo|تراجع|Annuler/i.test(document.body.innerText)", 4000), "no applied banner / Undo");
  const walking = await page.evaluate("JSON.parse(localStorage.getItem('siyaha:v1:trip')).metrics.walkingMeters");
  assert(await page.click("Undo", 900), "Undo missing");
  const restored = await page.evaluate("JSON.parse(localStorage.getItem('siyaha:v1:trip')).metrics.walkingMeters");
  assert(restored > walking, `undo did not restore walking distance (${walking} -> ${restored})`);
});

await test("5  Start trip reaches experience mode", async () => {
  await page.evaluate(`${V}.scrollTo(0, ${V}.scrollHeight)`);
  await page.wait(300);
  assert(await page.click("Start trip", 1800), "Start trip missing");
  assert((await page.url()) === "/experience", `expected /experience, got ${await page.url()}`);
  assert(/Experience mode|وضع التجربة|Mode expérience/i.test(await page.text()), "not in experience mode");
});

await test("6  The story sheet opens and closes", async () => {
  assert(await page.click("Read the story", 800), "Read the story missing");
  assert(await page.evaluate("!!document.querySelector('dialog[open]')"), "story sheet did not open");
  assert(/GOOD TO KNOW|Good to know|جيد أن تعرف|BON À SAVOIR/i.test(await page.text()), "story body missing");
  assert(await page.click("Close", 700), "Close missing");
  assert(!(await page.evaluate("!!document.querySelector('dialog[open]')")), "story sheet stayed open");
  assert(
    (await page.evaluate(hitTest("Adapt my day"))) === "OK",
    "an orphan overlay is blocking the screen after closing the sheet",
  );
});

await test("11 Refresh on /experience recovers the running day", async () => {
  await page.reload(2600);
  assert((await page.url()) === "/experience", "left /experience on refresh");
  const text = await page.text();
  assert(!/No day yet/i.test(text), "lost the trip on refresh");
  assert(/Experience mode|وضع التجربة|Mode expérience/i.test(text), "experience header missing after refresh");
});

await test("9  Browser Back does not break the core path", async () => {
  await page.back(1400);
  assert((await page.url()) === "/trip", `back from /experience -> ${await page.url()}`);
  assert(/4 stops|4 محطات|4 étapes/i.test(await page.text()), "trip lost after Back");
  await page.forward(1400);
  assert((await page.url()) === "/experience", `forward -> ${await page.url()}`);
  assert(await page.evaluate("document.querySelectorAll('dialog[open]').length === 0"), "orphan dialog after history move");
});

await test("10 Refresh on /trip recovers", async () => {
  await page.goto("/trip", 2200);
  await page.reload(2400);
  assert((await page.url()) === "/trip", "left /trip on refresh");
  assert(/4 stops|4 محطات|4 étapes/i.test(await page.text()), "trip did not come back");
});

await test("8  Every bottom-nav destination resolves", async () => {
  const tabs = await page.evaluate(
    `JSON.stringify([...document.querySelectorAll('nav a[href]')].map((a) => a.getAttribute('href')))`,
  );
  const hrefs = JSON.parse(tabs);
  assert(hrefs.length >= 4, `expected at least 4 tabs, got ${hrefs.length}`);
  for (const href of hrefs) {
    await page.goto(href, 1500);
    const landed = await page.url();
    assert(landed.split("?")[0] === href.split("?")[0], `${href} -> ${landed}`);
    const text = await page.text();
    assert(text.trim().length > 40, `${href} rendered an empty screen`);
    assert(!/A server error occurred|couldn.t load|Application error/i.test(text), `${href} rendered an error screen`);
  }
  // The two off-nav routes a jury can still reach from Profile.
  for (const href of ["/explore", "/saved"]) {
    await page.goto(href, 1500);
    assert(!/A server error occurred|couldn.t load/i.test(await page.text()), `${href} rendered an error screen`);
  }
});

await test("14 No uncaught console error during the hero flow", async () => {
  const noise = [...page.consoleErrors, ...page.pageErrors].filter((line) => !IGNORED_ERROR.test(line));
  assert(noise.length === 0, `${noise.length} console error(s):\n        ${noise.slice(0, 3).join("\n        ")}`);
});

await test("15 Arabic mode does not break navigation", async () => {
  await page.goto("/passport", 1600);
  assert(await page.click("AR", 700), "AR switch missing");
  assert((await page.evaluate("document.documentElement.dir")) === "rtl", "dir did not flip to rtl");
  await page.goto("/", 1600);
  assert(await page.evaluate("document.documentElement.scrollWidth <= 390"), "horizontal overflow in RTL");
  /* The Home tile browses now; the shelf's CTA is what enters the planner. Two hops,
     both asserted, because the tile used to skip the shelf entirely. */
  assert(await page.click("ثقافة", 1400), "Arabic category tile not tappable");
  assert(
    (await page.url()).startsWith("/explore/culture"),
    `AR category tile -> ${await page.url()}`,
  );
  assert(/أماكن/.test(await page.text()), "category shelf has no places in Arabic");
  assert(await page.click("خطّط يوم", 1400), "Arabic build-day CTA not tappable");
  assert((await page.url()).startsWith("/onboarding"), `AR shelf CTA -> ${await page.url()}`);
  await page.goto("/trip", 2400);
  assert(/4 محطات|4 stops/.test(await page.text()), "trip screen broken in Arabic");
  const verdict = await page.evaluate(hitTest("Start trip"));
  assert(verdict === "OK" || verdict === "MISSING", `Start trip in RTL -> ${verdict}`);
});

await page.close();

const failed = results.filter((r) => !r.ok);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${results.length - failed.length}/${results.length} passed in ${seconds}s`);
if (failed.length) {
  console.log("\nFAILED:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.error}`);
}
process.exit(failed.length ? 1 : 0);
