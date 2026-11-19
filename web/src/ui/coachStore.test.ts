import { describe, expect, it } from "vitest";
import { TIPS } from "@/game/coach";
import { createInitialState } from "@/game/state";
import { useCoach } from "./coachStore";

describe("device coaching progress", () => {
  it("handles early close, repeated tile taps, skip and replay independently of a save", () => {
    const hill = { ...createInitialState(), phase: "night", founderId: "riley" } as const;
    const coach = useCoach.getState();
    coach.replay();
    coach.observe(hill);
    expect(useCoach.getState().index).toBe(6);
    coach.next(6);
    coach.next(7);
    coach.next(7);
    expect(useCoach.getState().index).toBe(8);
    coach.next(8);
    coach.next(9);
    coach.finishDay();
    expect(useCoach.getState()).toMatchObject({ skipped: false, lodgeSeen: false, problemSeen: false });
    coach.sawLodge();
    coach.sawProblem();
    expect(useCoach.getState()).toMatchObject({ lodgeSeen: true, problemSeen: true });
    expect(useCoach.getState().index).toBe(TIPS.length);
    coach.replay();
    useCoach.setState({ index: 3 });
    coach.skip();
    expect(useCoach.getState().skipped).toBe(true);
    coach.observe(hill);
    expect(useCoach.getState().index).toBe(TIPS.length);
    coach.replay();
    expect(useCoach.getState()).toMatchObject({ index: 0, skipped: false, lodgeSeen: false, problemSeen: false });
  });
});
