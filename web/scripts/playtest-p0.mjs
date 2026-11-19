/**
 * Automated P0/P1 smoke playtest against local /play (Chromium, iPhone viewport).
 * Run from web/: npx playwright install chromium && npm run playtest:p0
 * Screenshots go to $PLAYTEST_OUT, default ./playtest-artifacts.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { buildOpening, enterGame, resolveRadio } from "./playtest-m2.mjs";

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.PLAYTEST_OUT ?? path.join(process.cwd(), "playtest-artifacts");
const button = (page, name) => page.getByRole("button", { name, exact: typeof name === "string" });
const saveKey = "last-chair-m3-slot-1";
const screenshots = [];
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = process.env.PLAYTEST_INPUT === "mouse" ? null : await context.newCDPSession(page);
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const heading = (name) => page.getByRole("heading", { name, exact: typeof name === "string" });
  const tap = (name) => button(page, name).tap();
  const readSave = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), saveKey);
  async function screenshot(name, fullPage = false) {
    await page.screenshot({ path: path.join(outDir, name), fullPage });
    screenshots.push(name);
  }

  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await screenshot("home.png", true);

  await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
  await heading("Last Chair").waitFor();
  assert.equal(await button(page, /^Continue/).count(), 0, "A fresh browser has no saved winter");
  await enterGame(page);
  await heading(/Dutch Hill, winter 1/).waitFor();
  await screenshot("founder-pick.png");
  await tap(/Elena Vargas/i);

  const dayOne = page.getByText(/^Day 1\/28$/);
  await dayOne.waitFor();
  await screenshot("day1-hud.png");
  await buildOpening(page, cdp);

  // Start at 9:30 AM to exercise guest follow without waiting for the gates to open at 8.
  // Seed once, before the app reads its save, so subsequent reloads keep actual progress.
  const seeded = await readSave();
  seeded.state.clockMin = 9 * 60 + 30;
  await page.addInitScript(({ key, save }) => {
    if (sessionStorage.getItem("p0-seeded-clock")) return;
    sessionStorage.setItem("p0-seeded-clock", "1");
    localStorage.setItem(key, JSON.stringify(save));
  }, { key: saveKey, save: seeded });
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGame(page);
  await dayOne.waitFor();

  await tap("Resume day");
  await tap("Guests");
  await heading("Guests").waitFor();
  const follow = button(page, "Follow").first();
  await follow.tap();
  await tap("Pause day");
  await screenshot("follow-guest.png");

  await tap("Build");
  await heading("Build").waitFor();
  await tap("Review Tier 2 upgrade");
  await button(page, "Start lodge upgrade").waitFor();
  await tap("Close build sheet");

  const end = heading(/Winter review|Tenney Mountain/);
  async function closeHill() {
    await tap("Close hill");
    await heading("Closing recap").waitFor();
  }
  async function finishNight() {
    await resolveRadio(page);
    await tap(/^(Sleep until morning|Finish the winter)$/);
  }

  await closeHill();
  await screenshot("night-recap.png");
  await tap(/^Cheap\b/);
  await tap(/^High\b/);
  await finishNight();
  await page.getByText(/^Day 2\/28$/).waitFor();
  await screenshot("day2-morning.png");

  for (let day = 2; day <= 28 && !(await end.isVisible()); day++) {
    await closeHill();
    await finishNight();
    await page.getByText(new RegExp("^Day " + (day + 1) + "/28$")).or(end).waitFor();
  }

  await end.waitFor();
  await screenshot("end-state.png", true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, endMatched: true, errorCount: errors.length, screenshots }, null, 2));
} finally {
  await browser.close();
}
