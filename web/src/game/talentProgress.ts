import type { LodgeTier } from "./base";
import { CREW_TALENTS, type CrewMember, type TalentId, TALENT } from "./talents";

export type { TalentId } from "./talents";
import type { GameState } from "./state";

export const CREW_POINT_COST = 1;

/** Spend points in one column at a time; deeper skills need the previous one in that column. */
export const CREW_TRACK_ORDER: Record<CrewMember, readonly TalentId[]> = {
  Frank: [
    TALENT.ropeTow.id,
    TALENT.groomPass.id,
    TALENT.corduroy.id,
    TALENT.trailGuns.id,
    TALENT.snowFences.id,
    TALENT.bullWheel.id,
    TALENT.earlyPlow.id,
    TALENT.nightLights.id,
    TALENT.groomerRebuild.id,
  ],
  Dana: [
    TALENT.patrolRadio.id,
    TALENT.volunteerPatrol.id,
    TALENT.windHold.id,
    TALENT.firstAidHut.id,
  ],
  Elena: [
    TALENT.ticketBooth.id,
    TALENT.schoolDay.id,
    TALENT.houseBand.id,
    TALENT.cafeShift.id,
    TALENT.heritageSign.id,
    TALENT.skiSchool.id,
    TALENT.route100Billboard.id,
  ],
};

/** Lodge tier required before an entire crew column is on the board. */
export const CREW_COLUMN_MIN_TIER: Record<CrewMember, LodgeTier> = {
  Frank: 1,
  Dana: 2,
  Elena: 1,
};

/** Minimum lodge tier for each skill (within-column bands). */
const TIER_BY_ID: Record<TalentId, LodgeTier> = Object.fromEntries(
  CREW_TALENTS.map((t) => {
    const track = CREW_TRACK_ORDER[t.crew];
    const i = track.indexOf(t.id);
    const band = t.crew === "Frank"
      ? i < 2 ? 1 : i < 8 ? 2 : 3
      : t.crew === "Elena"
        ? i < 3 ? 1 : 2
        : 2;
    return [t.id, band];
  }),
) as Record<TalentId, LodgeTier>;

const TRACK_LOOKUP: Map<TalentId, { crew: CrewMember; index: number }> = new Map(
  (Object.entries(CREW_TRACK_ORDER) as [CrewMember, readonly TalentId[]][]).flatMap(
    ([crew, ids]) => ids.map((id, index) => [id, { crew, index }] as const),
  ),
);

export type TalentDef = (typeof CREW_TALENTS)[number] & { requiresTier?: LodgeTier };

export function talentRequiresTier(id: TalentId): LodgeTier {
  return TIER_BY_ID[id];
}

export function talentCrew(id: TalentId): CrewMember {
  return TRACK_LOOKUP.get(id)!.crew;
}

function trackPredecessor(id: TalentId): TalentId | null {
  const slot = TRACK_LOOKUP.get(id);
  if (!slot || slot.index === 0) return null;
  return CREW_TRACK_ORDER[slot.crew][slot.index - 1]!;
}

export type TalentBlockReason = "owned" | "points" | "column" | "lodge" | "prerequisite";

export function talentBlockReason(
  state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">,
  id: TalentId,
): TalentBlockReason | null {
  if (state.talentsOwned.includes(id)) return "owned";
  const crew = talentCrew(id);
  if (state.lodgeTier < CREW_COLUMN_MIN_TIER[crew]) return "column";
  if (state.lodgeTier < talentRequiresTier(id)) return "lodge";
  const prev = trackPredecessor(id);
  if (prev && !state.talentsOwned.includes(prev)) return "prerequisite";
  if (state.crewPoints < CREW_POINT_COST) return "points";
  return null;
}

export function canUnlockTalent(state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">, id: TalentId): boolean {
  return talentBlockReason(state, id) === null;
}

export function pickableTalents(state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">): TalentDef[] {
  return CREW_TALENTS.filter((t) => canUnlockTalent(state, t.id));
}

/** Flat pick order for hints and headless spend (Frank, then Elena, then Dana). */
export const TALENT_PICK_ORDER: readonly TalentId[] = [
  ...CREW_TRACK_ORDER.Frank,
  ...CREW_TRACK_ORDER.Elena,
  ...CREW_TRACK_ORDER.Dana,
];

export function pickTalent(state: GameState, id: TalentId): GameState {
  if (!canUnlockTalent(state, id)) return state;
  const talent = CREW_TALENTS.find((t) => t.id === id);
  if (!talent) return state;
  return {
    ...state,
    crewPoints: state.crewPoints - CREW_POINT_COST,
    talentsOwned: [...state.talentsOwned, id],
    talentToast: `${talent.name} (${talent.crew}) unlocked. ${talent.effect}`,
  };
}

/** Morning fallback when the player does not choose: first pickable talent in pick order. */
export function autoPickTalent(state: Pick<GameState, "talentsOwned" | "lodgeTier" | "crewPoints">): TalentId | null {
  const pickable = new Set(pickableTalents(state).map((t) => t.id));
  return TALENT_PICK_ORDER.find((id) => pickable.has(id)) ?? null;
}

export const CREW_RUSH_COST = 2000;

/** Spend every unspent crew point (balance harness only). Respects tracks and lodge gates. */
export function spendAllCrewPoints(state: GameState): { state: GameState; picked: TalentId[] } {
  let next = state;
  const picked: TalentId[] = [];
  while (next.crewPoints > 0) {
    const id = autoPickTalent(next);
    if (!id) break;
    const before = next.talentsOwned.length;
    next = pickTalent(next, id);
    if (next.talentsOwned.length > before) picked.push(id);
    else break;
  }
  return { state: next, picked };
}

/** Layout positions for the talent tree (column = crew). */
export const TALENT_TREE_ROW: Record<TalentId, number> = Object.fromEntries(
  (Object.entries(CREW_TRACK_ORDER) as [CrewMember, readonly TalentId[]][]).flatMap(
    ([, ids]) => ids.map((id, i) => [id, i]),
  ),
) as Record<TalentId, number>;

export const TALENT_TREE_COL: Record<TalentId, 0 | 1 | 2> = Object.fromEntries(
  CREW_TALENTS.map((t) => [t.id, t.crew === "Frank" ? 0 : t.crew === "Dana" ? 1 : 2]),
) as Record<TalentId, 0 | 1 | 2>;

export function talentsForCrew(crew: CrewMember): readonly (typeof CREW_TALENTS)[number][] {
  return CREW_TRACK_ORDER[crew].map((id) => CREW_TALENTS.find((t) => t.id === id)!);
}