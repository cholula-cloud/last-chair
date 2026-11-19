// Run the interactive winter and replay checks with a fresh save per device.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("playtest-p0.mjs", import.meta.url));
const engines = (process.env.PLAYTEST_ENGINES ?? "chromium,webkit").split(",");
const viewports = (process.env.PLAYTEST_VIEWPORTS ?? "390x844,844x390,820x1180,375x667").split(",");
for (const engine of engines) {
  for (const viewport of viewports) {
    for (const reduced of [false, true]) {
      const label = [engine, viewport, reduced ? "quiet" : "standard"].join("-");
      console.log("P1 winter", label);
      execFileSync(process.execPath, [runner], {
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYTEST_ENGINE: engine,
          PLAYTEST_VIEWPORT: viewport,
          PLAYTEST_REDUCED_MOTION: reduced ? "1" : "0",
          PLAYTEST_OUT: path.join(process.env.PLAYTEST_OUT ?? "playtest-artifacts", "p1", label),
        },
      });
    }
  }
}
