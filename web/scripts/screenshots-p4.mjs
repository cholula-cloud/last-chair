/**
 * P4 screenshots: Office Stats and Reports after a week of settled days.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-p4.mjs
 * Output: web/test-results/p4/
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const [{ createBuiltHill }, { pickFounder, acknowledgeBeat, skipToClose, sleep }, { SAVE_VERSION, toPersisted }] =
  await Promise.all([
    import("../src/game/__fixtures__/built-hill.ts"),
    import("../src/game/rules.ts"),
    import("../src/game/state.ts"),
  ]);

function runDays(days) {
  let s = pickFounder(createBuiltHill(7), "elena");
  for (let i = 0; i < days; i++) s = sleep(acknowledgeBeat(skipToClose(s)));
  return { ...s, phase: "day", paused: true, buildMode: false, clockMin: 600 };
}

const save = JSON.stringify({ version: SAVE_VERSION, state: toPersisted(runDays(7)) });
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(process.cwd(), "test-results", "p4");
await fs.mkdir(out, { recursive: true });
const sizes = (process.env.P4_VIEWPORTS ?? "390x844,375x667").split(",").map((v) => v.split("x").map(Number));

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const [width, height] of sizes) {
    const tag = `${width}x${height}`;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(({ save }) => {
      localStorage.setItem("last-chair-m3-slot-1", save);
      localStorage.setItem(
        "last-chair-settings",
        JSON.stringify({ version: 1, state: { tips: false, radioEnabled: false, voiceVolume: 0 } }),
      );
    }, { save });
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
    await enterGame(page);
    await page.getByRole("button", { name: "Office", exact: true }).click();
    await page.getByRole("tab", { name: "Stats" }).click();
    await page.getByText("Revenue vs. operating costs").waitFor();
    await page.screenshot({ path: path.join(out, `${tag}-office-stats.png`) });
    await page.getByRole("tab", { name: "Reports" }).click();
    await page.getByText("28-day winter calendar").waitFor();
    await page.screenshot({ path: path.join(out, `${tag}-office-reports.png`) });
    await page.getByRole("tab", { name: "Stats" }).click();
    await page.getByRole("button", { name: "Operations", exact: true }).click();
    await page.getByText("Fare vs. turnout").waitFor();
    await page.screenshot({ path: path.join(out, `${tag}-office-stats-ops.png`) });
    await context.close();
    assert.ok((await fs.readdir(out)).some((f) => f.startsWith(tag)));
  }
} finally {
  await browser.close();
}
console.log("saved to", out);