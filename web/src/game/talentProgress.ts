import type { LodgeTier } from "./base";
import { CREW_TALENTS, type TalentId, TALENT } from "./talents";

export type { TalentId } from "./talents";
import type { GameState } from "./state";

export const CREW_POINT_COST = 1;

export type TalentDef = (typeof CREW_TALENTS)[number] & { requiresTier?: LodgeTier };

const TIER_BY_ID: Partial<Record<TalentId, LodgeTier>> = {
  [TALENT.trailGuns.id]: 2,
  [TALENT.cafeShift.id]: 2,
  [TALENT.windHold.id]: 2,
  [TALENT.corduroy.id]: 2,
  [TALENT.snowFences.id]: 2,
  [TALENT.heritageSign.id]: 2,
  [TALENT.bullWheel.id]: 2,
  [TALENT.skiSchool.id]: 2,
  [TALENT.earlyPlow.id]: 2,
  [TALENT.nightLights.id]: 2,
  [TALENT.groomerRebuild.id]: 3,
  [TALENT.firstAidHut.id]: 2,
  [TALENT.route100Billboard.id]: 2,
};

export function talentRequiresTier(id: TalentId): LodgeTier {
  return TIER_BY_ID[id] ?? 1;
}

function predecessor(id: TalentId): TalentId | null {
  const i = CREW_TALENTS.findIndex((t) => t.id === id);
  return i > 0 ? CREW_TALENTS[i - 1]!.id : null;
}

export function canUnlockTalent(state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">, id: TalentId): boolean {
  if (state.talentsOwned.includes(id)) return false;
  if (state.crewPoints < CREW_POINT_COST) return false;
  if (state.lodgeTier < talentRequiresTier(id)) return false;
  const prev = predecessor(id);
  if (prev && !state.talentsOwned.includes(prev)) return false;
  return true;
}

export function pickableTalents(state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">): TalentDef[] {
  return CREW_TALENTS.filter((t) => canUnlockTalent(state, t.id));
}

export function pickTalent(state: GameState, id: TalentId): GameState {
  if (!canUnlockTalent(state, id)) return state;
  const talent = CREW_TALENTS.find((t) => t.id === id);
  if (!talent) return state;
  return {
    ...state,
    crewPoints: state.crewPoints - CREW_POINT_COST,
    talentsOwned: [...state.talentsOwned, id],
    talentToast: `${talent.name} is on the crew roster.`,
  };
}

/** Morning fallback when the player does not choose: first pickable talent in roster order. */
export function autoPickTalent(state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">): TalentId | null {
  const next = pickableTalents(state)[0];
  if (!next) return null;
  return next.id;
}

export const CREW_RUSH_COST = 2000;

/** Spend every unspent crew point in roster order (balance harness and sleep fallback). */
export function spendAllCrewPoints(state: GameState): { state: GameState; picked: TalentId[] } {
  let next = state;
  const picked: TalentId[] = [];
  while (next.crewPoints > 0) {
    const talent = CREW_TALENTS.find((t) => !next.talentsOwned.includes(t.id));
    if (!talent) break;
    const need = talentRequiresTier(talent.id);
    if (next.lodgeTier < need) next = { ...next, lodgeTier: need };
    const before = next.talentsOwned.length;
    next = pickTalent(next, talent.id);
    if (next.talentsOwned.length > before) picked.push(talent.id);
    else break;
  }
  return { state: next, picked };
}

/** Layout positions for the talent tree (column = crew). */
export const TALENT_TREE_ROW: Record<TalentId, number> = Object.fromEntries(
  CREW_TALENTS.map((t, i) => [t.id, i]),
) as Record<TalentId, number>;

export const TALENT_TREE_COL: Record<TalentId, 0 | 1 | 2> = Object.fromEntries(
  CREW_TALENTS.map((t) => [t.id, t.crew === "Frank" ? 0 : t.crew === "Dana" ? 1 : 2]),
) as Record<TalentId, 0 | 1 | 2>;