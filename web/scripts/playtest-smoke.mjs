/**
 * Fast PR smoke: scene, opening build, one night, reload mid-night. Full 28-day winter is nightly.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { buildOpening, enterGame, resolveRadio } from "./playtest-m2.mjs";
import { openPlanTomorrow, openTodaysResults } from "./playtest-night-recap.mjs";

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.PLAYTEST_OUT ?? path.join(process.cwd(), "playtest-artifacts", "smoke");
const saveKey = "last-chair-m3-slot-1";
const [width, height] = (process.env.PLAYTEST_VIEWPORT ?? "390x844").split("x").map(Number);

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});

const button = (page, name) => page.getByRole("button", { name, exact: typeof name === "string" });
const heading = (name, page) => page.getByRole("heading", { name, exact: typeof name === "string" });
const errors = [];
const screenshots = [];

try {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  page.setDefaultTimeout(60_000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const tap = async (name) => {
    const control = button(page, name);
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${name} needs a 44px touch target`);
    await control.tap();
  };
  const resumeIfPaused = async () => {
    const resume = button(page, "Resume day");
    if (await resume.isVisible()) await resume.tap();
  };
  const shot = async (name) => {
    const file = path.join(outDir, name);
    await page.screenshot({ path: file });
    screenshots.push(name);
  };

  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await enterGame(page);
  await heading(/Dutch Hill, winter 1/, page).waitFor();
  await tap("Sign lease with Elena Vargas");
  await page.getByText(/^Open 1\/\d+$/).waitFor();
  await shot("day1-hud.png");
  await buildOpening(page, cdp);

  await tap("Resume day");
  await tap("Office");
  await tap("Close hill");
  await heading("Closing recap", page).waitFor();
  await shot("night1-recap.png");
  await resolveRadio(page);
  await openPlanTomorrow(page);
  await tap(/^Cheap\b/);
  await tap(/^High\b/);
  await tap("Sleep until morning");
  await page.getByText(/^Open 2\/\d+$/).waitFor();
  await shot("day2-morning.png");

  await resumeIfPaused();
  await tap("Office");
  await tap("Close hill");
  await page.getByRole("button", { name: /Sleep until morning|Finish the winter/ }).waitFor({ timeout: 120_000 });
  await openTodaysResults(page);
  await heading("Closing recap", page).waitFor();
  const beforeReload = await page.evaluate((key) => localStorage.getItem(key), saveKey);
  assert.ok(beforeReload, "save exists before mid-night reload");
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGame(page);
  await heading("Closing recap", page).waitFor();
  const afterReload = await page.evaluate((key) => localStorage.getItem(key), saveKey);
  assert.equal(afterReload, beforeReload, "mid-night reload keeps the save");

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, errorCount: 0, screenshots }, null, 2));
} finally {
  await browser.close();
}