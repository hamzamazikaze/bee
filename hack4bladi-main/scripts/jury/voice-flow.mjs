/**
 * Darija voice → TripProfile → 4 stops, driven through the real UI.
 *
 * The microphone is the one thing a headless run cannot supply, so this injects the
 * transcript at the point MediaRecorder would have produced it (the composer's own text
 * field feeds the identical `understand()` call) and then verifies everything downstream:
 * prefill of Your Vibe and Your Day, and a locally built four-stop day.
 */
import { launch } from "./driver.mjs";

const DARIJA = "أنا فكازا نهار كامل، كيعجبني التراث والماكلة، وما بغيتش نمشي بزاف";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

const page = await launch({ base: "http://localhost:3000", fresh: true });

await page.goto("/onboarding?new", 2200);
console.log("url:", await page.url());

// Put the transcript where the voice capture would have put it.
const typed = await page.evaluate(`(() => {
  const el = document.querySelector('textarea');
  if (!el) return 'NO_TEXTAREA';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(DARIJA)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return el.value.slice(0, 20);
})()`);
check("Darija transcript reaches the composer", typed !== "NO_TEXTAREA", typed);

await page.click("Launch AI analysis", 600);
// Understanding is one network call; give it room, then look for the confirmation card.
const understood = await page.until(
  `/what we understood|ما فهمناه|avons compris/i.test(document.body.innerText)`,
  20000,
);
check("Confirmation card appears (AI UNDERSTANDS → USER CONFIRMS)", understood);

const cardText = await page.text();
check(
  "Understood chips show Culture and Food",
  /Culture/i.test(cardText) && /Food/i.test(cardText),
  cardText.replace(/\s+/g, " ").slice(0, 150),
);

const profileAfterVoice = JSON.parse(
  await page.evaluate(`localStorage.getItem('siyaha:v1:profile')`) || "null",
);
check(
  "Profile prefilled from Darija",
  profileAfterVoice?.destination === "Casablanca" &&
    profileAfterVoice?.timeAvailable === "full_day" &&
    profileAfterVoice?.walkingPreference === "minimal" &&
    (profileAfterVoice?.interests || []).includes("culture"),
  JSON.stringify({
    destination: profileAfterVoice?.destination,
    interests: profileAfterVoice?.interests,
    timeAvailable: profileAfterVoice?.timeAvailable,
    walkingPreference: profileAfterVoice?.walkingPreference,
  }),
);

check("Original Arabic transcript kept as evidence", profileAfterVoice?.transcript === DARIJA);

// Your Vibe
await page.click("Continue", 700);
const vibePressed = JSON.parse(
  await page.evaluate(
    `JSON.stringify([...document.querySelectorAll('button[aria-pressed="true"]')].map(b => (b.innerText||'').trim()))`,
  ),
);
check(
  "Your Vibe prefilled",
  vibePressed.some((t) => /Culture/i.test(t)) && vibePressed.some((t) => /Food/i.test(t)),
  vibePressed.join(" | "),
);

// Your Day
await page.click("Continue", 700);
const dayText = await page.text();
const daySelected = JSON.parse(
  await page.evaluate(
    `JSON.stringify([...document.querySelectorAll('[aria-pressed="true"],[data-selected="true"],button')].filter(b => b.getAttribute('aria-pressed')==='true').map(b => (b.innerText||'').trim()))`,
  ),
);
check("Your Day shows the mobility control", /Walking|Marche|المشي/i.test(dayText));
check(
  "Your Day prefilled (Full day + Keep it short)",
  daySelected.some((t) => /Full day/i.test(t)) && daySelected.some((t) => /Keep it short/i.test(t)),
  daySelected.join(" | "),
);

// Build
await page.click("Build my trip", 400);
const landed = await page.until("location.pathname === '/trip'", 20000);
check("Build my trip reaches /trip", landed, await page.url());

await page.wait(1200);
const trip = JSON.parse(await page.evaluate(`localStorage.getItem('siyaha:v1:trip')`) || "null");
check(
  "Local engine produced exactly 4 stops",
  trip?.stops?.length === 4,
  `stops=${trip?.stops?.length} segments=${trip?.segments?.length}`,
);
check(
  "Every stop has real coordinates and a time",
  !!trip?.stops?.every((s) => s.poi?.coordinates?.lat && s.poi?.coordinates?.lng && s.arrivalTime),
  (trip?.stops || []).map((s) => s.poi?.name).join(" → "),
);
check(
  "The built trip carries the voice profile",
  trip?.profile?.walkingPreference === "minimal" && trip?.profile?.timeAvailable === "full_day",
  JSON.stringify({
    walking: trip?.profile?.walkingPreference,
    time: trip?.profile?.timeAvailable,
    sources: trip?.profile?.sources,
  }),
);

await page.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
