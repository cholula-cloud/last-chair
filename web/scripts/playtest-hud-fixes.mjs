/**
 * Playtest HUD fixes: layers, grid, bottom minimize, no goal strip.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/playtest-hud-fixes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";

const [{ createBuiltHill }, { pickFounder }, { SAVE_KEY, SAVE_VERSION, toPersisted }] = await Promise.all([
  import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"),
  import("../src/game/state.ts"),
]);

const BASE = process.env.PLAY_URL ?? "http://127.0.0.1:3000";
const outRoot = path.join(process.env.PLAYTEST_OUT ?? "/opt/cursor/artifacts", "hud-playtest");
fs.mkdirSync(outRoot, { recursive: true });

const FAILURES = [];

function fail(msg) {
  FAILURES.push(msg);
  console.error(`FAIL: ${msg}`);
}

async function waitSceneReady(page) {
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 60_000 });
}

async function startPlay(page) {
  const hill = pickFounder(createBuiltHill(9745), "elena");
  const save = JSON.stringify({ version: SAVE_VERSION, state: toPersisted({ ...hill, paused: false, phase: "day" }) });
  await page.addInitScript(() => localStorage.setItem("last-chair-settings", JSON.stringify({ state: { tips: false }, version: 1 })));
  await page.goto(`${BASE}/play?stats=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate((payload) => {
    localStorage.setItem("last-chair-m3-slot-1", payload);
  }, save);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 30_000 });
  await waitSceneReady(page);
  await page.getByText(/Day 1\/28/).waitFor({ timeout: 15_000 });
}

async function shot(page, name) {
  const p = path.join(outRoot, `${name}.png`);
  await page.screenshot({ path: p });
  console.log(`shot: ${p}`);
  return p;
}

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => fail(`pageerror: ${e}`));

try {
  await startPlay(page);
  await shot(page, "01-day-play-default");

  const goals = page.getByRole("region", { name: "Winter goal" });
  if (await goals.count()) fail("Goal strip still visible in play HUD");

  await page.getByRole("button", { name: "Layers" }).click();
  await page.waitForTimeout(400);
  const dock = page.locator("[data-layer-dock]");
  if (!(await dock.isVisible())) fail("Layer dock did not open at bottom from Layers button");
  const strip = dock.locator("[data-layer-strip]");
  if (!(await strip.isVisible())) fail("Layer strip missing from bottom dock");
  if (await page.getByRole("navigation", { name: "Hill actions" }).isVisible()) {
    fail("Action bar still visible while layer dock is open");
  }
  const legend = dock.locator('[data-overlay-legend="slope"]');
  if (!(await legend.isVisible())) fail("Slope legend missing from bottom dock");
  await shot(page, "02-layers-slope-strip");
  await page.getByRole("button", { name: "Layers" }).click();
  await page.waitForTimeout(300);

  await page.getByRole("button", { name: "Grid off" }).click();
  await page.waitForTimeout(500);
  const gridOn = page.getByRole("button", { name: "Grid on" });
  if (!(await gridOn.isVisible())) fail("Grid toggle did not switch to on");
  await shot(page, "03-grid-on");

  await page.getByRole("button", { name: "Minimize hill controls" }).click();
  await page.waitForTimeout(300);
  if (await page.getByRole("navigation", { name: "Hill actions" }).isVisible()) {
    fail("Action bar still visible after minimize");
  }
  const restore = page.getByRole("button", { name: "Show hill controls" });
  if (!(await restore.isVisible())) fail("Show controls pill missing after minimize");
  await shot(page, "04-bottom-minimized");

  await restore.click();
  await page.waitForTimeout(300);
  if (!(await page.getByRole("navigation", { name: "Hill actions" }).isVisible())) {
    fail("Action bar not restored");
  }
  await shot(page, "05-bottom-restored");

  await page.getByRole("button", { name: "Hide HUD" }).click();
  await page.waitForTimeout(300);
  if (await page.getByRole("button", { name: "Layers" }).isVisible()) fail("Map rail visible when HUD hidden");
  await shot(page, "06-hud-hidden");

  await page.getByRole("button", { name: "Show HUD" }).click();
  await page.waitForTimeout(300);
  await shot(page, "07-hud-shown");

  await page.getByRole("button", { name: "Office" }).click();
  await page.waitForTimeout(500);
  const officeGoals = page.getByRole("list", { name: "Winter goal" });
  if (!(await officeGoals.isVisible())) fail("Office winter goals list missing");
  await shot(page, "08-office-goals");
} finally {
  await browser.close();
}

if (FAILURES.length) {
  console.error(`\n${FAILURES.length} failure(s):`);
  for (const f of FAILURES) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nAll HUD playtest checks passed.");