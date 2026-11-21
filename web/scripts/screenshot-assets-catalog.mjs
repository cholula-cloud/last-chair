/**
 * Base-area asset catalog screenshots (parking, paths, buildings, placed venues).
 * PLAY_URL must be serving the game.
 */
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const [{ createBuiltHill }, { lodgeAttachPads, ASSET_CATALOG }, { pickFounder, placeAsset, placeAssetAtPad }, { SAVE_VERSION, toPersisted }] =
  await Promise.all([
    import("../src/game/__fixtures__/built-hill.ts"),
    import("../src/game/base.ts"),
    import("../src/game/rules.ts"),
    import("../src/game/state.ts"),
  ]);

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const outDir = process.env.PLAYTEST_OUT ?? "/opt/cursor/artifacts/last-chair-assets";
const slotKey = "last-chair-m3-slot-1";
const activeKey = "last-chair-m3-active";

await fs.mkdir(outDir, { recursive: true });

function baseSave(overrides = {}) {
  let state = pickFounder(createBuiltHill(7), "elena");
  return {
    ...state,
    lodgeTier: 3,
    phase: "day",
    paused: false,
    completedBeats: ["first_load"],
    buildMode: false,
    gunsVisible: false,
    groomVisible: false,
    ...overrides,
  };
}

function persist(state) {
  return JSON.stringify({ version: SAVE_VERSION, state: toPersisted(state) });
}

/** Detached placements at Dutch Hill hint coordinates (not on annex pads). */
function withDetachedVenues(state) {
  const placements = [
    ["warming_hut", { x: 3.6, z: 14.5 }],
    ["cafe", { x: 7.7, z: 14.7 }],
    ["shop", { x: 8.9, z: 15.9 }],
    ["rentals", { x: 11.2, z: 15.4 }],
    ["ski_school", { x: 10.1, z: 14.2 }],
  ];
  let next = state;
  for (const [id, at] of placements) {
    const res = placeAsset(next, id, at);
    if (res !== next) next = res;
  }
  return next;
}

function withAnnexVenues(state) {
  const pads = lodgeAttachPads(state.lodgeTier);
  let next = state;
  const order = ["cafe", "shop", "rentals", "ski_school", "warming_hut"];
  for (let i = 0; i < pads.length; i++) {
    const id = order[i % order.length];
    const res = placeAssetAtPad(next, id, i);
    if (res !== next) next = res;
  }
  return next;
}

const scenarios = [
  {
    name: "01-parking-lot-to-lodge",
    state: baseSave({ lodgeTier: 1 }),
    clip: { x: 280, y: 200, width: 720, height: 420 },
  },
  {
    name: "02-base-infrastructure-tier1",
    state: baseSave({ lodgeTier: 1, assets: [] }),
    clip: null,
  },
  {
    name: "03-lodge-tier1-only",
    state: baseSave({ lodgeTier: 1, assets: [] }),
    clip: { x: 380, y: 100, width: 520, height: 400 },
  },
  {
    name: "04-lodge-tier2-west-wing",
    state: baseSave({ lodgeTier: 2, assets: [] }),
    clip: { x: 380, y: 100, width: 520, height: 400 },
  },
  {
    name: "05-lodge-tier3-both-wings",
    state: baseSave({ lodgeTier: 3, assets: [] }),
    clip: { x: 380, y: 100, width: 520, height: 400 },
  },
  {
    name: "06-detached-venues-default-styles",
    state: withDetachedVenues(baseSave({ lodgeTier: 3, assets: [] })),
    clip: { x: 200, y: 80, width: 880, height: 520 },
  },
  {
    name: "07-annex-pads-tier3",
    state: withAnnexVenues(baseSave({ lodgeTier: 3, assets: [] })),
    clip: { x: 320, y: 60, width: 640, height: 480 },
  },
];

async function capture(page, fileBase, clip) {
  await page.screenshot({ path: path.join(outDir, `${fileBase}.png`) });
  if (clip) await page.screenshot({ path: path.join(outDir, `${fileBase}-close.png`), clip });
}

async function prepPage(page) {
  for (const label of ["Dismiss tip", "Dismiss morning note"]) {
    const tip = page.getByRole("button", { name: label });
    while ((await tip.count()) > 0) await tip.first().click({ timeout: 2000 }).catch(() => {});
  }
  await page.getByRole("button", { name: "Recenter the view" }).click({ timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});

for (const { name, state, clip } of scenarios) {
  const raw = persist(state);
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
      localStorage.setItem(
        "last-chair-settings",
        JSON.stringify({ version: 1, state: { radioEnabled: false, buildingStyle: "1950s-timber" } }),
      );
    },
    { raw, slotKey, activeKey },
  );
  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await enterGame(page);
  await prepPage(page);
  await capture(page, name, clip);
  console.log("wrote", name);
  await context.close();
}

/** Manifest-style inventory for the plan doc. */
const inventory = {
  playableBuildings: Object.entries(ASSET_CATALOG).map(([id, a]) => ({
    id,
    label: a.label,
    styleId: a.styleId,
    attachable: a.attachable,
    opensAtTier: a.opensAtTier,
  })),
  kitVillage: [
    "base-lodge",
    "lodge-annex-2",
    "lodge-annex-3",
    "clapboard-house",
    "cafe",
    "ski-shop",
    "warming-hut",
    "lamp-post",
    "snowcat",
    "lift-terminal-bottom",
    "lift-terminal-top",
    "lift-tower",
    "t-bar",
    "chair-double",
    "snow-gun",
    "sign-post",
    "area-sign",
  ],
  styleVariantsOnDisk: ["1950s-timber (default in sim)", "chalet70s (GLB variants in manifest; not wired in village yet)"],
};
await fs.writeFile(path.join(outDir, "inventory.json"), JSON.stringify(inventory, null, 2));

await browser.close();
console.log("Screenshots in", outDir);