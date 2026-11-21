/**
 * Row 33 mobile juice screenshots (home + night recap).
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-juice33.mjs
 * Output: /opt/cursor/artifacts/390x844-juice-*.png
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
const outRoot = process.env.JUICE33_OUT ?? "/opt/cursor/artifacts";
await fs.mkdir(outRoot, { recursive: true });

const w = 390;
const h = 844;

let state = pickFounder(createBuiltHill(5150), "elena");
state.paused = false;
while (state.phase === "day" && state.clockMin < 14 * 60) {
  state = tick(state, MS_PER_GAME_MINUTE * 4);
}
state = { ...state, paused: true };
const save = { version: SAVE_VERSION, state: toPersisted(state) };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});

async function shot(page, name) {
  const file = path.join(outRoot, `390x844-juice-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

try {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await page.addInitScript((payload) => {
    localStorage.setItem("last-chair-m3-slot-1", JSON.stringify(payload.save));
    localStorage.setItem(
      "last-chair-settings",
      JSON.stringify({ version: 1, state: { reduceMotion: "off", tips: false, muted: true } }),
    );
  }, { save });
  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await enterGame(page);
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 60000 });
  await shot(page, "home-full-motion");

  await page.addInitScript(() => {
    const raw = localStorage.getItem("last-chair-settings");
    if (!raw) return;
    const data = JSON.parse(raw);
    data.state = { ...data.state, reduceMotion: "on" };
    localStorage.setItem("last-chair-settings", JSON.stringify(data));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGame(page);
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 60000 });
  await shot(page, "home-reduced-motion");

  await page.getByRole("button", { name: "Close hill" }).tap({ force: true });
  await page.getByRole("heading", { name: /Closing recap|Night recap/i }).waitFor({ timeout: 45000 });
  await shot(page, "night-recap");
} finally {
  await browser.close();
}