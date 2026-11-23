/**
 * Snow gun placement smoke — confirms gun draft opens without crashing and can place one gun.
 * PLAY_URL=https://cholula-cloud.github.io/last-chair node scripts/playtest-snow-gun.mjs
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import "./register-game.mjs";

const [{ createBuiltHill, addReferenceDescent }, { pickFounder }, { toPersisted, SAVE_VERSION }, { TERRAIN }] =
  await Promise.all([
    import("../src/game/__fixtures__/built-hill.ts"),
    import("../src/game/rules.ts"),
    import("../src/game/state.ts"),
    import("../src/game/terrain.ts"),
  ]);

const { enterGame, project } = await import("./playtest-m2.mjs");

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const saveKey = "last-chair-m3-slot-1";

let hill = pickFounder(createBuiltHill(42), "elena");
hill = addReferenceDescent(hill, 0);
hill = { ...hill, lodgeTier: 2, cash: 50_000, phase: "day", paused: false, buildMode: false };

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
  executablePath: process.env.CHROMIUM_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.addInitScript(
  (payload) => {
    localStorage.setItem("last-chair-m3-slot-1", JSON.stringify(payload));
    localStorage.setItem(
      "last-chair-settings",
      JSON.stringify({ version: 1, state: { muted: true, reduceMotion: "on", tips: false } }),
    );
  },
  { state: toPersisted(hill), version: SAVE_VERSION },
);

await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await enterGame(page);

await page.getByRole("button", { name: "Build", exact: true }).tap();
await page.getByRole("group", { name: "Build sections" }).getByRole("button", { name: /Snow/ }).tap();
await page.getByRole("button", { name: /Snow gun/i }).tap();

const draft = page.locator('[data-placement-kind="gun"]');
await draft.waitFor({ timeout: 15_000 });
assert.equal(errors.length, 0, "page errors during gun placement: " + errors.join("; "));

const cdp = await page.context().newCDPSession(page);
const at = { x: TERRAIN.base.x + 0.7, z: TERRAIN.base.z + 0.9 };
const [pt] = await project(page, [[at.x, TERRAIN.height(at.x, at.z), at.z]]);
await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: pt.x, y: pt.y }] });
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

const review = draft.getByRole("button", { name: "Review", exact: true });
if ((await review.count()) > 0) await review.tap();
await draft.getByRole("button", { name: /Build here|Confirm/ }).tap();

const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), saveKey);
const guns = persisted?.state?.guns?.length ?? 0;
assert.ok(guns >= 1, "expected at least one gun after placement");

await browser.close();
console.log("playtest-snow-gun ok", { base, guns });