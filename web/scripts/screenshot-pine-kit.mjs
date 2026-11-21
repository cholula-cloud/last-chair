/**
 * Render pine-a..d (+ birch) kit GLBs to PNG for art review.
 * Usage: node scripts/screenshot-pine-kit.mjs
 * Output: /opt/cursor/artifacts/pine-kit/
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = process.env.PLAYTEST_OUT ?? "/opt/cursor/artifacts/pine-kit";
const names = ["pine-a", "pine-b", "pine-c", "pine-d", "birch"];
await fs.mkdir(outDir, { recursive: true });

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
html,body{margin:0;background:#c8d4e4;overflow:hidden}
canvas{display:block;width:100vw;height:100vh}
</style></head><body>
<script type="importmap">
{"imports":{
  "three":"/node_modules/three/build/three.module.js",
  "three/addons/":"/node_modules/three/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const params = new URLSearchParams(location.search);
const name = params.get("name") || "pine-a";
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8d4e4);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(700, 700);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb4c6f2, 0xd5d8c8, 1.2));
const sun = new THREE.DirectionalLight(0xfff0da, 2.2);
sun.position.set(4, 8, 3);
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(8, 48),
  new THREE.MeshLambertMaterial({ color: 0xf4f7fb }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const loader = new GLTFLoader();
const gltf = await loader.loadAsync("/models/" + name + ".glb");
const root = gltf.scene;
scene.add(root);
const box = new THREE.Box3().setFromObject(root);
const size = box.getSize(new THREE.Vector3());
const center = box.getCenter(new THREE.Vector3());
root.position.sub(center);
root.position.y += size.y / 2;
const dist = Math.max(size.y, size.x, size.z) * 2.4;
camera.position.set(dist * 0.7, dist * 0.55, dist * 0.9);
camera.lookAt(0, size.y * 0.4, 0);
renderer.render(scene, camera);
window.__ready = true;
</script></body></html>`;

const tmpHtml = path.join(root, "public", "_pine-preview.html");
await fs.writeFile(tmpHtml, html);

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: ["--enable-unsafe-swiftshader"],
});
try {
  // Serve via existing Next or a tiny static server on public/
  const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 700, height: 700 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(60000);
    await page.goto(`${base}/_pine-preview.html?name=${name}`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 45000 });
    await page.waitForTimeout(200);
    const dest = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: dest });
    await fs.copyFile(dest, path.join("/opt/cursor/artifacts", `${name}.png`));
    console.log("wrote", dest);
    await page.close();
  }
} finally {
  await browser.close();
  await fs.unlink(tmpHtml).catch(() => {});
}