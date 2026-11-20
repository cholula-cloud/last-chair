/**
 * Brief M2 regression playthrough on a phone viewport. Measures the scripted
 * opening separately from the three-minute first-time player criterion.
 * Run with PLAY_URL pointing at a built or locally served game. Chromium can
 * use a system browser via CHROMIUM_EXECUTABLE; PLAYTEST_ENGINES defaults to both.
 * PLAYTEST_SCENARIO may select opening or upgrade for a targeted rerun.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import "./register-game.mjs";
import path from "node:path";
import { chromium, webkit } from "playwright";

const [{ TERRAIN }, { createInitialState, SAVE_KEY, SAVE_VERSION, toPersisted },
  { checkPaint, commitPaint, pickFounder, placeLift, trailOptions }, { REFERENCE_TOPS }, { STANDARD_BRUSH_WIDTH }] =
  await Promise.all([import("../src/game/terrain.ts"), import("../src/game/state.ts"), import("../src/game/rules.ts"),
    import("../src/game/descent.ts"), import("../src/game/paintedTrail.ts")]);

const browserTypes = { chromium, webkit };
const engines = (process.env.PLAYTEST_ENGINES ?? "chromium,webkit").split(",");
const scenario = process.env.PLAYTEST_SCENARIO ?? "all";
assert(["all", "opening", "upgrade", "weather"].includes(scenario), "Unknown playtest scenario: " + scenario);
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const output = path.join(process.env.PLAYTEST_OUT ?? "playtest-artifacts", "m2");
const viewport = { width: 390, height: 844 };
const button = (page, name) => page.getByRole("button", { name, exact: typeof name === "string" });

const BUTTON_TIMEOUT = 18000;
const mouseOnly = process.env.PLAYTEST_INPUT === "mouse";
const press = (locator) => mouseOnly
  ? locator.click({ timeout: BUTTON_TIMEOUT })
  : locator.tap({ timeout: BUTTON_TIMEOUT });
const click = (page, name) => press(button(page, name));
// A save written under the old single key moves into slot 1 on load.
const save = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), "last-chair-m3-slot-1");
const screenshot = (page, engine, name) => page.screenshot({ path: path.join(output, engine + "-" + name + ".png"), timeout: 12000 });

const world = (x, z) => [x, TERRAIN.height(x, z), z];

async function withDeadline(promise, label, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + " timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function confirmDraft(page, kind, action) {
  const draft = page.locator('[data-placement-kind="' + kind + '"]');
  try {
    await press(draft.getByRole("button", { name: "Review", exact: true }));
    await press(draft.getByRole("button", { name: action }));
  } catch (error) {
    const status = await draft.innerText({ timeout: 1000 }).catch(() => "Draft disappeared");
    throw new Error(kind + " confirmation failed: " + status, { cause: error });
  }
}

/** /play opens on the title screen; Continue resumes the active slot, otherwise start a new winter. */
export async function enterGame(page) {
  const continueButton = button(page, /^Continue/);
  const newWinter = button(page, "New winter");
  await newWinter.waitFor({ timeout: 20000 });
  const resuming = (await continueButton.count()) > 0;
  await press(resuming ? continueButton : newWinter);
  // New winter opens the cold open first; Continue never does.
  if (!resuming) await click(page, "Skip");
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 45000 });
}

async function openPlay(page) {
  await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
  await enterGame(page);
}

async function buildMenu(page) {
  const opener = button(page, "Build");
  if (!(await page.locator("[data-build-sheet]").isVisible())) await opener.click();
}

