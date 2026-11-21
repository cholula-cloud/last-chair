#!/usr/bin/env node
/** CI guard: manifest v2 rows match GLBs on disk and stay within published budgets. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const models = path.join(root, "public", "models");
const manifest = JSON.parse(fs.readFileSync(path.join(models, "manifest.json"), "utf8"));

const TRIS_MAX = {
  "surface-terminal-bottom": 350,
  "surface-terminal-top": 300,
  platter: 80,
  "trail-sign": 150,
  "trail-sign-double": 220,
  skier: 480,
  "skier-kid": 420,
  "skier-coat": 480,
  boarder: 400,
  "boarder-kid": 380,
  cafe: 1200,
  "cafe-chalet70s": 1200,
};

const SIZE_MAX_BYTES = 500_000;
let failed = false;

for (const entry of manifest.assets) {
  const file = path.join(models, entry.file);
  if (!fs.existsSync(file)) {
    console.error(`missing file for ${entry.name}: ${entry.file}`);
    failed = true;
    continue;
  }
  const stat = fs.statSync(file);
  if (stat.size > SIZE_MAX_BYTES) {
    console.error(`${entry.name}: size ${stat.size} exceeds ${SIZE_MAX_BYTES}`);
    failed = true;
  }
  if (entry.sizeBytes != null) {
    const drift = Math.abs(stat.size - entry.sizeBytes) / Math.max(entry.sizeBytes, 1);
    if (drift > 0.15) {
      console.warn(`${entry.name}: manifest sizeBytes ${entry.sizeBytes} vs disk ${stat.size} (${(drift * 100).toFixed(1)}% drift)`);
    }
  }
  const triCap = TRIS_MAX[entry.name];
  if (triCap != null && entry.tris != null && entry.tris > triCap) {
    console.error(`${entry.name}: tris ${entry.tris} over budget ${triCap}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`check-assets: ${manifest.assets.length} manifest rows OK`);