/**
 * Row 30 snow shader: morning looks after Minimal / Mid / High and a thaw afternoon.
 * Requires MOUNTAIN_TRAIL_CONDITIONING = true in snowMaterial.ts (off by default; use Conditions overlay).
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-snow30.mjs
 * Output: /opt/cursor/artifacts/390x844-snow-*.png
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
const [
  { createBuiltHill },
  { pickFounder },
  { SAVE_VERSION, toPersisted },
  { TRAIL_SEGMENTS, freshTrail },
] = await Promise.all([
  import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"),
  import("../src/game/state.ts"),
  import("../src/game/snow.ts"),
]);

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outRoot = process.env.SNOW30_OUT ?? "/opt/cursor/artifacts";
const outLocal = path.join(process.cwd(), "test-results", "snow30");
await fs.mkdir(outRoot, { recursive: true });
await fs.mkdir(outLocal, { recursive: true });

const width = 390;
const height = 844;

function segmentTrail(depth, quality, coverage) {
  return Array.from({ length: TRAIL_SEGMENTS }, (_, i) => ({
    depth: depth - i * 0.02,
    quality: quality - i * 0.03,
    coverage: Math.max(0.05, coverage - i * 0.04),
  }));
}

const SCENES = {
  minimal: {
    snow: "minimal",
    groomed: Array(TRAIL_SEGMENTS).fill(false),
    trail: segmentTrail(0.35, 0.32, 0.55),
    clockMin: 8 * 60 + 30,
    weather: "clear",
  },
  mid: {
    snow: "mid",
    groomed: Array(TRAIL_SEGMENTS).fill(true),
    trail: segmentTrail(0.55, 0.78, 0.95),
    clockMin: 8 * 60 + 30,
    weather: "clear",
  },
  high: {
    snow: "high",
    groomed: Array(TRAIL_SEGMENTS).fill(true),
    trail: segmentTrail(0.6, 0.92, 1),
    clockMin: 8 * 60 + 30,
    weather: "clear",
  },
  thaw: {
    snow: "mid",
    groomed: Array(TRAIL_SEGMENTS).fill(true),
    trail: segmentTrail(0.4, 0.42, 0.7),
    clockMin: 15 * 60,
    weather: "thaw",
  },
};

function saveForScene(key) {
  const scene = SCENES[key];
  assert(scene, key);
  const state = pickFounder(createBuiltHill(4242), "elena");
  state.dayIndex = 8;
  state.phase = "day";
  state.paused = false;
  state.clockMin = scene.clockMin;
  state.weather = scene.weather;
  state.snow = scene.snow;
  state.snowQuality = scene.trail.reduce((a, s) => a + s.quality, 0) / scene.trail.length;
  state.snowDepth = scene.trail.reduce((a, s) => a + s.depth, 0) / scene.trail.length;
  state.trails = state.trails.map((t, i) => ({
    ...t,
    open: true,
    snow: i === 0 ? scene.trail : freshTrail(0.5, 0.55),
    groomed: scene.groomed,
    previousRuns: key === "thaw" ? 90 : 12,
  }));
  state.dayStats = { ...state.dayStats, runsByTrail: state.trails.map((_, i) => (i === 0 ? (key === "thaw" ? 90 : 12) : 0)) };
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
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await sceneContext.addInitScript(({ payload }) => {
      localStorage.setItem("last-chair-m3-slot-1", payload);
      localStorage.setItem("last-chair-active-slot", "1");
      localStorage.setItem("last-chair-settings", JSON.stringify({
        version: 1,
        state: { tips: false, radioEnabled: false, voiceVolume: 0 },
      }));
    }, { payload: save });
    const scenePage = await sceneContext.newPage();
    scenePage.setDefaultTimeout(30000);
    await scenePage.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
    const resume = scenePage.getByRole("button", { name: /^Continue/ });
    if ((await resume.count()) > 0) await resume.tap();
    else await scenePage.getByRole("button", { name: "New winter" }).tap();
    await scenePage.locator('[data-scene-ready="true"]').waitFor({ timeout: 45000 });
    for (let i = 0; i < 45; i++) await scenePage.evaluate(() => new Promise(requestAnimationFrame));
    const name = `${width}x${height}-snow-${key}.png`;
    await scenePage.screenshot({ path: path.join(outRoot, name) });
    await scenePage.screenshot({ path: path.join(outLocal, name) });
    console.log("wrote", name);
    await sceneContext.close();
  }
} finally {
  await browser.close();
}