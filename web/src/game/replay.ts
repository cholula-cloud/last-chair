import { withTipSeen } from "./coach";
import { renameAsset } from "./assetNames";
import * as rules from "./rules";
import { SAVE_VERSION, toPersisted, type GameState } from "./state";

/** Only game actions are replayable. Camera movement and device settings stay local. */
export const replayRules = {
  markTipSeen: (state: GameState, id: string): GameState => {
    const tipsSeen = withTipSeen(state.tipsSeen, id);
    return tipsSeen === state.tipsSeen ? state : { ...state, tipsSeen };
  },
  resetTips: (state: GameState): GameState => state.tipsSeen.length ? { ...state, tipsSeen: [] } : state,
  tick: rules.tick,
  togglePause: rules.togglePause,
  skipToClose: rules.skipToClose,
  openNightIfReady: rules.openNightIfReady,
  setPendingFare: rules.setPendingFare,
  setPendingSnow: rules.setPendingSnow,
  sleep: rules.sleep,
  takeLoan: rules.takeLoan,
  repayLoan: rules.repayLoan,
  setFollowId: rules.setFollowId,
  setBuildMode: rules.setBuildMode,
  setSelectedLiftType: rules.setSelectedLiftType,
  placeLift: rules.placeLift,
  undoLift: rules.undoLift,
  closeLift: rules.closeLift,
  commitPaint: rules.commitPaint,
  renameAsset,
  placeAsset: rules.placeAsset,
  placeAssetAtPad: rules.placeAssetAtPad,
  setLodgeStyle: rules.setLodgeStyle,
  setAssetStyle: rules.setAssetStyle,
  pickCrewTalent: rules.pickCrewTalent,
  rushCrewPoint: rules.rushCrewPoint,
  moveAsset: rules.moveAsset,
  removeAsset: rules.removeAsset,
  placeGun: rules.placeGun,
  beginLodgeUpgrade: rules.beginLodgeUpgrade,
  undoTrail: rules.undoTrail,
  buyBuilding: rules.buyBuilding,
  pickFounder: rules.pickFounder,
  acknowledgeBeat: rules.acknowledgeBeat,
  replyToSummitLink: rules.replyToSummitLink,
  decideSchoolContract: rules.decideSchoolContract,
  decideGroomerDown: rules.decideGroomerDown,
  finishWinterReview: rules.finishWinterReview,
  startNewSeason: rules.startNewSeason,
};

export type RuleName = keyof typeof replayRules;
export type RuleArgs<K extends RuleName> = Parameters<typeof replayRules[K]> extends [GameState, ...infer A] ? A : never;
export type Replay = {
  format: "last-chair-replay-1";
  version: number;
  seed: number;
  initial: GameState;
  actions: { rule: RuleName; args: unknown[] }[];
};

export function applyRule<K extends RuleName>(state: GameState, rule: K, args: RuleArgs<K>): GameState {
  const apply = replayRules[rule] as (state: GameState, ...args: unknown[]) => GameState;
  return apply(state, ...args);
}

function checkpoint(state: GameState): GameState {
  return { ...toPersisted(state), talentToast: state.talentToast };
}

export function newReplay(state: GameState): Replay {
  return { format: "last-chair-replay-1", version: SAVE_VERSION, seed: state.rngState, initial: checkpoint(state), actions: [] };
}

/** Reapply the recorded rule inputs, including exact fractional tick deltas. */
export function playReplay(log: Replay): GameState {
  if (log.format !== "last-chair-replay-1" || log.version !== SAVE_VERSION || log.seed !== log.initial.rngState) {
    throw new Error("Use the game version that recorded this replay.");
  }
  let state = log.initial;
  for (const { rule, args } of log.actions) {
    if (!Object.hasOwn(replayRules, rule) || !Array.isArray(args)) throw new Error("Invalid replay action.");
    state = applyRule(state, rule, args as RuleArgs<RuleName>);
  }
  return state;
}
