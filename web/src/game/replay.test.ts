import { describe, expect, it } from "vitest";
import { createInitialState, toPersisted } from "./state";
import { newReplay, playReplay, type Replay } from "./replay";
import { exportSessionReplay, resetSessionReplay, useGameStore } from "./store";

describe("playtest replay", () => {
  it("reproduces the actual store actions after a JSON round trip", () => {
    useGameStore.setState(createInitialState(42));
    resetSessionReplay();
    useGameStore.getState().pickFounder("riley");
    useGameStore.getState().setBuildMode(true);
    useGameStore.getState().setSelectedLiftType("chair");
    useGameStore.getState().setBuildMode(false);
    const log: Replay = JSON.parse(JSON.stringify(exportSessionReplay()));
    expect(log.actions.map(a => a.rule)).toContain("pickFounder");
    expect(toPersisted(playReplay(log))).toEqual(toPersisted(useGameStore.getState()));
    resetSessionReplay();
    expect(exportSessionReplay().actions).toEqual([]);
  });

  it("rejects an unrelated file or unknown action", () => {
    const log = newReplay(createInitialState(9));
    expect(() => playReplay({ ...log, version: -1 })).toThrow();
    expect(() => playReplay({ ...log, actions: [{ rule: "constructor", args: [] }] } as unknown as Replay)).toThrow();
  });
});
