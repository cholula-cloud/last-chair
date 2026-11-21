/**
 * After footpath + style toggle: parking path, timber vs chalet tier 3.
 */
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const [{ createBuiltHill }, { pickFounder, placeAssetAtPad }, { SAVE_VERSION, toPersisted }] = await Promise.all([
  import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"),
  import("../src/game/state.ts"),
]);

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.PLAYTEST_OUT ?? "/opt/cursor/artifacts/last-chair-assets";
const slotKey = "last-chair-m3-slot-1";
const activeKey = "last-chair-m3-active";

await fs.mkdir(outDir, { recursive: true });

function save(buildingStyle) {
  let state = pickFounder(createBuiltHill(7), "elena");
  state = {
    ...state,
    lodgeTier: 3,
    phase: "day",
    paused: false,
    completedBeats: ["first_load"],
    buildMode: false,
    gunsVisible: false,
    groomVisible: false,
    assets: [],
  };
  state = placeAssetAtPad(state, "cafe", 0);
  state = placeAssetAtPad(state, "shop", 1);
  return {
    raw: JSON.stringify({ version: SAVE_VERSION, state: toPersisted(state) }),
    settings: JSON.stringify({ version: 1, state: { radioEnabled: false, buildingStyle } }),
  };
}

const scenarios = [
  { name: "path-timber-tier3", style: "1950s-timber", clip: { x: 220, y: 160, width: 820, height: 500 } },
  { name: "village-chalet70s-tier3", style: "chalet70s", clip: { x: 300, y: 60, width: 680, height: 480 } },
];

const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });

for (const { name, style, clip } of scenarios) {
  const { raw, settings } = save(style);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
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
  for (const label of ["Dismiss tip", "Dismiss morning note"]) {
    const tip = page.getByRole("button", { name: label });
    while ((await tip.count()) > 0) await tip.first().click({ timeout: 2000 }).catch(() => {});
  }
  await page.getByRole("button", { name: "Recenter the view" }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole("button", { name: "Hide HUD" }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  await page.screenshot({ path: path.join(outDir, `${name}-close.png`), clip });
  console.log("wrote", name, style);
  await context.close();
}

await browser.close();