export async function project(page, locations) {
  const element = page.locator("canvas").first();
  return element.evaluate((canvas, points) => {
    // Read R3F's live camera from its Canvas rootState ref. No debug state is
    // exposed in the game. Points are projected only; pointer input is real.
    const handle = Object.keys(canvas).find((name) => name.startsWith("__reactFiber$"));
    let root;
    for (let fiber = handle && canvas[handle]; fiber && !root; fiber = fiber.return) {
      if (fiber.stateNode instanceof Element) continue;
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        const state = hook.memoizedState?.current;
        if (state?.gl?.domElement === canvas) {
          root = state;
          break;
        }
      }
    }
    if (!root) throw new Error("Could not read the live mountain camera");
    const { camera, scene } = root;
    const box = canvas.getBoundingClientRect();
    return points.map(location => {
      const point = camera.position.clone();
      if (location === "trail-continuation") {
        const ring = scene.getObjectByName(location);
        if (!ring) throw new Error("The trail continuation ring is not visible");
        ring.geometry.computeBoundingBox();
        ring.geometry.boundingBox.getCenter(point);
        ring.localToWorld(point);
      } else {
        point.set(...location);
      }
      point.project(camera);
      return {
        x: box.left + (1 + point.x) * box.width / 2,
        y: box.top + (1 - point.y) * box.height / 2,
      };
    });
  }, locations);
}

async function waitForFraming(page, points) {
  let previous;
  for (let i = 0; i < 45; i++) {
    await withDeadline(page.evaluate(() => new Promise(requestAnimationFrame)), "Animation frame", 5000);
    const current = await project(page, points).catch(() => null);
    if (current && previous && current.every((p, j) => Math.hypot(p.x - previous[j].x, p.y - previous[j].y) < 0.15)) {
      return current;
    }
    previous = current;
  }
  throw new Error("Mountain camera did not settle over the build area");
}

async function drag(page, cdp, locations) {
  const points = await withDeadline(waitForFraming(page, locations), "Terrain projection", 15000);
  const bounds = page.viewportSize();
  for (const p of points) {
    assert(p.x >= 0 && p.x < bounds.width && p.y >= 0 && p.y < bounds.height,
      "Planned build point is outside the viewport: " + JSON.stringify(p));
  }
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, points[0]);
  assert.equal(hit, "CANVAS", "The build point is obscured by the HUD");
  const samples = [points[0]];
  for (let i = 1; i < points.length; i++) {
    for (let step = 1; step <= 4; step++) {
      samples.push({
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * step / 4,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * step / 4,
      });
    }
  }
  if (cdp) {
    const send = (type, touchPoints) => withDeadline(
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints }), type, 12000,
    );
    await send("touchStart", [samples[0]]);
    for (const p of samples.slice(1)) {
      await send("touchMove", [p]);
    }
    await send("touchEnd", []);
  } else if (samples.length === 1 && !mouseOnly) {
    await page.touchscreen.tap(samples[0].x, samples[0].y);
  } else {
    // WebKit's Playwright API supports touch taps but cannot dispatch a touch drag.
    await withDeadline((async () => {
      await page.mouse.move(samples[0].x, samples[0].y);
      await page.mouse.down();
      for (const p of samples.slice(1)) await page.mouse.move(p.x, p.y);
      await page.mouse.up();
    })(), "Mouse drag", 15000);
  }
}

async function moveDraftMap(page, cdp, anchor, resumeLabel) {
  await click(page, "Move map");
  const [before] = await waitForFraming(page, [anchor]);
  // Short screens can put the paint tools over the middle of the viewport.
  const center = await page.evaluate(() => {
    for (const y of [0.43, 0.32, 0.52, 0.23, 0.62]) {
      for (const x of [0.5, 0.3, 0.7, 0.15]) {
        const point = { x: innerWidth * x, y: innerHeight * y };
        if ([0, 16, 32].every(dx => document.elementFromPoint(point.x + dx, point.y)?.tagName === "CANVAS")) return point;
      }
    }
    return null;
  });
  assert(center, "Move map needs an exposed canvas area for the drag");
  if (cdp) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [center] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...center, x: center.x + 32 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 32, center.y, { steps: 4 });
    await page.mouse.up();
  }
  const [after] = await waitForFraming(page, [anchor]);
  assert(Math.hypot(after.x - before.x, after.y - before.y) > 3, "Move map should pan the saved draft");
  await click(page, resumeLabel);
}

