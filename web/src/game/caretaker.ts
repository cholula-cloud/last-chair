import type { MountainId } from "./calendar";
import { formatMoney } from "./format";
import { hillById, type CareerHillRecord } from "./mountains/roster";
import { mix32, STREAM, streamFor } from "./rng";

export const WHITEROCK_BID_THRESHOLD = 45;

export type HomecomingNote = {
  mountainId: MountainId;
  hillName: string;
  caretakerAlly: string;
  wintersRun: number;
  cashDelta: number;
  reputation: number;
  whiterockBidOpen: boolean;
  headline: string;
};

export type CaretakerLedgerEntry = {
  day: number;
  mountainId: MountainId;
  hillName: string;
  caretakerAlly: string;
  cashDelta: number;
  reputation: number;
};

export function whiterockBuyoutOffer(mountainId: MountainId): number {
  return Math.round(hillById(mountainId).startingCash * 0.6);
}

/** Deterministic coarse off-screen winter run by a departed hill's named local caretaker. */
export function simulateCaretakerWinter(
  record: CareerHillRecord,
  seed: number,
  day = 1,
): {
  record: CareerHillRecord;
  cashDelta: number;
  note: HomecomingNote;
  ledger: CaretakerLedgerEntry;
} {
  const hill = hillById(record.mountainId);
  const caretakerAlly = record.caretakerAlly ?? hill.localContact;
  const rng = streamFor(seed ^ mix32(record.wintersRun + 1), STREAM.SURPRISE);
  const prevRep = record.lastReputation ?? 55;
  const repSwing = Math.round((rng.next() - 0.42) * 18);
  const reputation = Math.max(25, Math.min(92, prevRep + repSwing));
  const baseDividend = Math.round(hill.startingCash * 0.06);
  const cashDelta = Math.round(baseDividend * ((reputation - 38) / 25) + (rng.next() - 0.4) * 450);
  const whiterockBidOpen = reputation < WHITEROCK_BID_THRESHOLD;
  const wintersRun = record.wintersRun + 1;
  const nextRecord: CareerHillRecord = {
    ...record,
    caretakerAlly,
    wintersRun,
    lastCashDelta: cashDelta,
    lastReputation: reputation,
    whiterockBidOpen,
  };
  const signed = formatMoney(cashDelta, { signed: true });
  const headline = whiterockBidOpen
    ? `${caretakerAlly} kept ${hill.name} turning (${signed}), but rep dipped to ${reputation}. Sloane mailed a buyout offer.`
    : `${caretakerAlly} sent ${signed} from ${hill.name} after winter #${wintersRun} (rep ${reputation}).`;
  return {
    record: nextRecord,
    cashDelta,
    note: {
      mountainId: record.mountainId,
      hillName: hill.name,
      caretakerAlly,
      wintersRun,
      cashDelta,
      reputation,
      whiterockBidOpen,
      headline,
    },
    ledger: {
      day,
      mountainId: record.mountainId,
      hillName: hill.name,
      caretakerAlly,
      cashDelta,
      reputation,
    },
  };
}

export function resolveLostHill(
  careerHills: readonly CareerHillRecord[],
  bankruptId: MountainId,
  sloaneBidActive: boolean,
): {
  careerHills: CareerHillRecord[];
  survivingHills: CareerHillRecord[];
  lostStatus: "whiterock" | "forest";
  forestEpilogue: boolean;
} {
  const lostStatus: "whiterock" | "forest" = sloaneBidActive ? "whiterock" : "forest";
  const nextHills = careerHills.map((record) =>
    record.mountainId === bankruptId
      ? { ...record, status: lostStatus, whiterockBidOpen: false }
      : record,
  );
  const survivingHills = nextHills.filter(
    (record) => record.mountainId !== bankruptId && record.status === "caretaker",
  );
  return {
    careerHills: nextHills,
    survivingHills,
    lostStatus,
    forestEpilogue: survivingHills.length === 0,
  };
}
