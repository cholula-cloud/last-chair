import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { enterGame, project } from "./playtest-m2.mjs";
import { dismissMorningNoteIfPresent } from "./playtest-dismiss-morning.mjs";
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
  await dismissMorningNoteIfPresent(page);
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("last-chair-m3-slot-1")).state);
  const before = await save();
  const button = (name) => page.getByRole("button", { name, exact: true });
  const tap = (name) => button(name).tap({ force: true });
  const dock = () => page.locator("[data-layer-dock]");
  const strip = () => dock().locator("[data-layer-strip]");
  const snowPanel = () => dock().getByRole("region", { name: "Map layers" });
  const layerPick = async (name) => {
    await page.locator(`[data-layer-strip] button`, { hasText: name }).evaluate((el) => {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(200);
  };

  await tap("Layers");
  await dock().waitFor({ state: "visible", timeout: 15_000 });
  await strip().waitFor({ state: "visible" });
  const slopeBtn = strip().getByRole("button", { name: "Slope" });
  await slopeBtn.waitFor();
  assert.equal(await slopeBtn.getAttribute("aria-pressed"), "true");
  await dock().locator('[data-overlay-legend="slope"]').waitFor();
  const bounds = await strip().boundingBox();
  assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391);

  const layers = [
    { strip: "Depth", legend: "Snow depth" },
    { strip: "Guns", legend: "Snow-making" },
    { strip: "Snow", legend: "Conditions" },
    { strip: "Crowds", legend: "Crowds" },
    { strip: "Cash", legend: "Revenue" },
    { strip: "Demand", legend: "Guests want" },
    { strip: "Trails", legend: "Trails" },
  ];
  for (const { strip: stripLabel, legend } of layers) {
    await layerPick(stripLabel);
    if (["Crowds", "Revenue", "Guests want", "Trails"].includes(legend)) {
      await page.getByLabel(`${legend} legend`).waitFor();
      continue;
    }
    await snowPanel().getByLabel(`${legend} legend`).waitFor();
    if (legend === "Snow-making") {
      await snowPanel().getByRole("button", { name: "Mid", exact: true }).tap();
      await snowPanel().getByText(/Groomer only/).waitFor();
      await snowPanel().getByRole("button", { name: "High", exact: true }).tap();
      await snowPanel()
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
  const status = snowPanel().getByRole("status");
  await status.getByText(/segment \d+ of \d+/).waitFor();
  await status.getByText(/First-timer:/).waitFor();

  await snowPanel().getByRole("button", { name: "Tomorrow" }).tap();
  await snowPanel().getByRole("button", { name: "High" }).tap();
  await snowPanel().getByText(/Forecast chances/).waitFor();
  await snowPanel().getByRole("button", { name: /Yesterday.*wear/i }).tap();
  await snowPanel().getByText(/No run count for yesterday/).waitFor();
  await layerPick("Off");
  await layerPick("Slope");
  await tap("Layers");
  await dock().waitFor({ state: "hidden" });
  assert.deepEqual(await save(), before, "Reading layers must preserve the saved hill");
  assert.deepEqual(errors, []);
  console.log(
    "Four layers, segment inspection, weather-weighted scrub, wear and close passed at 390×844.",
  );
} finally {
  await browser.close();
}