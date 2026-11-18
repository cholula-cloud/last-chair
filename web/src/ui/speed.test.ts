import { describe, expect, it } from "vitest";
import { scaledTickMs } from "./speed";

describe("scaledTickMs", () => {
  it("scales delta and clamps long frames", () => {
    expect(scaledTickMs(0.5, 3)).toBe(300);
    expect(scaledTickMs(0.5, 1)).toBe(100);
    expect(scaledTickMs(0.5, 2)).toBe(200);
    expect(scaledTickMs(0.2, 3)).toBe(300);
    expect(scaledTickMs(0.08, 3)).toBe(240);
  });
});