async function paintTrail(page, cdp, top, resume = false) {
  await buildMenu(page);
  await click(page, /Paint a trail/i);
  await page.locator('[data-placement-kind="trail"]').waitFor();
  const locations = [
    world(top.x, top.z), world(top.x - 1.6, top.z + 2.5),
    world(top.x - 2, top.z + 6), world(-3, 11), world(TERRAIN.base.x, TERRAIN.base.z),
  ];
  if (resume) {
    assert(await page.locator('[data-overlay-legend="slope"]').isVisible(), "The slope legend shows while painting");
    await drag(page, cdp, locations.slice(0, 3));
    await moveDraftMap(page, cdp, locations[2], "Paint");
    // Edge pan can move the terrain under a held finger before release. Resume
    // at the rendered endpoint a player sees after panning, not the planned one.
    await drag(page, cdp, ["trail-continuation", ...locations.slice(3)]);
    await click(page, "Undo");
    await click(page, "Redo");
  } else {
    await drag(page, cdp, locations);
  }
  await confirmDraft(page, "trail", /^Cut trail/);
}

export async function buildOpening(page, cdp) {
  const started = Date.now();
  const initial = (await save(page)).state;
  assert.equal(initial.lodgeTier, 1);
  for (const kind of ["lifts", "trails", "assets", "guns"]) assert.equal(initial[kind].length, 0);
  assert(await button(page, "Resume day").isDisabled());
  await buildMenu(page);
  await click(page, "Place lift");
  await page.locator('[data-placement-kind="lift"]').waitFor();
  const ridge = world(REFERENCE_TOPS[0].x, REFERENCE_TOPS[0].z);
  await drag(page, cdp, [ridge]);
  await moveDraftMap(page, cdp, ridge, "Place lift");
  await confirmDraft(page, "lift", /^Place for /);
  const withLift = (await save(page)).state;
  assert.equal(withLift.lifts.length, initial.lifts.length + 1, "The lift needs to be saved");
  assert(withLift.cash < initial.cash, "The lift needs to be paid for");
  assert.equal(withLift.trails.length, 0, "The game must not generate a free trail");
  assert(await button(page, "Resume day").isDisabled());
  await page.reload({ waitUntil: "domcontentloaded" });
  await enterGame(page);
  assert.deepEqual((await save(page)).state.lifts, withLift.lifts, "Reloading must keep the new lift");

  const top = withLift.lifts[0].anchor;
  await paintTrail(page, cdp, top, true);
  const built = (await save(page)).state;
  assert.equal(built.trails.length, withLift.trails.length + 1, "The painted trail needs to be saved");
  assert(built.cash < withLift.cash, "The trail needs to be paid for");
  assert(await button(page, "Resume day").isEnabled());
  assert.equal(await page.getByText("Downhill slope", { exact: true }).count(), 0, "Hide the grid after cutting");
  return Math.round((Date.now() - started) / 100) / 10;
}

async function opening(page, cdp, engine) {
  await openPlay(page);
  await click(page, /Elena Vargas/);
  await page.getByText(/Day 1\/\d+/).waitFor();
  const scriptedSeconds = await buildOpening(page, cdp);
  await screenshot(page, engine, "opening");
  return scriptedSeconds;
}

async function closeHill(page) {
  await click(page, "Close hill");
  await page.getByRole("heading", { name: "Closing recap" }).waitFor({ timeout: 15000 });
  const state = (await save(page)).state;
  assert.equal(state.phase, "night");
  if (state.dayIndex < state.seasonLength) {
    const forecast = page.getByRole("group", { name: "Tomorrow’s forecast" });
    await forecast.waitFor();
    const odds = await forecast.getByRole("listitem").allTextContents();
    const sum = odds.reduce((total, item) => total + Number(item.match(/(\d+)%/)?.[1]), 0);
    assert(odds.length === 4 && Math.abs(sum - 100) <= 2, "Forecast odds should add up to 100% after rounding");
  }
  return state;
}

