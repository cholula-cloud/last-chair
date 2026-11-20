// Exercise the first-winter coach on the same prepared operating hill at each screen size.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { enterGame, resolveRadio } from "./playtest-m2.mjs";
const { createInitialState, SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");
const { checkPaint, commitPaint, pickFounder, placeLift, tick, trailOptions } = await import("../src/game/rules.ts");
const { REFERENCE_TOPS } = await import("../src/game/descent.ts");
const { TERRAIN } = await import("../src/game/terrain.ts");
const { STANDARD_BRUSH_WIDTH } = await import("../src/game/paintedTrail.ts");

const { MS_PER_GAME_MINUTE } = await import("../src/game/types.ts");

const engine = process.env.PLAYTEST_ENGINE ?? "chromium";
const browser = await ({ chromium, webkit })[engine].launch(engine === "chromium" ? {
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
} : {});
const base = process.env.PLAY_URL ?? "http://127.0.0.1:3000";
const hill = placeLift(pickFounder(createInitialState(42), "elena"), {
  type: "surface", bottom: TERRAIN.base, top: REFERENCE_TOPS[0],
});
const strokes = trailOptions(hill, 0)
  .map(option => [{ points: option.path, widthFt: STANDARD_BRUSH_WIDTH }])
  .find(draft => checkPaint(hill, draft).reason === null);
assert(strokes);
let prepared = { ...commitPaint(hill, strokes), paused: false };
while (prepared.clockMin < 840) prepared = tick(prepared, 4 * MS_PER_GAME_MINUTE);
assert(prepared.dayStats.dispatched > 0 && prepared.dayStats.completedRuns >= 5);
prepared = { ...prepared, paused: true };

try {
  for (const size of (process.env.PLAYTEST_VIEWPORTS ?? "390x844,844x390,820x1180,375x667").split(",")) {
    const [width, height] = size.split("x").map(Number);
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true });
    page.setDefaultTimeout(90000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => {
      if (!localStorage.getItem("last-chair-m3-slot-1")) localStorage.setItem("last-chair-m3-slot-1", value);
    }, JSON.stringify({ version: SAVE_VERSION, state: toPersisted(prepared) }));
    await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
    await enterGame(page);
    const press = label => page.getByRole("button", { name: label, exact: true }).tap();
    const tip = page.getByRole("complementary", { name: "Tip", exact: true });
    await tip.getByText("Tap the speed button to hurry the day along.").waitFor();
    assert.equal(await tip.count(), 1);
    await page.getByRole("button", { name: /Game speed/ }).waitFor();
    await press("Dismiss tip");
    await tip.waitFor({ state: "hidden" });

    await press("Build");
    await tip.getByText("The dashed lease line marks where you can build. Past it, it’s somebody else’s woods.").waitFor();
    await press("Dismiss tip");
    await press("Review Tier 2 upgrade");
    await press("Start lodge upgrade");
    await page.getByText(/Tier 2 is going up/).waitFor();
    await press("Close build sheet");
    await page.reload({ waitUntil: "domcontentloaded" });
    await enterGame(page);
    await tip.waitFor({ state: "hidden" });

    await press("Layers");
    const daytimeLayers = page.getByRole("group", { name: "Map layers" });
    await daytimeLayers.getByRole("button", { name: "Snow depth", exact: true }).tap();
    await press("Close hill");
    await page.getByRole("heading", { name: "Closing recap" }).waitFor();
    await page.locator('section[data-state="open"]').waitFor();
    const guide = page.getByRole("complementary", { name: "First problem guide" });
    const mapButton = guide.getByRole("button", { name: /^Map · / });
    const layer = (await mapButton.innerText()).split(" · ")[1];
    const officeButton = guide.getByRole("button", { name: /^Office · / });
    const tab = (await officeButton.innerText()).split(" · ")[1];
    const readWinter = () => page.evaluate(() => JSON.parse(localStorage.getItem("last-chair-m3-slot-1")).state);
    const beforeInspection = await readWinter();
    await mapButton.tap();
    const view = page.getByRole("region", { name: "Inspect nightly map" });
    const strip = view.getByRole("group", { name: "Map layers" });
    const selected = strip.getByRole("button", { name: layer, exact: true });
    assert.equal(await selected.getAttribute("aria-pressed"), "true");
    await selected.tap();
    assert.equal(await selected.getAttribute("aria-pressed"), "true");
    await strip.getByRole("button", { name: "Snow depth", exact: true }).tap();
    await view.getByLabel("Snow depth legend").waitFor();
    await press("Back to recap");
    await officeButton.tap();
    assert.equal(await page.locator('[data-office-tab="' + tab + '"]').getAttribute("aria-selected"), "true");
    await press("Close Office");
    assert.deepEqual(await readWinter(), beforeInspection, "Map and Office inspections preserve the closed day");

    await press("Dismiss advice");
    await tip.getByText(/The night recap tells you/).waitFor();
    await press("Dismiss tip");
    await tip.getByText(/The Guests want line/).waitFor();
    await press("Skip tips");
    await tip.waitFor({ state: "hidden" });
    await resolveRadio(page);
    await press("Sleep until morning");
    await page.getByRole("button", { name: /Game speed/ }).waitFor();
    assert.equal(await daytimeLayers.getByRole("button", { name: "Snow depth", exact: true }).getAttribute("aria-pressed"), "true");
    await page.reload({ waitUntil: "domcontentloaded" });
    await enterGame(page);
    await tip.waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    console.log(engine, size, "one saved coach, recap map and Office inspection passed");
    await page.close();
  }
} finally {
  await browser.close();
}
