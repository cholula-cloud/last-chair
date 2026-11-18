/**
 * Phone viewport checks: screenshots, touch (Chromium CDP), fps and render stats.
 * Usage: PLAY_URL=http://127.0.0.1:3000 npm run phone-check
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, webkit } from "playwright";

const BASE = process.env.PLAY_URL ?? "http://127.0.0.1:3000";
const outRoot = path.join(
  process.env.PLAYTEST_OUT ?? path.join(process.cwd(), "playtest-artifacts"),
  "phone-check",
);
fs.mkdirSync(outRoot, { recursive: true });

const VIEWPORTS = [
  { w: 390, h: 844, dpr: 3, tag: "390x844" },
  { w: 844, h: 390, dpr: 3, tag: "844x390" },
  { w: 820, h: 1180, dpr: 2, tag: "820x1180" },
  { w: 375, h: 667, dpr: 2, tag: "375x667" },
];

const FAILURES = [];
const SHOTS = [];

function fail(msg) {
  FAILURES.push(msg);
  console.error(`FAIL: ${msg}`);
}

async function waitSceneReady(page) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 60_000 });
      return;
    } catch (e) {
      if (attempt === 1) throw e;
      await page.reload({ waitUntil: "domcontentloaded" });
    }
  }
}

async function startPlay(page) {
  await page.goto(`${BASE}/play?stats=1`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Dutch Hill/i }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /Elena Vargas/i }).click();
  await waitSceneReady(page);
  await page.getByText(/Day 1\/14/).waitFor({ timeout: 15_000 });
}

async function shot(page, engine, tag, name) {
  const file = `${engine}-${tag}-${name}.png`;
  const p = path.join(outRoot, file);
  await page.screenshot({ path: p });
  SHOTS.push(file);
}

/** Chromium CDP one-finger pan on the canvas. */
async function cdpPan(cdp, w, h, dx, dy) {
  const x0 = w / 2;
  const y0 = h * 0.55;
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    const type =
      i === 0 ? "touchStart" : i === steps ? "touchEnd" : "touchMove";
    await cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: [{ x, y }],
    });
  }
}

async function cdpPinch(cdp, w, h, spread) {
  const cx = w / 2;
  const cy = h * 0.55;
  const d = spread / 2;
  const pts = [
    { x: cx - d, y: cy },
    { x: cx + d, y: cy },
  ];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: cx - d * 0.5, y: cy },
      { x: cx + d * 0.5, y: cy },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function measureFps(page, ms = 5000) {
  return page.evaluate(async (duration) => {
    let frames = 0;
    const start = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        frames += 1;
        if (performance.now() - start >= duration) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return frames / (duration / 1000);
  }, ms);
}

/** Fail when the canvas is missing, tiny, or the center pixel is still ink-black (no hill). */
async function assertMountainVisible(page, engine, tag) {
  const check = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return { ok: false, reason: "no canvas" };
    const r = c.getBoundingClientRect();
    const min = Math.min(window.innerWidth, window.innerHeight) * 0.55;
    if (r.width < min || r.height < min) {
      return { ok: false, reason: `canvas ${r.width.toFixed(0)}x${r.height.toFixed(0)} vs min ${min.toFixed(0)}` };
    }
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return { ok: false, reason: "no webgl context" };
    gl.finish();
    const x = Math.floor(c.width / 2);
    const y = Math.floor(c.height / 2);
    const px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const lum = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
    const spread = [0, 1, -1].flatMap((dx) =>
      [0, 1, -1].map((dy) => {
        const s = new Uint8Array(4);
        gl.readPixels(x + dx * 40, y + dy * 40, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, s);
        return 0.299 * s[0] + 0.587 * s[1] + 0.114 * s[2];
      }),
    );
    const maxLum = Math.max(lum, ...spread);
    if (maxLum < 35) return { ok: false, reason: `center too dark (lum ${maxLum.toFixed(0)})` };
    return { ok: true, lum: maxLum };
  });
  if (!check.ok) fail(`${engine} ${tag}: mountain not visible — ${check.reason}`);
}