export async function resolveRadio(page) {
  for (const label of ["Stay independent", "Decline", "Got it"]) {
    const choice = button(page, label);
    if (await choice.isVisible()) {
      await press(choice);
      return;
    }
  }
}

async function sleep(page) {
  await resolveRadio(page);
  await click(page, "Sleep until morning");
  assert.equal((await save(page)).state.phase, "day");
}

async function upgrade(page, cdp, engine) {
  const withLift = placeLift({ ...pickFounder(createInitialState(42), "elena"), cash: 25000 }, {
    type: "surface", bottom: TERRAIN.base, top: REFERENCE_TOPS[0],
  });
  const strokes = trailOptions(withLift, 0).map((option) => [{ points: option.path, widthFt: STANDARD_BRUSH_WIDTH }]);
  const valid = strokes.find((draft) => checkPaint(withLift, draft).reason === null);
  assert.ok(valid, "A painted route is needed for the lodge scenario");
  const prepared = commitPaint(withLift, valid);
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: SAVE_KEY,
    value: JSON.stringify({ state: toPersisted(prepared), version: SAVE_VERSION }),
  });
  await openPlay(page);
  await buildMenu(page);
  const rentals = button(page, /^Rentals\b/i);
  assert(await rentals.isDisabled(), "Rentals should require the Tier 2 lodge");
  await click(page, "Review Tier 2 upgrade");
  await click(page, "Start lodge upgrade");
  let state = (await save(page)).state;
  assert.equal(state.lodgeTier, 1);
  assert.equal(state.lodgeUpgrade?.toTier, 2);
  assert.equal(state.lodgeUpgrade?.nightsRemaining, 2);
  await click(page, "Close build sheet");
  await click(page, "Game speed 1x, tap to change");
  await click(page, "Game speed 2x, tap to change");

  await closeHill(page);
  await sleep(page);
  assert(await button(page, "Game speed 4x, tap to change").isVisible(), "Morning should keep the selected speed");
  state = (await save(page)).state;
  assert.equal(state.lodgeTier, 1);
  assert.equal(state.lodgeUpgrade?.nightsRemaining, 1);
  await closeHill(page);
  await sleep(page);
  state = (await save(page)).state;
  assert.equal(state.lodgeTier, 2);
  assert.equal(state.lodgeUpgrade, null);

  await buildMenu(page);
  assert(await rentals.isEnabled(), "Tier 2 should unlock Rentals");
  await press(rentals);
  await page.locator('[data-placement-kind="asset"]').waitFor();
  const rentalSite = world(11.5, 15.5);
  await drag(page, cdp, [rentalSite]);
  await moveDraftMap(page, cdp, rentalSite, "Place");
  await confirmDraft(page, "asset", "Build here");
  state = (await save(page)).state;
  assert(state.assets.some((asset) => asset.id === "rentals"), "Tier 2 rentals need to be placed");
  const venueDay = await closeHill(page);
  const venueRevenue = venueDay.dayStats.venueRevenue.rentals;
  assert(venueRevenue > 0, "The placed rentals should earn revenue from guests");
  await page.getByRole("list", { name: "Venue takings" }).getByText(/Rentals took/).waitFor();
  await screenshot(page, engine, "recap-rentals");
  await sleep(page);
  await paintTrail(page, cdp, state.lifts[0].anchor);
  const changedDay = await closeHill(page);
  assert.equal(changedDay.dayIndex, venueDay.dayIndex + 1);
  assert.equal(changedDay.trails.length, venueDay.trails.length + 1);
  await screenshot(page, engine, "recap-changed-hill");
  const recap = (day) => ({
    waitMinutes: day.nightRecap.facts.avgWaitMin,
    satisfaction: day.nightRecap.satisfaction,
  });
  return {
    tier: venueDay.lodgeTier,
    venueRevenue,
    recaps: { before: recap(venueDay), after: recap(changedDay) },
  };
}

