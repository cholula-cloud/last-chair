import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Heavy season sims on shared GHA runners: limit workers to avoid OOM thrash that looks like hangs.
    maxWorkers: process.env.CI ? 2 : undefined,
    fileParallelism: process.env.CI ? false : undefined,
  },
});
