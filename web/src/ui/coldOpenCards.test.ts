import { describe, expect, it } from "vitest";
import { COLD_OPEN_CARDS, cardAtTime, cueOf, silentHoldSeconds } from "./coldOpenCards";

describe("cold open", () => {
  it("has six cards whose cues rise from zero", () => {
    expect(COLD_OPEN_CARDS).toHaveLength(6);
    expect(COLD_OPEN_CARDS[0].cue).toBe(0);
    COLD_OPEN_CARDS.slice(1).forEach((card, i) => expect(card.cue).toBeGreaterThan(COLD_OPEN_CARDS[i].cue));
  });

  it("picks the card for a playback time", () => {
    expect(cardAtTime(0)).toBe(0);
    expect(cardAtTime(5.9)).toBe(0);
    expect(cardAtTime(6.0)).toBe(1);
    expect(cardAtTime(11.19)).toBe(1);
    expect(cardAtTime(11.2)).toBe(2);
    expect(cardAtTime(32)).toBe(5);
    expect(cardAtTime(99)).toBe(5);
  });

  it("seeks to a card's cue and clamps out-of-range cards", () => {
    expect(cueOf(2)).toBe(COLD_OPEN_CARDS[2].cue);
    expect(cueOf(-1)).toBe(0);
    expect(cueOf(9)).toBe(COLD_OPEN_CARDS[5].cue);
  });

  it("holds a silent non-interactive card until the next cue, and pauses on interactive and final cards", () => {
    expect(silentHoldSeconds(0)).toBeCloseTo(6.0);
    expect(silentHoldSeconds(2)).toBeNull();
    expect(silentHoldSeconds(4)).toBeNull();
    expect(silentHoldSeconds(5)).toBeNull();
  });

  it("writes captions as plain sentences with no dashes or middle dots", () => {
    for (const card of COLD_OPEN_CARDS) {
      expect(card.caption).not.toMatch(/[—–·]/);
      expect(card.caption).toMatch(/[.?!]$/);
    }
  });
});
