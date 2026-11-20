#!/usr/bin/env node
/**
 * Estimate ElevenLabs free-credit usage and optionally fetch one-take SFX into web/public/audio/.
 * Requires ELEVENLABS_API_KEY. When the key is missing, the game keeps the Q3 synth fallback.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = join(root, "web/public/audio/audio-manifest.json");
const outDir = join(root, "web/public/audio");

const PROMPTS = {
  "bed-day": "Soft winter wind across an open ski slope, distant chairlift motor hum, occasional crow, seamless loop, no music",
  "bed-night": "Quiet Vermont lodge room tone with a wood stove crackle, muffled wind outside, seamless loop, no music",
  "ui-tap": "Very short wooden UI key click, dry, mono",
  "ui-select": "Short soft mechanical select blip, mono",
  "ui-sheet": "Brief paper sheet slide open, mono",
  "ui-blocked": "Gentle muted error thud, mono",
  "build-place": "Lift tower planting into frozen ground, brief construction thunk",
  "cash-in": "Small satisfying cash register chime, two bright notes",
  "sleep": "Soft settling whoosh as the hill closes for the night",
  "morning": "Bright morning headline chime, welcoming, three notes",
  "radio-sting": "Three rising notes through a narrow AM radio band, Route 100 style, no voice",
};

function loadManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function estimate() {
  const manifest = loadManifest();
  let chars = 0;
  for (const entry of manifest.sounds) {
    const prompt = PROMPTS[entry.id] ?? entry.id;
    chars += prompt.length;
    console.log(`${entry.id}: ~${prompt.length} prompt chars`);
  }
  console.log(`\nTotal prompt characters (estimate): ${chars}`);
  console.log("Generate one take per id only; update manifest bytes and loopStart/loopEnd after encoding AAC.");
}

async function generateOne(id) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error("ELEVENLABS_API_KEY is not set; synth fallback remains active.");
    process.exit(1);
  }
  const prompt = PROMPTS[id];
  if (!prompt) throw new Error(`No prompt for ${id}`);
  const manifest = loadManifest();
  const entry = manifest.sounds.find((s) => s.id === id);
  if (!entry?.file) throw new Error(`Manifest entry missing for ${id}`);

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: id.startsWith("bed-") ? 75 : id === "radio-sting" ? 3.5 : 1.2,
      prompt_influence: 0.3,
    }),
  });
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = join(outDir, entry.file.replace(/\.m4a$/, ".mp3"));
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes). Transcode to AAC .m4a and set loop points in the manifest.`);
}

const args = process.argv.slice(2);
if (args.includes("--estimate")) estimate();
else if (args.includes("--id")) {
  const i = args.indexOf("--id");
  void generateOne(args[i + 1]);
} else {
  console.log("Pass --estimate or --id <manifest-id>");
  estimate();
}
