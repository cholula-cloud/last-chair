import { describe, expect, it } from "vitest";
import { lodgeStructureModelNames, normalizeStyleId, resolveStyledModel } from "./kitStyle";

describe("kitStyle", () => {
  it("normalizes legacy ids", () => {
    expect(normalizeStyleId("timber50s")).toBe("1950s-timber");
    expect(normalizeStyleId(undefined)).toBe("1950s-timber");
  });

  it("composes timber lodge kits by tier", () => {
    expect(lodgeStructureModelNames(1, "1950s-timber")).toEqual(["base-lodge"]);
    expect(lodgeStructureModelNames(3, "1950s-timber")).toEqual(["base-lodge", "lodge-annex-2", "lodge-annex-3"]);
  });

  it("uses chalet monoliths", () => {
    expect(lodgeStructureModelNames(2, "chalet70s")).toEqual(["lodge-tier-2-chalet70s"]);
  });

  it("resolves styled venue meshes", () => {
    expect(resolveStyledModel("cafe", "chalet70s")).toBe("cafe-chalet70s");
    expect(resolveStyledModel("cafe", "1950s-timber")).toBe("cafe");
  });
});