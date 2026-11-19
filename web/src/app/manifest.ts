import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** GitHub Pages serves the site under a repo path; next.config sets this (empty in local dev). */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Web app manifest, written to out/manifest.webmanifest at build time.
 * Colours come from the UI palette: sky behind the title screen, ink for the bar.
 * Orientation is left open because the game works portrait and landscape.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Last Chair",
    short_name: "Last Chair",
    description:
      "A cozy ski-hill tycoon for your phone: reopen Dutch Hill, Vermont, for one more winter.",
    id: `${base}/play/`,
    start_url: `${base}/play/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "any",
    background_color: "#9ad7f5",
    theme_color: "#1b3a57",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
