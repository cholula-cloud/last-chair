import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBuiltHill } from "@/game/__fixtures__/built-hill";
import { pickFounder } from "@/game/rules";
import { toPersisted } from "@/game/state";
import { playReplay } from "@/game/replay";
import { exportSessionReplay, resetSessionReplay, useGameStore } from "@/game/store";
import { closeOffice, openOffice, useOffice } from "@/ui/officeStore";

const setGame = (phase: "day" | "night", paused: boolean) =>
  useGameStore.setState({ ...pickFounder(createBuiltHill(3), "elena"), phase, paused });

describe("Office pause and resume", () => {
  beforeEach(() => {
    resetSessionReplay();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => undefined, removeItem: () => undefined });
    useOffice.setState({ open: false, tab: "Desk", resumeOnClose: false });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("pauses a running day and resumes it on close", () => {
    setGame("day", false);
    openOffice();
    expect(useOffice.getState().open).toBe(true);
    expect(useGameStore.getState().paused).toBe(true);
    expect(playReplay(exportSessionReplay()).paused).toBe(true);
    closeOffice();
    expect(playReplay(exportSessionReplay()).paused).toBe(false);
    expect(useOffice.getState().open).toBe(false);
    expect(useGameStore.getState().paused).toBe(false);
  });

  it("leaves a day that was already paused paused", () => {
    setGame("day", true);
    openOffice();
    closeOffice();
    expect(useGameStore.getState().paused).toBe(true);
  });

  it("opening again while open keeps the first answer about whether the day was running", () => {
    setGame("day", false);
    openOffice();
    openOffice();
    closeOffice();
    expect(useGameStore.getState().paused).toBe(false);
  });

  it("opens the ledger at night without resuming the day", () => {
    setGame("night", true);
    openOffice("Money");
    expect(useOffice.getState()).toMatchObject({ open: true, tab: "Money", resumeOnClose: false });
    closeOffice();
    expect(useGameStore.getState().paused).toBe(true);
  });

  it("does not resume when the phase has moved on", () => {
    setGame("day", false);
    openOffice();
    useGameStore.setState({ phase: "night", paused: true });
    closeOffice();
    expect(useGameStore.getState().paused).toBe(true);
  });

  it("a second close changes nothing", () => {
    setGame("day", false);
    openOffice();
    closeOffice();
    useGameStore.setState({ paused: true });
    closeOffice();
    expect(useGameStore.getState().paused).toBe(true);
  });

  it("remembers the tab between visits and never changes sim state by opening", () => {
    setGame("day", true);
    const before = structuredClone(toPersisted(useGameStore.getState()));
    openOffice("Desk");
    closeOffice();
    const after = structuredClone(toPersisted(useGameStore.getState()));
    expect(after).toEqual(before);
  });
});
