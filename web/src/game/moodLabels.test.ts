import { describe, expect, it } from "vitest";
import { moodTone, satisfactionMoodWord } from "./moodLabels";

describe("moodLabels", () => {
  it("matches HUD bands for happy, mixed and grumpy", () => {
    expect(satisfactionMoodWord(72)).toBe("Happy");
    expect(moodTone(72)).toBe("good");
    expect(satisfactionMoodWord(55)).toBe("Mixed");
    expect(moodTone(55)).toBe("watch");
    expect(satisfactionMoodWord(40)).toBe("Grumpy");
    expect(moodTone(40)).toBe("bad");
  });
});