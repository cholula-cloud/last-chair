/**
 * Captures the four cold open stills from the live 3D scene into web/public/story/.
 * Usage: PLAY_URL=http://127.0.0.1:3010 node scripts/capture-story.mjs
 * Each still is a square frame so a phone (tall) and a desktop (wide) crop it with object-fit: cover.
 * The frame is graded on a 2D canvas, then written as webp under 150 KB.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const out = path.join(process.cwd(), "public", "story");
const SIZE = 1100;
const MAX_BYTES = 150 * 1024;
await fs.mkdir(out, { recursive: true });

/** Camera position and look-at target, in world units. Dutch Hill base is near x 4, z 18. */
const SHOTS = [
  {
    name: "card-1",
    from: [4, 1.8, 23],
    to: [-1, 3.6, 0],
    // Cold and flat: the lifts have stopped.
    grade: { filter: "saturate(0.45) brightness(0.9) contrast(1.05)", tint: "rgba(70,90,120,0.28)", dark: 0.35 },
  },
  {
    name: "card-2",
    from: [10.5, 1.4, 22.5],
    to: [5, 1.1, 15],
    // Dusk over the empty base, after the fire.
    grade: { filter: "saturate(0.7) brightness(0.62) contrast(1.15) sepia(0.3)", tint: "rgba(190,90,40,0.26)", dark: 0.5 },
  },
  {
    name: "card-3",
    from: [-12, 1.5, 22.5],
    to: [8, 1.3, 25],
    // Warm day on Route 100: the town is looking at its hill.
    grade: { filter: "saturate(1.05) brightness(1.02) sepia(0.12)", tint: "rgba(255,190,110,0.14)", dark: 0.2 },
  },
  {
    name: "card-4",
    from: [-3, 2.6, 8],
    to: [-2, 7.5, -10],
    // The forest taking the slope back, in morning light.
    grade: { filter: "saturate(0.9) brightness(0.92) contrast(1.05)", tint: "rgba(40,80,60,0.2)", dark: 0.35 },
  },
];

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--enable-unsafe-swiftshader"] }
    : {}),
});
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
await page.goto(`${base}/play`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "New winter", exact: true }).click({ timeout: 30_000 });
const skip = page.getByRole("button", { name: "Skip" });
if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
await page.getByRole("button", { name: /Elena Vargas/i }).click({ timeout: 30_000 });
await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 60_000 });
await page.waitForTimeout(2500);
// Only the canvas stays; the HUD and sheets are hidden for the capture.
await page.addStyleTag({ content: "[data-scene-ready] > :not(:first-child), nextjs-portal { display: none !important; }" });

async function aim(from, to) {
  await page.locator("canvas").first().evaluate((canvas, [f, t]) => {
    const handle = Object.keys(canvas).find((name) => name.startsWith("__reactFiber$"));
    let state;
    for (let fiber = handle && canvas[handle]; fiber && !state; fiber = fiber.return) {
      if (fiber.stateNode instanceof Element) continue;
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        const s = hook.memoizedState?.current;
        if (s?.gl?.domElement === canvas) { state = s; break; }
      }
    }
    if (!state) throw new Error("Could not read the live camera");
    const { camera, controls } = state;
    // Stop the game's own camera rig and draw the frame by hand.
    state.setFrameloop("never");
    if (controls) controls.enabled = false;
    camera.position.set(f[0], f[1], f[2]);
    camera.lookAt(t[0], t[1], t[2]);
    camera.updateMatrixWorld(true);
    return new Promise((resolve) => requestAnimationFrame(() => {
      state.gl.render(state.scene, camera);
      resolve(true);
    }));
  }, [from, to]);
}

const grader = await browser.newPage({ viewport: { width: 400, height: 400 } });

for (const shot of SHOTS) {
  await aim(shot.from, shot.to);
  await page.waitForTimeout(900);
  const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
  await fs.writeFile(path.join(process.env.PLAYTEST_OUT ?? "/tmp", `${shot.name}-raw.png`), png).catch(() => {});
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  const webp = await grader.evaluate(async ({ dataUrl: src, grade, size, maxBytes }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    ctx.filter = grade.filter;
    ctx.drawImage(img, 0, 0, size, size);
    ctx.filter = "none";
    ctx.fillStyle = grade.tint;
    ctx.fillRect(0, 0, size, size);
    const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.25, size / 2, size / 2, size * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(8,14,22,${grade.dark})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, size, size);
    for (let q = 0.8; q >= 0.3; q -= 0.05) {
      const blob = await new Promise((r) => c.toBlob(r, "image/webp", q));
      if (blob.size <= maxBytes || q <= 0.31) {
        const buf = new Uint8Array(await blob.arrayBuffer());
        let s = "";
        for (const b of buf) s += String.fromCharCode(b);
        return { b64: btoa(s), q, bytes: blob.size };
      }
    }
    return null;
  }, { dataUrl, grade: shot.grade, size: SIZE, maxBytes: MAX_BYTES });
  if (!webp || webp.bytes > MAX_BYTES) throw new Error(`${shot.name} is over ${MAX_BYTES} bytes`);
  await fs.writeFile(path.join(out, `${shot.name}.webp`), Buffer.from(webp.b64, "base64"));
  console.log(`${shot.name}.webp ${Math.round(webp.bytes / 1024)} KB at quality ${webp.q.toFixed(2)}`);
}
await browser.close();
