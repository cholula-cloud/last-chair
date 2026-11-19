import { describe, expect, it } from "vitest";
import { undoChipLabel } from "./undoLabel";

describe("undoChipLabel", () => {
  it("names what was placed and the refund", () => {
    expect(undoChipLabel("lift", 460)).toBe("Lift placed. Undo for $460.");
    expect(undoChipLabel("trail", 1200)).toBe("Trail placed. Undo for $1,200.");
    expect(undoChipLabel("asset", 0)).toBe("Asset placed. Undo for $0.");
  });

  it("uses no middle dot or dash", () => {
    expect(undoChipLabel("lift", 5)).not.toMatch(/[·—–]/);
  });
});
