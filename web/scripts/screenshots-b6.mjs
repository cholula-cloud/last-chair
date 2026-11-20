/**
 * B6 screenshots: lift placement (ghost, guide dots, snapped anchor ring) and venue placement
 * (valid cells plus faint blocked cells) at phone sizes. Chromium, touch.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-b6.mjs
 * Output: web/test-results/b6/<viewport>-<name>.png
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame, project } from "./playtest-m2.mjs";

const [{ TERRAIN }, { REFERENCE_TOPS }, { createBuiltHill }, { pickFounder }, { SAVE_VERSION, toPersisted }] = await Promise.all([
  import("../src/game/terrain.ts"), import("../src/game/descent.ts"), import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"), import("../src/game/state.ts"),
]);
// An established hill (lodge tier 2) so the venue list is open on day 1.
const venueSave = JSON.stringify({
  version: SAVE_VERSION,
  state: toPersisted({ ...pickFounder(createBuiltHill(), "elena"), lodgeTier: 2 }),
});
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(process.cwd(), "test-results", "b6");
await fs.mkdir(out, { recursive: true });
const world = (x, z) => [x, TERRAIN.height(x, z), z];
const sizes = (process.env.B6_VIEWPORTS ?? "390x844,375x667").split(",").map((v) => v.split("x").map(Number));

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const [width, height] of sizes) {
    const tag = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(() => localStorage.setItem("last-chair-settings", JSON.stringify({
      version: 1, state: { tips: false, radioEnabled: false, voiceVolume: 0 },
    })));
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const cdp = await context.newCDPSession(page);
    await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("last-chair-m3-slot-1"));
    await enterGame(page);
    await page.getByRole("button", { name: /Elena Vargas/ }).click().catch(() => {});
    await page.locator('[data-scene-ready="true"]').waitFor();
    const shot = (name) => page.screenshot({ path: path.join(out, `${tag}-${name}.png`) });
    const settle = async (points) => {
      for (let i = 0; i < 30; i++) await page.evaluate(() => new Promise(requestAnimationFrame));
      return project(page, points);
    };
    const touch = async (points) => {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]] });
      for (const p of points.slice(1)) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };

    // Lift mode: guide dots after Place lift, then a drag that ends on the ridge anchor.
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.getByRole("button", { name: "Place lift", exact: true }).click();
    await page.locator('[data-placement-kind="lift"]').waitFor();
    await settle([world(TERRAIN.base.x, TERRAIN.base.z)]);
    await shot("lift-guide");
    const ridge = REFERENCE_TOPS[0];
    const [from, to] = await settle([world(TERRAIN.base.x, TERRAIN.base.z), world(ridge.x, ridge.z)]);
    await touch([from, ...[1, 2, 3, 4].map((s) => ({ x: from.x + (to.x - from.x) * s / 4, y: from.y + (to.y - from.y) * s / 4 }))]);
    await settle([world(ridge.x, ridge.z)]);
    await shot("lift-snapped");
    await page.getByRole("button", { name: /cancel/i }).first().click();

    await context.close();

    // Venue mode, on a seeded hill.
    const venueContext = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await venueContext.addInitScript(({ save }) => {
      if (localStorage.getItem("last-chair-m3-slot-1")) return;
      localStorage.setItem("last-chair-m3-slot-1", save);
      localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: { tips: false, radioEnabled: false, voiceVolume: 0 } }));
    }, { save: venueSave });
    const venuePage = await venueContext.newPage();
    venuePage.setDefaultTimeout(20000);
    await venuePage.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
    await enterGame(venuePage);
    await venuePage.getByRole("button", { name: "Build", exact: true }).click();
    await venuePage.getByRole("button", { name: /Cafe|Café/ }).first().click();
    await venuePage.locator('[data-placement-kind="asset"]').waitFor();
    for (let i = 0; i < 30; i++) await venuePage.evaluate(() => new Promise(requestAnimationFrame));
    await venuePage.screenshot({ path: path.join(out, `${tag}-venue-grid.png`) });
    await venueContext.close();
    assert.ok((await fs.readdir(out)).some((f) => f.startsWith(tag)));
  }
} finally {
  await browser.close();
}
console.log("saved to", out);
