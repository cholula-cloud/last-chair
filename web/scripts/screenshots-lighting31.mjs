/**
 * PR 31 day/night lighting screenshots.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-lighting31.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
const [
  { createBuiltHill },
  { pickFounder, skipToClose },
  { SAVE_VERSION, toPersisted },
  { TRAIL_SEGMENTS, freshTrail },
] = await Promise.all([
  import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"),
  import("../src/game/state.ts"),
  import("../src/game/snow.ts"),
]);

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outRoot = process.env.LIGHTING31_OUT ?? "/opt/cursor/artifacts";
const outLocal = path.join(process.cwd(), "test-results", "lighting31");
await fs.mkdir(outRoot, { recursive: true });
await fs.mkdir(outLocal, { recursive: true });

const width = 390;
const height = 844;

const SCENES = {
  day: { phase: "day", clockMin: 12 * 60, weather: "clear" },
  night: { phase: "night", clockMin: 18 * 60, weather: "clear" },
};

function baseState() {
  const groomed = Array(TRAIL_SEGMENTS).fill(true);
  const trail = Array.from({ length: TRAIL_SEGMENTS }, (_, i) => ({
    depth: 0.55 - i * 0.02,
    quality: 0.78 - i * 0.03,
    coverage: Math.max(0.05, 0.95 - i * 0.04),
  }));
  let state = pickFounder(createBuiltHill(4242), "elena");
  state.dayIndex = 8;
  state.phase = "day";
  state.paused = false;
  state.clockMin = 12 * 60;
  state.weather = state.weatherDays[state.dayIndex - 1].kind;
  state.snow = "mid";
  state.snowQuality = trail.reduce((a, s) => a + s.quality, 0) / trail.length;
  state.snowDepth = trail.reduce((a, s) => a + s.depth, 0) / trail.length;
  state.trails = state.trails.map((t, i) => ({
    ...t,
    open: true,
    snow: i === 0 ? trail : freshTrail(0.5, 0.55),
    groomed,
    previousRuns: 24,
  }));
  state.dayStats = { ...state.dayStats, runsByTrail: state.trails.map((_, i) => (i === 0 ? 24 : 0)) };
  return state;
}

function saveForScene(key) {
  assert(SCENES[key], key);
  let state = baseState();
  if (key === "night") state = { ...skipToClose(state), paused: true };
  return JSON.stringify({ version: SAVE_VERSION, state: toPersisted(state) });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const key of Object.keys(SCENES)) {
    const save = saveForScene(key);
    const sceneContext = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    await sceneContext.addInitScript(({ payload }) => {
      localStorage.setItem("last-chair-m3-slot-1", payload);
      localStorage.setItem("last-chair-m3-active", "1");
      localStorage.setItem("last-chair-settings", JSON.stringify({
        version: 1,
        state: { tips: false, radioEnabled: false, voiceVolume: 0 },
      }));
    }, { payload: save });
    const scenePage = await sceneContext.newPage();
    scenePage.setDefaultTimeout(30000);
    await scenePage.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
    await scenePage.getByRole("heading", { name: "Last Chair" }).waitFor({ timeout: 15_000 });
    const resume = scenePage.getByRole("button", { name: /^Continue/ });
    if ((await resume.count()) > 0) await resume.tap();
    else await scenePage.getByRole("button", { name: "New winter", exact: true }).tap();
    await scenePage.locator('[data-scene-ready="true"]').waitFor({ timeout: 45000 });
    for (let i = 0; i < 60; i++) await scenePage.evaluate(() => new Promise(requestAnimationFrame));
    const name = `${width}x${height}-lighting-${key}.png`;
    await scenePage.screenshot({ path: path.join(outRoot, name) });
    await scenePage.screenshot({ path: path.join(outLocal, name) });
    console.log("wrote", name);
    await sceneContext.close();
  }
} finally {
  await browser.close();
}