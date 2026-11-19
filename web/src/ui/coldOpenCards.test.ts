import { describe, expect, it } from "vitest";
import { COLD_OPEN_CARDS, cardAtTime, cueOf, silentHoldSeconds } from "./coldOpenCards";

describe("cold open", () => {
  it("has four cards whose cues rise from zero", () => {
    expect(COLD_OPEN_CARDS).toHaveLength(4);
    expect(COLD_OPEN_CARDS[0].cue).toBe(0);
    COLD_OPEN_CARDS.slice(1).forEach((card, i) => expect(card.cue).toBeGreaterThan(COLD_OPEN_CARDS[i].cue));
  });

  it("keeps cues inside the 18.8 second recording", () => {
    expect(COLD_OPEN_CARDS[3].cue).toBeLessThan(18.7);
  });

  it("picks the card for a playback time", () => {
    expect(cardAtTime(0)).toBe(0);
    expect(cardAtTime(5.9)).toBe(0);
    expect(cardAtTime(6.0)).toBe(1);
    expect(cardAtTime(11.19)).toBe(1);
    expect(cardAtTime(11.2)).toBe(2);
    expect(cardAtTime(18)).toBe(3);
    expect(cardAtTime(99)).toBe(3);
  });

  it("seeks to a card's cue and clamps out-of-range cards", () => {
    expect(cueOf(2)).toBe(COLD_OPEN_CARDS[2].cue);
    expect(cueOf(-1)).toBe(0);
    expect(cueOf(9)).toBe(COLD_OPEN_CARDS[3].cue);
  });

  it("holds a silent card until the next cue, and the last card for the player", () => {
    expect(silentHoldSeconds(0)).toBeCloseTo(6.0);
    expect(silentHoldSeconds(3)).toBeNull();
  });

  it("writes captions as plain sentences with no dashes or middle dots", () => {
    for (const card of COLD_OPEN_CARDS) {
      expect(card.caption).not.toMatch(/[—–·]/);
      expect(card.caption).toMatch(/[.]$/);
    }
  });
});
