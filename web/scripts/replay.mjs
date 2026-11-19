// Run from web with npm run replay -- /path/to/last-chair-replay.json.
import fs from "node:fs/promises";
import "./register-game.mjs";
const { playReplay } = await import("../src/game/replay.ts");
const path = process.argv[2];
if (!path) throw new Error("Provide an exported replay JSON file.");
const state = playReplay(JSON.parse(await fs.readFile(path, "utf8")));
console.log(JSON.stringify(state, null, 2));
