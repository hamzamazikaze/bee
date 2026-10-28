/**
 * BENNA Together, driven through the real UI like a colleague would:
 * find the open group → join in one tap → order at group price → track → pick up.
 * Run against a dev server: BASE=http://localhost:3000 node scripts/jury/together-flow.mjs
 */
import { launch } from "./driver.mjs";

const SHOTS = process.env.SHOTS ?? "";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};
const shot = (page, name) => (SHOTS ? page.shot(`${SHOTS}/${name}.png`) : null);
// The splash covers every fresh page load until "Commencer" is tapped.
const open = async (page, path) => {
  await page.goto(path, 2500);
  await page.click("Commencer", 900);
};

const page = await launch({ base: process.env.BASE ?? "http://localhost:3000", fresh: true });

// 1 · Find an open group: workplace, delivery time, seats left.
await open(page, "/bienvenue");
check("picked a workplace", await page.click("Technopark", 300));
await page.click("Continuer", 1500);
check("home reached", (await page.url()) === "/");
let text = await page.text();
check("home shows delivery time", /12:30/.test(text));
check("group strip shows seats left", /10 places libres/.test(text), text.match(/\d+ places libres/)?.[0]);
await shot(page, "1-home-group");

// 2 · Join in one tap.
check("join button tapped", await page.click("Rejoindre", 900));
text = await page.text();
check("joined state shown", /Membre/.test(text));
check("seat taken", /9 places libres/.test(text));
await shot(page, "2-joined");

// 3 · Order at group price.
check("dish added", await page.clickSelector('button[aria-label^="Ajouter "]', 500));
check("cart pill shows", /Voir le panier/.test(await page.text()));
await page.click("Voir le panier", 1500);
text = await page.text();
check("cart shows group saving", /Économie de groupe/.test(text));
await shot(page, "3-cart");
await page.click("Confirmer la commande", 1500);
check("order placed", (await page.url()).startsWith("/commande/"));

// 4 · Track until delivery.
for (let i = 0; i < 4; i++) await page.click("Démo · étape suivante", 300);
text = await page.text();
check("arrived at pickup point", /C'est arrivé/.test(text));
await shot(page, "4-arrived");

// 5 · Pick up with colleagues.
check("pickup tapped", await page.click("J'ai récupéré mon repas", 500));
check("pickup confirmed", /Bon appétit avec vos collègues/.test(await page.text()));
await shot(page, "5-picked-up");

await page.goto("/groupe", 2500);
await page.click("Commencer", 900);
check("group shows my part confirmed", /Votre part est confirmée/.test(await page.text()));

await page.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
