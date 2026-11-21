/**
 * Forest / tree visual check after hill load.
 * Usage: PLAY_URL=http://127.0.0.1:3000 node scripts/screenshots-trees.mjs
 * Output: /opt/cursor/artifacts/trees-mountain.png (and web/test-results/trees/)
 */
import fs from "node:fs/promises";
import path from "node:path";
import "./register-game.mjs";
import { chromium } from "playwright";
import { enterGame, waitSceneReady } from "./playtest-m2.mjs";

const [{ createBuiltHill }, { pickFounder, sleep }, { SAVE_VERSION, toPersisted }] = await Promise.all([
  import("../src/game/__fixtures__/built-hill.ts"),
  import("../src/game/rules.ts"),
  import("../src/game/state.ts"),
]);

const save = JSON.stringify({
  version: SAVE_VERSION,
  state: toPersisted(sleep(pickFounder(createBuiltHill(7), "elena"))),
});

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(process.cwd(), "test-results", "trees");
const artifact = "/opt/cursor/artifacts/trees-mountain.png";
await fs.mkdir(out, { recursive: true });
await fs.mkdir(path.dirname(artifact), { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  await context.addInitScript(({ save }) => {
    localStorage.setItem("last-chair-m3-slot-1", save);
    localStorage.setItem(
      "last-chair-settings",
      JSON.stringify({ version: 1, state: { tips: false, radioEnabled: false, voiceVolume: 0 } }),
    );
  }, { save });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await enterGame(page);
  await waitSceneReady(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, "mountain-1280.png"), fullPage: false });
  await fs.copyFile(path.join(out, "mountain-1280.png"), artifact);
  console.log("wrote", artifact);
} finally {
  await browser.close();
}