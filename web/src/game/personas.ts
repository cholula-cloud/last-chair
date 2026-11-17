import type { PersonaId } from "./types";

export type PersonaDef = {
  id: PersonaId;
  label: string;
  /** Share of a weekday / weekend roster. */
  weekdayShare: number;
  weekendShare: number;
  /** Energy at arrival (1 = fresh). */
  startEnergy: number;
  /** Energy spent by each finished run; the guest goes home at 0. */
  energyPerRun: number;
  /** Game minutes for one run at snow quality 1. */
  skiMin: number;
  /** Runs wanted before heading home, drawn uniformly (inclusive). */
  targetRuns: [min: number, max: number];
  /** Multipliers on the satisfaction terms (see SIMULATION_SPEC, Satisfaction). */
  queueWeight: number;
  snowWeight: number;
  valueWeight: number;
};

/** Behaviour numbers per persona (see SIMULATION_SPEC, Personas). Satisfaction weights apply in `satisfaction.ts`. */
export const PERSONAS: Record<PersonaId, PersonaDef> = {
  first_timer: {
    id: "first_timer",
    label: "First-timer",
    weekdayShare: 0.6,
    weekendShare: 0.4,
    startEnergy: 1,
    energyPerRun: 0.13,
    skiMin: 14,
    targetRuns: [4, 8],
    queueWeight: 1.2,
    snowWeight: 1.0,
    valueWeight: 0.8,
  },
  regular: {
    id: "regular",
    label: "Regular",
    weekdayShare: 0.4,
    weekendShare: 0.6,
    startEnergy: 1,
    energyPerRun: 0.075,
    skiMin: 8,
    targetRuns: [9, 13],
    queueWeight: 1.5,
    snowWeight: 1.1,
    valueWeight: 1.3,
  },
};

/** Minutes one run takes: worse snow is a bit slower (quality 1 = base, 0.55 = +13%). */
export function skiMinutes(persona: PersonaId, snowQuality: number): number {
  const q = Math.max(0, Math.min(1, snowQuality));
  return PERSONAS[persona].skiMin * (1 + 0.3 * (1 - q));
}
