import { describe, expect, it } from "vitest";
import { trailPanelMode } from "./trailPanel";

const stroke = { points: [], widthFt: 60 };

describe("trailPanelMode", () => {
  it("shows the full panel when no finger is painting", () => {
    expect(trailPanelMode({ activeStroke: null, review: false, moveCamera: false })).toBe("full");
  });

  it("collapses to the compact bar while a stroke is active", () => {
    expect(trailPanelMode({ activeStroke: stroke, review: false, moveCamera: false })).toBe("compact");
  });

  it("keeps the review card in review", () => {
    expect(trailPanelMode({ activeStroke: stroke, review: true, moveCamera: false })).toBe("review");
    expect(trailPanelMode({ activeStroke: null, review: true, moveCamera: false })).toBe("review");
  });

  it("stays full while the map is being moved", () => {
    expect(trailPanelMode({ activeStroke: stroke, review: false, moveCamera: true })).toBe("full");
  });
});
