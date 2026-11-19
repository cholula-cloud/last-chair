import type { GuestMix } from "./calendar";
import type { PersonaId, TrailDifficulty } from "./types";

export type PersonaDef = {
  id: PersonaId;
  label: string;
  maxDifficulty: TrailDifficulty;
  preferred: TrailDifficulty;
  /** Share of a weekday / weekend roster. */
  weekdayShare: number;
  weekendShare: number;
  holidayShare: number;
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
    maxDifficulty: "green",
    preferred: "green",
    weekdayShare: 0.48,
    weekendShare: 0.30,
    holidayShare: 0.25,
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
    maxDifficulty: "black",
    preferred: "blue",
    weekdayShare: 0.34,
    weekendShare: 0.45,
    holidayShare: 0.35,
    startEnergy: 1,
    energyPerRun: 0.075,
    skiMin: 8,
    targetRuns: [9, 13],
    queueWeight: 1.5,
    snowWeight: 1.1,
    valueWeight: 1.3,
  },
  family_pack: {
    id: "family_pack", label: "Family Pack", maxDifficulty: "blue", preferred: "green",
    weekdayShare: 0.12, weekendShare: 0.17, holidayShare: 0.30,
    startEnergy: 1, energyPerRun: 0.12, skiMin: 13, targetRuns: [5, 8],
    queueWeight: 1.4, snowWeight: 0.9, valueWeight: 1.0,
  },
  race_kid: {
    id: "race_kid", label: "Race Kid", maxDifficulty: "black", preferred: "black",
    weekdayShare: 0.06, weekendShare: 0.08, holidayShare: 0.10,
    startEnergy: 1, energyPerRun: 0.075, skiMin: 7, targetRuns: [9, 13],
    queueWeight: 1.0, snowWeight: 1.4, valueWeight: 0.9,
  },
};

export function personaShare(persona: PersonaDef, mix: GuestMix | boolean): number {
  if (mix === "holiday") return persona.holidayShare;
  return mix === "weekend" || mix === true ? persona.weekendShare : persona.weekdayShare;
}

export function drawPersona(draw: number, mix: GuestMix | boolean): PersonaId {
  let cumulative = 0;
  for (const persona of Object.values(PERSONAS)) {
    cumulative += personaShare(persona, mix);
    if (draw < cumulative) return persona.id;
  }
  return "race_kid";
}

/** Minutes one run takes at the reference trail length; worse snow is a bit slower. */
export function skiMinutes(persona: PersonaId, snowQuality: number): number {
  const q = Math.max(0, Math.min(1, snowQuality));
  return PERSONAS[persona].skiMin * (1 + 0.3 * (1 - q));
}
