/**
 * Automated P0/P1 smoke playtest against local /play (Chromium, iPhone viewport).
 * Run from web/: npx playwright install chromium && npm run playtest:p0
 * Screenshots go to $PLAYTEST_OUT, default ./playtest-artifacts.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PLAY_URL ?? "http://127.0.0.1:3000";
const outDir = process.env.PLAYTEST_OUT ?? path.join(process.cwd(), "playtest-artifacts");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.screenshot({ path: path.join(outDir, "home.png"), fullPage: true });

await page.goto(`${BASE}/play`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

await page.getByRole("heading", { name: /Dutch Hill/i }).waitFor({ timeout: 20000 });
await page.screenshot({ path: path.join(outDir, "founder-pick.png") });
await page.getByRole("button", { name: /Elena Vargas/i }).click();

await page.getByText(/Day 1\/14/).waitFor({ timeout: 10000 });
await page.screenshot({ path: path.join(outDir, "day1-hud.png") });

// Guests arrive from 8 AM and the day starts at 6, so seed the saved clock at 9:30, when the hill has
// people, instead of waiting a real minute. The init script runs once, before the app reads its save.
const saved = await page.evaluate(() => localStorage.getItem("last-chair-v1"));
const seeded = JSON.parse(saved);
seeded.state.clockMin = 9 * 60 + 30;
await page.addInitScript((json) => {
  if (!sessionStorage.getItem("seeded-clock")) {
    sessionStorage.setItem("seeded-clock", "1");
    localStorage.setItem("last-chair-v1", json);
  }
}, JSON.stringify(seeded));
await page.reload({ waitUntil: "networkidle" });
await page.getByText(/Day 1\/14/).waitFor({ timeout: 10000 });

await page.getByLabel("Resume day").click();
await page.waitForTimeout(4000);
await page.getByLabel("Pause day").click();

await page.getByRole("button", { name: "Guests", exact: true }).click();
await page.getByRole("heading", { name: "Guests" }).waitFor();
await page.getByRole("button", { name: "Follow" }).first().click();
await page.screenshot({ path: path.join(outDir, "follow-guest.png") });

await page.getByRole("button", { name: "Build", exact: true }).click();
await page.getByRole("heading", { name: "Build" }).waitFor();
const bad = page.getByRole("button", { name: /Blocked/ });
if (await bad.count()) await bad.first().click();
await page.getByRole("button", { name: /Valid run/ }).first().click();
await page.getByRole("button", { name: /Place Surface lift/i }).click();

await page.getByRole("button", { name: "Build", exact: true }).click();
const lodgeBtn = page.getByRole("button", { name: /Lodge/ });
if ((await lodgeBtn.count()) && (await lodgeBtn.isEnabled())) {
  await lodgeBtn.click();
}
await page.getByLabel("Close build sheet").click();

async function closeAndSleep() {
  const close = page.getByRole("button", { name: "Close hill" });
  await close.waitFor({ timeout: 8000 });
  await close.click();
  await page.getByRole("heading", { name: /Closing recap/i }).waitFor({ timeout: 10000 });
  const gotIt = page.getByRole("button", { name: "Got it" });
  if (await gotIt.count()) {
    await gotIt.click();
    await page.waitForTimeout(100);
  }
  await page.getByRole("button", { name: /Sleep/i }).click();
  await page.waitForTimeout(200);
}

await page.getByRole("button", { name: "Close hill" }).click();
await page.getByRole("heading", { name: /Closing recap/i }).waitFor({ timeout: 10000 });
await page.screenshot({ path: path.join(outDir, "night-recap.png") });
await page.getByRole("button", { name: "Cheap" }).click();
await page.getByRole("button", { name: "High" }).click();
const gotIt = page.getByRole("button", { name: "Got it" });
if (await gotIt.count()) await gotIt.click();
await page.getByRole("button", { name: /Sleep/i }).click();
await page.getByText(/Day 2\/14/).waitFor({ timeout: 10000 });
await page.screenshot({ path: path.join(outDir, "day2-morning.png") });

for (let day = 2; day <= 14; day++) {
  const review = page.getByRole("heading", { name: /Winter review/i });
  if (await review.count()) break;
  const mountain2 = page.getByRole("heading", { name: /Tenney Mountain/i });
  if (await mountain2.count()) break;
  await closeAndSleep();
}

await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "end-state.png"), fullPage: true });

const body = await page.locator("body").innerText();
const okEnd =
  /Winter review|Tenney Mountain|Replay Dutch Hill/i.test(body) ||
  /Day 14\/14/.test(body);

const fatal = errors.filter(
  (e) => !/favicon|hydration|ResizeObserver/i.test(e),
);
assert.equal(fatal.length, 0, fatal.join("\n"));
assert.ok(okEnd, `expected winter end UI, got: ${body.slice(0, 500)}`);

console.log(
  JSON.stringify(
    {
      ok: true,
      endMatched: true,
      errorCount: fatal.length,
      screenshots: fs.readdirSync(outDir).filter((f) => f.endsWith(".png")),
    },
    null,
    2,
  ),
);

await browser.close();
