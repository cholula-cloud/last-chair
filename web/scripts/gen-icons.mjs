// Renders the Last Chair app icons from one SVG using Playwright's Chromium.
// Run from web/: node scripts/gen-icons.mjs
// Output in public/icons/: icon.svg plus the PNG sizes the manifest and iOS use.
// The artwork is a chairlift over a snowy hill in the UI palette (docs/ART_DIRECTION.md).
import { chromium } from "playwright";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const INK = "#1b3a57";
const SKY = "#9ad7f5";
const SNOW = "#ffffff";
const SNOW2 = "#e3f2fa";
const PINE = "#2d5a4a";
const GOLD = "#ffc93c";

/**
 * 512 x 512 artwork. Backgrounds run edge to edge (iOS and Android crop the corners themselves).
 * Everything that matters sits inside the central group, which `scale` shrinks around the centre.
 * Maskable icons use a 0.78 scale so the lift stays inside the 80 percent safe circle.
 */
function iconSvg(scale) {
  const c = 256;
  const t = `translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${SKY}"/>
  <path d="M0 400 C100 330 170 300 260 318 C350 336 430 330 512 292 L512 512 L0 512 Z" fill="${SNOW2}"/>
  <path d="M0 440 C110 380 220 360 330 384 C410 402 470 400 512 388 L512 512 L0 512 Z" fill="${SNOW}"/>
  <g transform="${t}">
    <circle cx="150" cy="104" r="38" fill="${GOLD}" stroke="${INK}" stroke-width="10"/>
    <path d="M330 420 L372 316 L414 420 Z" fill="${PINE}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M388 432 L424 340 L460 432 Z" fill="${PINE}" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M60 196 L452 120" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M118 184 L118 400" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>
    <path d="M92 188 L144 178" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
    <path d="M262 150 L262 216" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <rect x="224" y="214" width="80" height="20" rx="8" fill="${INK}"/>
    <path d="M230 218 L226 176" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>
`;
}

const targets = [
  { file: "apple-touch-icon.png", size: 180, scale: 1 },
  { file: "icon-192.png", size: 192, scale: 1 },
  { file: "icon-512.png", size: 512, scale: 1 },
  { file: "icon-maskable-512.png", size: 512, scale: 0.78 },
];

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "icon.svg"), iconSvg(1));

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { file, size, scale } of targets) {
    await page.setViewportSize({ width: size, height: size });
    const svg = iconSvg(scale).replace('width="512" height="512"', `width="${size}" height="${size}"`);
    await page.setContent(`<style>html,body{margin:0;background:${SKY}}svg{display:block}</style>${svg}`);
    const out = path.join(outDir, file);
    await page.screenshot({ path: out, type: "png", clip: { x: 0, y: 0, width: size, height: size } });
    const { size: bytes } = await stat(out);
    console.log(`${file} ${size}x${size} ${(bytes / 1024).toFixed(1)} KB`);
    if (bytes > 60 * 1024) throw new Error(`${file} is over 60 KB`);
  }
} finally {
  await browser.close();
}