async function readRenderStats(page) {
  return page.evaluate(async () => {
    for (let i = 0; i < 30; i++) {
      if (window.__lcStats) return window.__lcStats;
      await new Promise((r) => setTimeout(r, 200));
    }
    return null;
  });
}

async function runViewport(engine, launch, vp) {
  const { w, h, dpr, tag } = vp;
  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: dpr,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const touchNote = { pan: "skipped", pinch: "skipped", doubleTap: "skipped" };
  let fps = null;
  let stats = null;

  try {
    await startPlay(page);
    await shot(page, engine, tag, "home");

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ timeout: 10_000 });
    await assertMountainVisible(page, engine, tag);

    if (engine === "chromium") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const pans = [
        { dx: -w * 0.2, dy: 0, name: "pan-left" },
        { dx: w * 0.2, dy: 0, name: "pan-right" },
        { dx: 0, dy: -h * 0.15, name: "pan-up" },
        { dx: 0, dy: h * 0.15, name: "pan-down" },
      ];
      for (const p of pans) {
        await cdpPan(cdp, w, h, p.dx, p.dy);
        await page.waitForTimeout(300);
        await shot(page, engine, tag, p.name);
      }
      touchNote.pan = "cdp";
      await cdpPinch(cdp, w, h, Math.min(w, h) * 0.25);
      await page.waitForTimeout(400);
      await shot(page, engine, tag, "zoom-in");
      touchNote.pinch = "cdp";
      await cdpPinch(cdp, w, h, Math.min(w, h) * 0.45);
      await page.waitForTimeout(400);
      await shot(page, engine, tag, "zoom-out");
      const box = await canvas.boundingBox();
      if (box) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
        });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(80);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
        });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        touchNote.doubleTap = "cdp";
      }
      fps = await measureFps(page);
      if (fps < 30) fail(`${engine} ${tag}: fps ${fps.toFixed(1)} < 30`);
      stats = await readRenderStats(page);
      if (!stats) fail(`${engine} ${tag}: no __lcStats`);
      else {
        if (stats.triangles > 200_000) fail(`${engine} ${tag}: triangles ${stats.triangles}`);
        if (stats.calls > 40) fail(`${engine} ${tag}: draw calls ${stats.calls}`);
      }
    } else {
      const box = await canvas.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        touchNote.doubleTap = "tap-only";
      }
      await shot(page, engine, tag, "webkit-tap");
    }

    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.getByRole("heading", { name: "Build" }).waitFor();
    await page.getByRole("button", { name: /Place on the hill/i }).click();
    await page.getByText(/Tap where the lift should unload/i).waitFor({ timeout: 5000 });
    await shot(page, engine, tag, "placement-bar");

    await page.getByLabel("Game speed 1x, tap to change").click();
    await page.getByLabel("Game speed 2x, tap to change").waitFor();
    await shot(page, engine, tag, "speed-2x");

    const fatal = errors.filter((e) => !/favicon|hydration|ResizeObserver/i.test(e));
    if (fatal.length) fail(`${engine} ${tag}: page errors\n${fatal.join("\n")}`);
  } catch (e) {
    fail(`${engine} ${tag}: ${e.message ?? e}`);
    await shot(page, engine, tag, "error").catch(() => {});
  } finally {
    await browser.close();
  }

  return { engine, tag, touchNote, fps, stats };
}

const results = [];
for (const vp of VIEWPORTS) {
  results.push(await runViewport("chromium", () => chromium.launch({ headless: true }), vp));
  results.push(await runViewport("webkit", () => webkit.launch({ headless: true }), vp));
}

const summary = {
  ok: FAILURES.length === 0,
  failures: FAILURES,
  results,
  screenshots: SHOTS,
};
fs.writeFileSync(path.join(outRoot, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

if (FAILURES.length) process.exit(1);