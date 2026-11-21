import { describe, expect, it } from "vitest";
import { moodBand, variantOf } from "./guestLook";
describe("guestLook", () => {
  it("variantOf is stable for an id", () => {
    expect(variantOf("g-42", "regular")).toBe(variantOf("g-42", "regular"));
  });

  it("moodBand boundaries", () => {
    expect(moodBand(49.9)).toBe("unhappy");
    expect(moodBand(50)).toBe("okay");
    expect(moodBand(69.9)).toBe("okay");
    expect(moodBand(70)).toBe("happy");
  });

  it("first_timer distribution is roughly 40/45/15", () => {
    const counts = { kid: 0, adult: 0, boarder: 0 };
    for (let i = 0; i < 10_000; i++) {
      const v = variantOf(`id-${i}`, "first_timer");
      if (v === "skier-kid") counts.kid++;
      else if (v === "skier") counts.adult++;
      else counts.boarder++;
    }
    expect(Math.abs(counts.kid / 100 - 40)).toBeLessThanOrEqual(3);
    expect(Math.abs(counts.adult / 100 - 45)).toBeLessThanOrEqual(3);
    expect(Math.abs(counts.boarder / 100 - 15)).toBeLessThanOrEqual(3);
  });

  it("regular distribution is roughly 50/20/30", () => {
    const counts = { adult: 0, coat: 0, boarder: 0 };
    for (let i = 0; i < 10_000; i++) {
      const v = variantOf(`reg-${i}`, "regular");
      if (v === "skier") counts.adult++;
      else if (v === "skier-coat") counts.coat++;
      else counts.boarder++;
    }
    expect(Math.abs(counts.adult / 100 - 50)).toBeLessThanOrEqual(3);
    expect(Math.abs(counts.coat / 100 - 20)).toBeLessThanOrEqual(3);
    expect(Math.abs(counts.boarder / 100 - 30)).toBeLessThanOrEqual(4);
  });
});