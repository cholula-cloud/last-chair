/**
 * Row O4 crowd/revenue/demand layers at 390×844.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-o4.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import "./register-game.mjs";
import { enterGame } from "./playtest-m2.mjs";

const { createBuiltHill } = await import("../src/game/__fixtures__/built-hill.ts");
const { pickFounder, tick } = await import("../src/game/rules.ts");
const { SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");
const { MS_PER_GAME_MINUTE } = await import("../src/game/types.ts");

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = process.env.O4_OUT ?? "/opt/cursor/artifacts";
await fs.mkdir(out, { recursive: true });

let state = pickFounder(createBuiltHill(202), "elena");
state.assets.push({ id: "cafe", at: { x: 2.4, z: 14.8 }, styleId: "1950s-timber" });
state.dayStats = { ...state.dayStats, venueRevenue: { cafe: 54 } };
while (state.phase === "day" && state.clockMin < 11 * 60) {
  state = tick(state, MS_PER_GAME_MINUTE * 8);
}
const save = { version: SAVE_VERSION, state: toPersisted({ ...state, paused: true }) };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.addInitScript((s) => {
    localStorage.setItem("last-chair-m3-slot-1", JSON.stringify(s));
    localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: { tips: false, muted: true } }));
  }, save);
  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await enterGame(page);
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 60000 });
  const strip = page.getByRole("group", { name: "Map layers" });
  for (const [layer, slug] of [
    ["Crowds", "crowds"],
    ["Revenue", "revenue"],
    ["Guests want", "demand"],
  ]) {
    await page.getByRole("button", { name: "Layers" }).tap();
    await strip.getByRole("button", { name: layer, exact: true }).tap();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `390x844-o4-${slug}.png`) });
    await page.getByRole("button", { name: "Off", exact: true }).tap();
  }
} finally {
  await browser.close();
}