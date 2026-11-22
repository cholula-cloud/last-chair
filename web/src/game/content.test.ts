import { describe, expect, it } from "vitest";
import { DAY_1_COLD_READ, FOUNDERS, OPERATOR_NAME_MAX, formatOperatorText, sanitizeOperatorName } from "./content";
import { migrate } from "./migrations";
import { createInitialState, SAVE_VERSION, toPersisted } from "./state";
import { setOperatorName, startNewSeason } from "./rules";

describe("operatorName and partner copy", () => {
  it("sanitizes lease names and falls back to null for blank or default", () => {
    expect(sanitizeOperatorName("")).toBeNull();
    expect(sanitizeOperatorName("   the operator  ")).toBeNull();
    expect(sanitizeOperatorName("Sam!@# O'Connor-2")).toBe("Sam O'Connor-2");
    expect(sanitizeOperatorName("A".repeat(40))).toHaveLength(OPERATOR_NAME_MAX);
  });

  it("substitutes operatorName or falls back to 'the operator'", () => {
    expect(formatOperatorText(DAY_1_COLD_READ, "Maya")).toContain("Maya came home");
    expect(formatOperatorText(DAY_1_COLD_READ, null)).toContain("the operator came home");
  });

  it("gives every founder a plain, punchy relationship line", () => {
    expect(FOUNDERS).toHaveLength(6);
    for (const f of FOUNDERS) {
      expect(f.relationship.length).toBeGreaterThan(20);
      expect(f.relationship).not.toMatch(/—|·/);
    }
  });

  it("preserves operatorName across replay and save v14 -> v15 migration", () => {
    const named = setOperatorName(createInitialState(4), "  Myles O'Neil  ");
    expect(named.operatorName).toBe("Myles O'Neil");
    const next = startNewSeason(named);
    expect(next.operatorName).toBe("Myles O'Neil");

    const v14 = toPersisted(createInitialState(4)) as Record<string, unknown>;
    delete v14.operatorName;
    const migrated = migrate(v14, 14);
    expect(migrated.reset).toBe(false);
    expect(migrated.state.operatorName).toBeNull();
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(15);
  });
});
