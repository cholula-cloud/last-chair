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
    const press = label => page.getByRole("button", { name: label, exact: true }).tap({ force: true });
    const next = () => page.getByRole("button", { name: "Next", exact: true }).tap();
    const target = key => page.locator('[data-coach="' + key + '"]');
    await page.getByText("Give families a lift up and a trail back to the lodge.", { exact: false }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Game speed/ }).count(), 0);
    for (const anchor of ["opening", "ops-queue", "ops-mood", "guests", "build", "close"]) {
      assert.equal(await target(anchor).count(), 1, anchor);
    }
    await press("Resume day");
    // Stop game time while inspecting the measured afternoon so each anchor can be exercised.
    await press("Pause day");
    for (const anchor of ["ops-queue", "ops-mood", "guests", "build"]) {
      await page.locator('[data-coach="' + anchor + '"].coach-target').waitFor();
      const card = await page.locator(".coach-card").boundingBox();
      const control = await target(anchor).boundingBox();
      assert(card && control && card.y + card.height <= control.y, "Tip overlaps " + anchor);
      if (anchor === "build") {
        await press("Build");
        await page.getByRole("complementary", { name: "Lodge upgrade tip" }).waitFor();
        await press("Review Tier 2 upgrade");
        await page.getByText("Check the deposit and both night payments below before committing.", { exact: false }).waitFor();
        await press("Start lodge upgrade");
        await page.getByText(/Tier 2 under construction/).waitFor();
        await press("Close build sheet");
      } else await next();
    }
    await page.locator('[data-coach="close"].coach-target').waitFor();
    await press("Close hill");
    await page.getByRole("heading", { name: "Closing recap" }).waitFor();
    await page.locator('section[data-state="open"]').waitFor();
    for (const anchor of ["recap-problem", "fare", "snow", "sleep"]) {
      const element = target(anchor);
      await element.scrollIntoViewIfNeeded();
      assert.equal(await element.count(), 1, anchor);
      await page.locator('[data-coach="' + anchor + '"].coach-target').waitFor();
      if (anchor === "recap-problem") {
        await page.getByRole("button", { name: /^Why .*happy/ }).tap();
        const guide = page.getByRole("complementary", { name: "First problem guide" });
        const mapButton = guide.getByRole("button", { name: /^Map · / });
        const layer = (await mapButton.innerText()).split(" · ")[1];
        const officeButton = guide.getByRole("button", { name: /^Office · / });
        const tab = (await officeButton.innerText()).split(" · ")[1];
        await mapButton.tap();
        const view = page.getByRole("region", { name: "Inspect nightly map" });
        assert.equal(await view.getByRole("button", { name: layer, exact: true }).getAttribute("aria-pressed"), "true");
        await press("Back to recap");
        await officeButton.tap();
        assert.equal(await page.locator('[data-office-tab="' + tab + '"]').getAttribute("aria-pressed"), "true");
        await press("Close Office");
        await guide.getByRole("button", { name: "Dismiss advice" }).tap();
      }
      if (anchor === "fare" || anchor === "snow") {
        await element.getByRole("button").first().tap();
      }
    }
    await resolveRadio(page);
    await press("Sleep until morning");
    await page.getByRole("button", { name: /Game speed/ }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Skip tips" }).count(), 0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await enterGame(page);
    assert.equal(await page.getByRole("button", { name: "Skip tips" }).count(), 0);
    assert.deepEqual(errors, []);
    console.log(engine, size, "coach reaches Sleep and stays finished after reload");
    await page.close();
  }
} finally {
  await browser.close();
}
