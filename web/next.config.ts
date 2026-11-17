import type { NextConfig } from "next";

/**
 * The game is fully client-side, so it ships as a static export (`out/`) hosted on GitHub Pages.
 * Pages serves the site under /last-chair; the deploy workflow sets PAGES_BASE_PATH. Locally it is empty.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // The playtest script opens the dev server at 127.0.0.1; without this Next blocks its dev resources and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
