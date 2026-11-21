/**
 * Lodge kit + annex screenshots for review. Requires dev server on PLAY_URL.
 */
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const [{ createBuiltHill }, { lodgeAttachPads }, { pickFounder, placeAssetAtPad }, { SAVE_VERSION, toPersisted }] =
  await Promise.all([
    import("../src/game/__fixtures__/built-hill.ts"),
    import("../src/game/base.ts"),
    import("../src/game/rules.ts"),
    import("../src/game/state.ts"),
  ]);

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.PLAYTEST_OUT ?? "/opt/cursor/artifacts/lodge-assets";
const slotKey = "last-chair-m3-slot-1";
const activeKey = "last-chair-m3-active";

await fs.mkdir(outDir, { recursive: true });

function saveForTier(tier, withAnnexVenues = false) {
  let state = pickFounder(createBuiltHill(7), "elena");
  state = {
    ...state,
    lodgeTier: tier,
    phase: "day",
    paused: false,
    completedBeats: ["first_load"],
    buildMode: false,
    gunsVisible: false,
    groomVisible: false,
  };
  if (withAnnexVenues && tier >= 2) {
    const pads = lodgeAttachPads(tier);
    if (pads[0]) {
      const next = placeAssetAtPad(state, "cafe", 0);
      if (next !== state) state = next;
    }
    if (tier >= 3 && pads[1]) {
      const next = placeAssetAtPad(state, "shop", 1);
      if (next !== state) state = next;
    }
  }
  return JSON.stringify({ version: SAVE_VERSION, state: toPersisted(state) });
}

const scenarios = [
  { name: "tier1-base-lodge", tier: 1, venues: false },
  { name: "tier2-base-plus-annex-wing", tier: 2, venues: false },
  { name: "tier3-grand-lodge-full", tier: 3, venues: false },
  { name: "tier3-with-cafe-shop-annexes", tier: 3, venues: true },
];

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--enable-unsafe-swiftshader"] }
    : { args: ["--enable-unsafe-swiftshader"] }),
});

for (const { name, tier, venues } of scenarios) {
  const raw = saveForTier(tier, venues);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  await page.addInitScript(
    ({ raw, slotKey, activeKey }) => {
      localStorage.setItem(slotKey, raw);
      localStorage.setItem(activeKey, "1");
      localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: { radioEnabled: false } }));
    },
    { raw, slotKey, activeKey },
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
  const loadedTier = await page.evaluate(() => {
    const raw = localStorage.getItem("last-chair-m3-slot-1");
    if (!raw) return null;
    try {
      return JSON.parse(raw)?.state?.lodgeTier ?? null;
    } catch {
      return null;
    }
  });
  await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  await page.screenshot({
    path: path.join(outDir, `${name}-lodge.png`),
    clip: { x: 400, y: 80, width: 480, height: 400 },
  });
  console.log("wrote", name, "expected tier", tier, "save lodgeTier", loadedTier);
  await context.close();
}

await browser.close();
console.log("Screenshots in", outDir);