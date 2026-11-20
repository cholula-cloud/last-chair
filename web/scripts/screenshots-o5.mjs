/**
 * Row O5 Trails map layer screenshots.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-o5.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import "./register-game.mjs";
import { enterGame } from "./playtest-m2.mjs";

const { createBuiltHill } = await import("../src/game/__fixtures__/built-hill.ts");
const { pickFounder } = await import("../src/game/rules.ts");
const { SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = process.env.O5_OUT ?? "/opt/cursor/artifacts";
await fs.mkdir(out, { recursive: true });

const state = pickFounder(createBuiltHill(310), "elena");
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
  await page.getByRole("button", { name: "Layers" }).tap({ force: true });
  await page.getByRole("group", { name: "Map layers" }).getByRole("button", { name: "Trails" }).tap({ force: true });
  await page.getByLabel("Trails legend").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, "390x844-o5-trails-layer.png") });
} finally {
  await browser.close();
}