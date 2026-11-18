import { describe, expect, it } from "vitest";
import { formatFeet, formatMoney } from "./format";

describe("formatFeet", () => {
  it("rounds and thousands-separates", () => {
    expect(formatFeet(17.2285, 70)).toBe("1,206 ft");
    expect(formatFeet(0, 70)).toBe("0 ft");
    expect(formatFeet(2.973, 50.44)).toBe("150 ft");
  });
});

describe("formatMoney", () => {
  it("formats signed and unsigned amounts", () => {
    expect(formatMoney(-104, { signed: true })).toBe("\u2212$104");
    expect(formatMoney(370, { signed: true })).toBe("+$370");
    expect(formatMoney(12000)).toBe("$12,000");
    expect(formatMoney(-1500)).toBe("\u2212$1,500");
    expect(formatMoney(0, { signed: true })).toBe("+$0");
  });
});
