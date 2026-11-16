import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The playtest script opens the dev server at 127.0.0.1; without this Next blocks its dev resources and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
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
