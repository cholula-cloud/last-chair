import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function colors(selector: string) {
  const start = css.indexOf(selector + " {");
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(m => [m[1], m[2]]));
}

function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(pair => {
    const x = parseInt(pair, 16) / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

it("keeps normal text at 4.5:1 on the HUD and sheet palettes, day and night", () => {
  const day = { ...colors(":root"), white: "#ffffff" };
  const night = { ...day, ...colors('[data-mood="night"]') };
  for (const palette of [day, night] as Record<string, string>[]) {
    for (const [fg, bg] of [
      ["ink", "snow"], ["ink-soft", "snow"], ["ink", "snow-2"], ["ink-soft", "snow-2"],
      ["ink", "gold"], ["ink", "sign-yellow"], ["ink", "sky"], ["white", "barn-deep"],
      ["white", "sign-green"], ["white", "sign-brown"], ["sign-green-ink", "sign-green"],
    ]) {
      const a = luminance(palette[fg]), b = luminance(palette[bg]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      expect(ratio, fg + " on " + bg).toBeGreaterThanOrEqual(4.5);
    }
  }
});