async function gustyDay(page, engine) {
  const withLift = placeLift(pickFounder(createInitialState(42), "amira"), {
    type: "surface", bottom: TERRAIN.base, top: REFERENCE_TOPS[0],
  });
  const brushes = trailOptions(withLift, 0).map((option) => [{ points: option.path, widthFt: STANDARD_BRUSH_WIDTH }]);
  const brush = brushes.find((draft) => checkPaint(withLift, draft).reason === null);
  assert.ok(brush, "Chair fixture needs an open trail");
  const hill = commitPaint(withLift, brush);
  const state = {
    ...hill,
    lodgeTier: 2,
    clockMin: 630,
    weather: "storm",
    weatherDays: [{ kind: "storm", wind: "gusty" }, ...hill.weatherDays.slice(1)],
    lifts: hill.lifts.map((lift) => ({ ...lift, type: "chair" })),
  };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: SAVE_KEY, value: JSON.stringify({ state: toPersisted(state), version: SAVE_VERSION }),
  });
  await openPlay(page);
  await page.getByRole("status").filter({ hasText: "Wind’s holding the chair until 1 PM" }).waitFor();
  await screenshot(page, engine, "wind-hold");
  await closeHill(page);
  await page.getByRole("group", { name: "Two-day forecast" }).scrollIntoViewIfNeeded();
  await screenshot(page, engine, "forecast");
}

async function play(engine) {
  const artifacts = {};
  let browser;
  let page;
  let step = "launch";
  const pageErrors = [];
  try {
    const executablePath = engine === "chromium" ? process.env.CHROMIUM_EXECUTABLE : undefined;
    browser = await browserTypes[engine].launch({
      executablePath,
      headless: true,
      ...(engine === "chromium" ? { args: ["--enable-unsafe-swiftshader"] } : {}),
    });
    const nativeTouchDrag = engine === "chromium" && !mouseOnly;
    const newContext = async () => {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const cdp = nativeTouchDrag ? await context.newCDPSession(page) : null;
      return { context, cdp };
    };
    if (scenario === "all" || scenario === "opening") {
      const { context, cdp } = await newContext();
      step = "fresh opening";
      artifacts.scriptedSeconds = await opening(page, cdp, engine);
      assert(artifacts.scriptedSeconds < 180, "The scripted opening exceeded three minutes");
      console.error(engine + " fresh opening completed in " + artifacts.scriptedSeconds + " seconds");
      await context.close();
      page = undefined;
    }
    if (scenario === "all" || scenario === "upgrade") {
      const { context, cdp } = await newContext();
      step = "prepared lodge upgrade";
      Object.assign(artifacts, await upgrade(page, cdp, engine));
      console.error(engine + " Tier 2 rentals earned $" + artifacts.venueRevenue);
      await context.close();
      page = undefined;
    }
    if (scenario === "all" || scenario === "weather") {
      await newContext();
      step = "chair wind hold and forecast";
      await gustyDay(page, engine);
    }
    assert.deepEqual(pageErrors, []);
    return { engine, ok: true, input: nativeTouchDrag ? "touch" : mouseOnly ? "mouse" : "mouse drag and touch tap", ...artifacts };
  } catch (error) {
    await (page && screenshot(page, engine, "failure").catch(() => {}));
    return { engine, ok: false, step, error: error.message, pageErrors, ...artifacts };
  } finally {
    await browser?.close();
  }
}

if (import.meta.main) {
  await fs.mkdir(output, { recursive: true });
  const results = [];
  for (const engine of engines) {
    assert(Object.hasOwn(browserTypes, engine), "Unknown engine: " + engine);
    results.push(await play(engine));
  }
  const summary = { viewport, scenario, firstTimePlayerVerified: false, results };
  await fs.writeFile(path.join(output, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}
