/**
 * Brief M2 regression playthrough on a phone viewport. Measures the scripted
 * opening separately from the three-minute first-time player criterion.
 * Run with PLAY_URL pointing at a built or locally served game. Chromium can
 * use a system browser via CHROMIUM_EXECUTABLE; PLAYTEST_ENGINES defaults to both.
 * PLAYTEST_SCENARIO may select opening or upgrade for a targeted rerun.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { registerHooks } from "node:module";
import path from "node:path";
import { chromium, webkit } from "playwright";

// Load the game's exact terrain/rules for coordinates and the prepared save.
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.includes("/src/game/") && specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    return next(url, url.includes("/src/game/") && url.endsWith(".ts")
      ? { ...context, format: "module-typescript" }
      : context);
  },
});
const [{ TERRAIN }, { createInitialState, SAVE_KEY, SAVE_VERSION, toPersisted }, { pickFounder }] =
  await Promise.all([import("../src/game/terrain.ts"), import("../src/game/state.ts"), import("../src/game/rules.ts")]);

const browserTypes = { chromium, webkit };
const engines = (process.env.PLAYTEST_ENGINES ?? "chromium,webkit").split(",");
const scenario = process.env.PLAYTEST_SCENARIO ?? "all";
assert(["all", "opening", "upgrade"].includes(scenario), "Unknown playtest scenario: " + scenario);
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const output = path.join(process.env.PLAYTEST_OUT ?? "playtest-artifacts", "m2");
const viewport = { width: 390, height: 844 };
const button = (page, name) => page.getByRole("button", { name, exact: typeof name === "string" });
await fs.mkdir(output, { recursive: true });

const BUTTON_TIMEOUT = 18000;
const mouseOnly = process.env.PLAYTEST_INPUT === "mouse";
const press = (locator) => mouseOnly
  ? locator.click({ timeout: BUTTON_TIMEOUT })
  : locator.tap({ timeout: BUTTON_TIMEOUT });
const click = (page, name) => press(button(page, name));
const save = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), SAVE_KEY);
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

async function openPlay(page) {
  await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
  await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 45000 });
}

async function buildMenu(page) {
  const opener = button(page, "Build");
  if (!(await page.locator("[data-build-sheet]").isVisible())) await opener.click();
}

async function project(page, locations) {
  const element = page.locator("canvas").first();
  return element.evaluate((canvas, points) => {
    // Read R3F's live camera from its Canvas rootState ref. No debug state is
    // exposed in the game. Points are projected only; pointer input is real.
    const handle = Object.keys(canvas).find((name) => name.startsWith("__reactFiber$"));
    let camera;
    for (let fiber = handle && canvas[handle]; fiber && !camera; fiber = fiber.return) {
      if (fiber.stateNode instanceof Element) continue;
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        const state = hook.memoizedState?.current;
        if (state?.gl?.domElement === canvas) {
          camera = state.camera;
          break;
        }
      }
    }
    if (!camera) throw new Error("Could not read the live mountain camera");
    const box = canvas.getBoundingClientRect();
    return points.map(([x, y, z]) => {
      const point = camera.position.clone().set(x, y, z).project(camera);
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
  for (const p of points) {
    assert(p.x >= 0 && p.x < viewport.width && p.y >= 0 && p.y < viewport.height,
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

async function paintTrail(page, cdp, top) {
  await buildMenu(page);
  await click(page, /Paint a trail/i);
  await page.locator('[data-placement-kind="trail"]').waitFor();
  await drag(page, cdp, [
    world(top.x, top.z), world(top.x - 1.6, top.z + 2.5),
    world(top.x - 2, top.z + 6), world(-3, 11), world(TERRAIN.base.x, TERRAIN.base.z),
  ]);
  await confirmDraft(page, "trail", /^Cut trail/);
}

async function opening(page, cdp, engine) {
  await openPlay(page);
  await click(page, /Elena Vargas/);
  await page.getByText(/Day 1\/\d+/).waitFor();
  const started = Date.now();
  const initial = (await save(page)).state;
  await buildMenu(page);
  await click(page, "Place lift");
  await page.locator('[data-placement-kind="lift"]').waitFor();
  await drag(page, cdp, [world(9, -0.2), world(10, -0.5)]);
  await confirmDraft(page, "lift", /^Place for /);
  const withLift = (await save(page)).state;
  assert.equal(withLift.lifts.length, initial.lifts.length + 1, "The lift needs to be saved");
  assert(withLift.cash < initial.cash, "The lift needs to be paid for");

  const top = initial.lifts[0].anchor;
  await paintTrail(page, cdp, top);
  const built = (await save(page)).state;
  assert.equal(built.trails.length, withLift.trails.length + 1, "The painted trail needs to be saved");
  assert(built.cash < withLift.cash, "The trail needs to be paid for");
  const scriptedSeconds = Math.round((Date.now() - started) / 100) / 10;
  assert(scriptedSeconds < 180, "The scripted opening exceeded three minutes");
  await screenshot(page, engine, "opening");
  return scriptedSeconds;
}

async function closeHill(page) {
  await click(page, "Close hill");
  await page.getByRole("heading", { name: "Closing recap" }).waitFor({ timeout: 15000 });
  const state = (await save(page)).state;
  assert.equal(state.phase, "night");
  return state;
}

async function sleep(page) {
  const acknowledge = button(page, "Got it");
  if (await acknowledge.isVisible()) await press(acknowledge);
  await click(page, "Sleep until morning");
  assert.equal((await save(page)).state.phase, "day");
}

async function upgrade(page, cdp, engine) {
  const prepared = { ...pickFounder(createInitialState(42), "elena"), cash: 25000 };
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

  await closeHill(page);
  await sleep(page);
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
  await drag(page, cdp, [world(11.5, 15.5)]);
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
    if (scenario !== "upgrade") {
      const { context, cdp } = await newContext();
      step = "fresh opening";
      artifacts.scriptedSeconds = await opening(page, cdp, engine);
      console.error(engine + " fresh opening completed in " + artifacts.scriptedSeconds + " seconds");
      await context.close();
      page = undefined;
    }
    if (scenario !== "opening") {
      const { cdp } = await newContext();
      step = "prepared lodge upgrade";
      Object.assign(artifacts, await upgrade(page, cdp, engine));
      console.error(engine + " Tier 2 rentals earned $" + artifacts.venueRevenue);
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

const results = [];
for (const engine of engines) {
  assert(Object.hasOwn(browserTypes, engine), "Unknown engine: " + engine);
  results.push(await play(engine));
}
const summary = { viewport, scenario, firstTimePlayerVerified: false, results };
await fs.writeFile(path.join(output, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;
