import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";

const page = await fs.readFile("out/play/index.html", "utf8");
const initial = new Set([...page.matchAll(/<script\b[^>]*?\bsrc="[^"]*\/_next\/static\/chunks\/([^"?]+)\.js(?:\?[^"]*)?"/g)].map(match => match[1] + ".js"));
assert(initial.size, "The play page needs at least one JavaScript bundle");
const chunks = [];
for (const name of await fs.readdir("out/_next/static/chunks", { recursive: true })) {
  if (name.endsWith(".js")) chunks.push({ name, gzip: gzipSync(await fs.readFile(path.join("out/_next/static/chunks", name))).length });
}
chunks.sort((a, b) => b.gzip - a.gzip);
const initialBytes = chunks.filter(chunk => initial.has(chunk.name)).reduce((total, c) => total + c.gzip, 0);
console.log(JSON.stringify({ initialBytes, largestChunks: chunks.slice(0, 5) }, null, 2));
assert(initialBytes <= 450 * 1024 * 1.05, "Initial JavaScript exceeds the 450 KiB gzip budget plus 5% tolerance");
assert(chunks[0].gzip <= 350 * 1024 * 1.05, "A chunk exceeds the 350 KiB gzip budget plus 5% tolerance");
