import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { enterGame, project } from "./playtest-m2.mjs";
const { createBuiltHill } =
  await import("../src/game/__fixtures__/built-hill.ts");
const { pickFounder } = await import("../src/game/rules.ts");
const { SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");
const { trailSegmentMidpoints } = await import("../src/game/guns.ts");
const { TERRAIN } = await import("../src/game/terrain.ts");
const state = pickFounder(createBuiltHill(32), "elena");
const engine = process.env.PLAYTEST_ENGINE ?? "chromium";
const browser = await { chromium, webkit }[engine].launch({
  executablePath:
    engine === "chromium" ? process.env.CHROMIUM_EXECUTABLE : undefined,
  args: engine === "chromium" ? ["--enable-unsafe-swiftshader"] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE.WebGLProgram|Shader Error|VALIDATE_STATUS/.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.addInitScript(
    (save) => {
      localStorage.setItem("last-chair-m3-slot-1", save);
      localStorage.setItem(
        "last-chair-settings",
        JSON.stringify({ state: { tips: false }, version: 1 }),
      );
    },
    JSON.stringify({ version: SAVE_VERSION, state: toPersisted(state) }),
  );
  await page.goto((process.env.PLAY_URL ?? "http://127.0.0.1:3000") + "/play/");
  await enterGame(page);
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("last-chair-m3-slot-1")).state);
  const before = await save();
  const button = (name) => page.getByRole("button", { name, exact: true });
  await button("Layers").tap();
  const panel = page.getByRole("region", { name: "Map layers" });
  const strip = page.getByRole("group",{name:"Map layers"});
  await strip.getByRole("button",{name:"Slope"}).tap();
  await page.getByLabel("Slope legend").waitFor();
  const bounds = await strip.boundingBox();
  assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391);
  for (const layer of ["Snow depth", "Snow-making", "Conditions"]) {
    await button(layer).tap();
    await panel.getByLabel(layer + " legend").waitFor();
    if (layer === "Snow-making") {
      await panel.getByRole("button", { name: "Mid", exact: true }).tap();
      await panel.getByText(/Groomer only/).waitFor();
      await panel.getByRole("button", { name: "High", exact: true }).tap();
      await panel
        .getByRole("button", { name: "Last night", exact: true })
        .tap();
    }
  }
  const points = trailSegmentMidpoints(state.trails[0]).map((p) => [
    p.x,
    TERRAIN.height(p.x, p.z),
    p.z,
  ]);
  const projected = await project(page, points);
  const target = await page.evaluate(
    (points) =>
      points.find(
        (p) => document.elementFromPoint(p.x, p.y)?.tagName === "CANVAS",
      ),
    projected,
  );
  assert(target, "A trail segment must be reachable beside the legend");
  await page.touchscreen.tap(target.x, target.y);
  await panel
    .getByRole("status")
    .getByText(/segment \d of 6/)
    .waitFor();
  await panel.getByText(/First-timer:/).waitFor();
  await button("Close").tap();
  await button("Tomorrow").tap();
  await button("High").tap();
  await panel.getByText(/Forecast chances/).waitFor();
  await button("Yesterday’s wear").tap();
  await panel.getByText(/No run count for yesterday/).waitFor();
  await strip.getByRole("button",{name:"Off"}).tap();
  await panel.waitFor({ state: "hidden" });
  assert.deepEqual(await save(), before, "Reading layers must preserve the saved hill");
  assert.deepEqual(errors, []);
  console.log(
    "Four layers, segment inspection, weather-weighted scrub, wear and close passed at 390×844.",
  );
} finally {
  await browser.close();
}
