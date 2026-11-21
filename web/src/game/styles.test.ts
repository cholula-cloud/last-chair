import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE } from "./base";
import { manifestStyleFor, normalizeStyleId, resolveLodgeCoreKit, resolveStyledKit } from "./styles";

describe("building styles", () => {
  it("normalizes legacy timber ids to the catalog default", () => {
    expect(normalizeStyleId("timber50s")).toBe(DEFAULT_STYLE);
    expect(manifestStyleFor("timber50s")).toBeNull();
  });

  it("resolves chalet70s lodge and venue kits from the manifest", () => {
    expect(resolveLodgeCoreKit("chalet70s")).toBe("lodge-tier-1-chalet70s");
    expect(resolveStyledKit("lodge-annex-2", "chalet70s")).toBe("lodge-annex-2-chalet70s");
    expect(resolveStyledKit("cafe", "chalet70s")).toBe("cafe-chalet70s");
  });

  it("keeps default style kits unchanged", () => {
    expect(resolveLodgeCoreKit(DEFAULT_STYLE)).toBe("base-lodge");
    expect(resolveStyledKit("cafe", DEFAULT_STYLE)).toBe("cafe");
  });
});