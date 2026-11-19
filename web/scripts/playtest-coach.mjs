// Exercise the first-winter coach on the same prepared operating hill at each screen size.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { enterGame, resolveRadio } from "./playtest-m2.mjs";
const { createInitialState, SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");
const { checkPaint, commitPaint, pickFounder, placeLift, trailOptions } = await import("../src/game/rules.ts");
const { REFERENCE_TOPS } = await import("../src/game/descent.ts");
const { TERRAIN } = await import("../src/game/terrain.ts");
const { STANDARD_BRUSH_WIDTH } = await import("../src/game/paintedTrail.ts");

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
const prepared = commitPaint(hill, strokes);

try {
  for (const size of (process.env.PLAYTEST_VIEWPORTS ?? "390x844,844x390,820x1180,375x667").split(",")) {
    const [width, height] = size.split("x").map(Number);
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: true, isMobile: true });
    page.setDefaultTimeout(18000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => {
      if (!localStorage.getItem("last-chair-m3-slot-1")) localStorage.setItem("last-chair-m3-slot-1", value);
    }, JSON.stringify({ version: SAVE_VERSION, state: toPersisted(prepared) }));
    await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
    await enterGame(page);
    const press = label => page.getByRole("button", { name: label, exact: true }).tap();
    const next = () => press("Next");
    const target = key => page.locator('[data-coach="' + key + '"]');
    await page.getByText("Give families a lift up and a trail back to the lodge.", { exact: false }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Game speed/ }).count(), 0);
    for (const anchor of ["opening", "ops-queue", "ops-mood", "guests", "build", "close"]) {
      assert.equal(await target(anchor).count(), 1, anchor);
    }
    await press("Resume day");
    await press("Close hill");
    await page.getByRole("heading", { name: "Closing recap" }).waitFor();
    for (const anchor of ["recap-problem", "fare", "snow", "sleep"]) {
      const element = target(anchor);
      await element.scrollIntoViewIfNeeded();
      assert.equal(await element.count(), 1, anchor);
      await page.locator('[data-coach="' + anchor + '"].coach-target').waitFor();
      if (anchor === "recap-problem") await next();
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
