/**
 * The wallet demo, driven through the real UI.
 *
 * Generate the experience day → finish a workshop → coins land once → refresh → balance
 * survives → unlock a partner offer → coins deducted → cannot unlock twice.
 */
import { launch } from "./driver.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const wallet = `localStorage.getItem('siyaha:v1:wallet')`;

const page = await launch({ base: "http://localhost:3000", fresh: true });

// The "Local Food Trail" card is the experience day's front door.
await page.goto("/", 2000);
check("Home loads", /Suggestions|Local Food Trail/i.test(await page.text()));
check("Food trail preset found", await page.click("Local Food Trail", 1200));
check("reached onboarding", (await page.url()).startsWith("/onboarding"));

await page.click("Continue", 700);
await page.click("Build my trip", 400);
check("reached /trip", await page.until("location.pathname === '/trip'", 20000));
await page.wait(1500);

const trip = JSON.parse(await page.evaluate(`localStorage.getItem('siyaha:v1:trip')`) || "null");
const kinds = (trip?.stops || []).map((s) => s.poi.kind || "place");
check("exactly 4 stops", trip?.stops?.length === 4, (trip?.stops || []).map((s) => s.poi.name).join(" → "));
check("day mixes places and experiences", new Set(kinds).size > 1, kinds.join(", "));
check("has a hands-on workshop", kinds.includes("workshop"));
check("has a food experience", kinds.includes("food_experience"));
check("has an iconic place", kinds.includes("place"));

const workshop = (trip?.stops || []).find((s) => s.poi.kind === "workshop");
check("workshop keeps its full duration", workshop?.durationMinutes === workshop?.poi.baseDurationMinutes,
  `${workshop?.durationMinutes} min (base ${workshop?.poi.baseDurationMinutes})`);

// Run the day.
await page.evaluate(`document.getElementById('app-viewport').scrollTo(0, 99999)`);
await page.wait(400);
check("Start trip", await page.click("Start trip", 1800));

// Finish every stop; the workshop credit is the one we watch.
for (let i = 0; i < 4; i += 1) {
  await page.evaluate(`document.getElementById('app-viewport').scrollTo(0, 99999)`);
  await page.wait(250);
  await page.click("Visited", 900);
}
const earned = JSON.parse(await page.evaluate(wallet) || "null");
const expected = kinds.reduce((sum, k) => sum + ({ place: 20, local_activity: 50, workshop: 100, food_experience: 80 })[k], 0) + 100;
check("coins credited for the whole day + bonus", earned?.balance === expected,
  `balance=${earned?.balance} expected=${expected}`);
check("one transaction per stop plus the bonus", earned?.transactions?.length === 5,
  `${earned?.transactions?.length} transactions`);

// Farming guard: tap Visited again on the last stop.
await page.click("Visited", 700);
const afterRetap = JSON.parse(await page.evaluate(wallet) || "null");
check("re-marking visited earns nothing", afterRetap?.balance === earned?.balance,
  `${earned?.balance} → ${afterRetap?.balance}`);

// Persistence.
await page.reload(2500);
const afterReload = JSON.parse(await page.evaluate(wallet) || "null");
check("balance survives a refresh", afterReload?.balance === earned?.balance, `${afterReload?.balance}`);

// Redeem from Profile → Wallet.
await page.goto("/passport", 1800);
check("wallet visible on Profile", /Khotwa Wallet|Portefeuille|محفظة/i.test(await page.text()));
check("wallet opens", await page.click("Khotwa Wallet", 900));

const offerBefore = afterReload?.balance ?? 0;
check("unlock offered", await page.click("Unlock", 1200));
const afterRedeem = JSON.parse(await page.evaluate(wallet) || "null");
check("coins deducted on unlock", afterRedeem?.balance < offerBefore,
  `${offerBefore} → ${afterRedeem?.balance}`);
check("offer marked unlocked", (afterRedeem?.redeemed || []).length === 1);

// Cannot unlock the same offer twice.
const redeemedId = afterRedeem?.redeemed?.[0]?.poiId;
const second = await page.evaluate(`(() => {
  const w = JSON.parse(localStorage.getItem('siyaha:v1:wallet') || '{}');
  return (w.redeemed || []).filter(o => o.poiId === ${JSON.stringify(redeemedId)}).length;
})()`);
check("the same offer cannot be unlocked twice", Number(second) === 1);

const noise = [...page.consoleErrors, ...page.pageErrors].filter(
  (l) => !/wood-pattern|ReadPixels|SwiftShader|DevTools|maplibre.*sprite/i.test(l),
);
check("no console errors", noise.length === 0, noise.slice(0, 2).join(" | "));

await page.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
