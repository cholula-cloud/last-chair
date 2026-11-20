/**
 * B7 screenshots: two confirmed trails stay visible while a third is being painted.
 * Chromium, touch, phone size.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-b7.mjs
 * Output: web/test-results/b7/<viewport>-trail-context.png
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame, project } from "./playtest-m2.mjs";

const [{ TERRAIN }, { createBuiltHill, addReferenceDescent }, { pickFounder }, { SAVE_VERSION, toPersisted }] =
  await Promise.all([
    import("../src/game/terrain.ts"), import("../src/game/__fixtures__/built-hill.ts"),
    import("../src/game/rules.ts"), import("../src/game/state.ts"),
  ]);
// One lift with two confirmed runs.
// The second run is pulled apart from the first so each ribbon reads on its own.
const twoRuns = addReferenceDescent(createBuiltHill(), 0);
const apart = twoRuns.trails[1].path.map((p) => (p.z > 3 && p.z < 14 ? { ...p, x: p.x - 1.4 } : p));
twoRuns.trails[1] = { ...twoRuns.trails[1], path: apart };
const save = JSON.stringify({ version: SAVE_VERSION, state: toPersisted(pickFounder(twoRuns, "elena")) });
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(process.cwd(), "test-results", "b7");
await fs.mkdir(out, { recursive: true });
const world = (x, z) => [x, TERRAIN.height(x, z), z];
const sizes = (process.env.B7_VIEWPORTS ?? "390x844").split(",").map((v) => v.split("x").map(Number));

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const [width, height] of sizes) {
    const tag = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.addInitScript(({ save }) => {
      if (localStorage.getItem("last-chair-m3-slot-1")) return;
      localStorage.setItem("last-chair-m3-slot-1", save);
      localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: { tips: false, radioEnabled: false, voiceVolume: 0 } }));
    }, { save });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const cdp = await context.newCDPSession(page);
    await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
    await enterGame(page);
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.getByRole("button", { name: /Paint a trail/i }).click();
    await page.locator('[data-placement-kind="trail"]').waitFor();
        // Branch off the first run and end mid-hill, so the line stays where it was drawn.
    const route = [world(0.3, 1.2), world(4.6, 3.6), world(6.2, 7.2)];
    for (let i = 0; i < 60; i++) await page.evaluate(() => new Promise(requestAnimationFrame));
    const points = await project(page, route);
    const samples = [points[0]];
    for (let i = 1; i < points.length; i++) {
      for (let step = 1; step <= 4; step++) {
        samples.push({
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * step / 4,
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * step / 4,
        });
      }
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [samples[0]] });
    for (const p of samples.slice(1)) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [p] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    for (let i = 0; i < 40; i++) await page.evaluate(() => new Promise(requestAnimationFrame));
    await page.screenshot({ path: path.join(out, `${tag}-trail-context.png`) });
    await context.close();
    assert.ok((await fs.readdir(out)).some((f) => f.startsWith(tag)));
  }
} finally {
  await browser.close();
}
console.log("saved to", out);
