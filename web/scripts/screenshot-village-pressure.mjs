/**
 * Village beauty / readability matrix: styles × tiers × viewports, path + annex.
 */
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const [
  { createBuiltHill },
  { pickFounder, placeAssetAtPad },
  { SAVE_VERSION, toPersisted },
  { DAY_START_MIN },
] = await Promise.all([
  import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"),
  import("../src/game/state.ts"),
  import("../src/game/types.ts"),
]);

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.PLAYTEST_OUT ?? "/opt/cursor/artifacts/village-pressure";
const slotKey = "last-chair-m3-slot-1";
const activeKey = "last-chair-m3-active";

await fs.mkdir(outDir, { recursive: true });

function save({ tier, style, night, annex }) {
  let state = pickFounder(createBuiltHill(7), "elena");
  state = {
    ...state,
    lodgeTier: tier,
    phase: night ? "night" : "day",
    clockMin: night ? DAY_START_MIN + 420 : DAY_START_MIN + 30,
    paused: false,
    completedBeats: ["first_load"],
    buildMode: false,
    gunsVisible: false,
    groomVisible: false,
    assets: [],
  };
  if (annex && tier >= 2) {
    state = placeAssetAtPad(state, "cafe", 0);
    if (tier >= 3) state = placeAssetAtPad(state, "shop", 1);
  }
  const settings = {
    radioEnabled: false,
    buildingStyle: style,
    graphicsQuality: "standard",
  };
  return {
    raw: JSON.stringify({ version: SAVE_VERSION, state: toPersisted(state) }),
    settings: JSON.stringify({ version: 1, state: settings }),
  };
}

const matrix = [];
for (const style of ["1950s-timber", "chalet70s"]) {
  for (const tier of [1, 2, 3]) {
    matrix.push({ name: `t${tier}-${style.replace(/\W/g, "")}-day`, tier, style, night: false, annex: tier >= 2 });
    if (tier === 3) {
      matrix.push({ name: `t3-${style.replace(/\W/g, "")}-night`, tier: 3, style, night: true, annex: true });
    }
  }
}
matrix.push({ name: "path-phone-timber", tier: 1, style: "1950s-timber", night: false, annex: false, phone: true, pathClip: true });

const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });

async function prep(page) {
  for (const label of ["Dismiss tip", "Dismiss morning note"]) {
    const tip = page.getByRole("button", { name: label });
    while ((await tip.count()) > 0) await tip.first().click({ timeout: 1500 }).catch(() => {});
  }
  await page.getByRole("button", { name: "Recenter the view" }).click({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

for (const row of matrix) {
  const { raw, settings } = save(row);
  const viewport = row.phone ? { width: 390, height: 844 } : { width: 1280, height: 720 };
  const context = await browser.newContext({
    ...viewport,
    deviceScaleFactor: row.phone ? 3 : 2,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  await page.addInitScript(
    ({ raw, settings, slotKey, activeKey }) => {
      localStorage.setItem(slotKey, raw);
      localStorage.setItem(activeKey, "1");
      localStorage.setItem("last-chair-settings", settings);
    },
    { raw, settings, slotKey, activeKey },
  );
  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await enterGame(page);
  await prep(page);
  await page.getByRole("button", { name: "Hide HUD" }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const file = path.join(outDir, `${row.name}.png`);
  await page.screenshot({ path: file });
  if (row.pathClip) {
    await page.screenshot({
      path: path.join(outDir, `${row.name}-path.png`),
      clip: row.phone ? { x: 20, y: 380, width: 350, height: 320 } : { x: 220, y: 160, width: 820, height: 500 },
    });
  } else if (!row.phone) {
    await page.screenshot({
      path: path.join(outDir, `${row.name}-lodge.png`),
      clip: { x: 320, y: 40, width: 640, height: 420 },
    });
  }
  console.log("wrote", row.name);
  await context.close();
}

await browser.close();
console.log("Pressure captures in", outDir);