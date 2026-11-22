import { weekdayForDay, type CalendarDef, type MountainId } from "../calendar";
import type { SchoolContract } from "../schoolContract";
import type { LastDay, PersistedState } from "../state";
import type { WinterRecord } from "../winterMemory";

type DayRecord = PersistedState["dayHistory"][number];
type SeasonDayRecord = PersistedState["seasonDays"][number];

export type CareerHillStatus = "unopened" | "open" | "caretaker" | "whiterock" | "forest";

export type CareerHillRecord = {
  mountainId: MountainId;
  status: CareerHillStatus;
  caretakerAlly: string | null;
  wintersRun: number;
  lastCashDelta: number;
  lastReputation: number | null;
  bestScore: number | null;
  whiterockBidOpen?: boolean;
};

export type HillCatalogEntry = {
  id: MountainId;
  act: 1 | 2 | 3 | 4;
  name: string;
  town: string;
  state: "VT" | "MA" | "ME" | "NH";
  verticalFt: number;
  verticalNote: string;
  years: string;
  startingCash: number;
  playable: boolean;
  localContact: string;
  contactRole: string;
  signatureHook: string;
  heritage: string;
  mapPoint: { x: number; y: number };
};

export type LorePin = {
  id: "hogback";
  name: string;
  town: string;
  state: "VT";
  verticalNote: string;
  years: string;
  heritage: string;
  mapPoint: { x: number; y: number };
};

/** Lost New England ski hills ordered by scale from Readsboro to Mount Whittier. */
export const HILL_ROSTER: readonly HillCatalogEntry[] = [
  {
    id: "dutch_hill",
    act: 1,
    name: "Dutch Hill",
    town: "Heartwellville",
    state: "VT",
    verticalFt: 570,
    verticalNote: "570 ft",
    years: "1944 to 1985",
    startingCash: 12_000,
    playable: true,
    localContact: "Elena Vargas",
    contactRole: "Readsboro ski school & valley steward",
    signatureHook: "Reopen the J-bar, win the school bus, and outlast winter on a shoestring.",
    heritage: "Opened above Heartwellville in 1944 with a rope tow, a stone hearth lodge, and Windmill trails that taught half of Readsboro to ski until 1985.",
    mapPoint: { x: 88, y: 242 },
  },
  {
    id: "mount_tom",
    act: 2,
    name: "Mount Tom",
    town: "Holyoke",
    state: "MA",
    verticalFt: 680,
    verticalNote: "680 ft",
    years: "1962 to 1998",
    startingCash: 25_000,
    playable: true,
    localContact: "Lou Carvalho",
    contactRole: "Holyoke master electrician",
    signatureHook: "Snow guns open Day 1. Wire the ridge floodlights for Pioneer Valley Night Sessions.",
    heritage: "Carved into Holyoke's basalt traprock ridge overlooking the Connecticut River. Kept the slopes lit for mill shifts and college nights until 1998.",
    mapPoint: { x: 102, y: 294 },
  },
  {
    id: "maple_valley",
    act: 2,
    name: "Maple Valley",
    town: "Dummerston",
    state: "VT",
    verticalFt: 900,
    verticalNote: "841 to 1,017 ft",
    years: "1963 to 2000",
    startingCash: 35_000,
    playable: true,
    localContact: "Rosa Merrill",
    contactRole: "Dummerston school principal",
    signatureHook: "Windham school program, Saturday tubing, orchard land bid, and Inspector's Tuesday.",
    heritage: "A Windham County bowl north of Brattleboro with a famous red-shingled base lodge, school-night races, and orchards Sloane wants to subdivide.",
    mapPoint: { x: 104, y: 218 },
  },
  {
    id: "snow_valley",
    act: 3,
    name: "Snow Valley",
    town: "Winhall",
    state: "VT",
    verticalFt: 900,
    verticalNote: "900 ft",
    years: "1941 to 1984",
    startingCash: 45_000,
    playable: false,
    localContact: 'Kip "Duct-Tape" Lavoie',
    contactRole: "Manchester board-shop owner",
    signatureHook: "Early snowboarders and shared guests with Whiterock up Route 11.",
    heritage: "Old-timer Green Mountain pitches off Route 30 near Manchester where hand-cut trails met early eighties board culture before closing in 1984.",
    mapPoint: { x: 84, y: 196 },
  },
  {
    id: "enchanted_mountain",
    act: 3,
    name: "Enchanted Mountain",
    town: "Jackman",
    state: "ME",
    verticalFt: 1000,
    verticalNote: "1,000 ft",
    years: "1966 to 1974",
    startingCash: 50_000,
    playable: false,
    localContact: 'Gilles "Gilly" Fortin',
    contactRole: "Jackman snowmobile & border guide",
    signatureHook: "Deep northwoods storms, wind holds, and Quebec weekenders across Route 201.",
    heritage: "Built deep in Somerset County timberland as an ambitious Maine northwoods resort; hammered by blizzard isolation until its chairs stopped in 1974.",
    mapPoint: { x: 222, y: 68 },
  },
  {
    id: "evergreen_valley",
    act: 3,
    name: "Evergreen Valley",
    town: "Stoneham",
    state: "ME",
    verticalFt: 1050,
    verticalNote: "1,050 ft",
    years: "1972 to 1982",
    startingCash: 65_000,
    playable: false,
    localContact: "Ranger Ada Whitcomb",
    contactRole: "White Mountain district ranger",
    signatureHook: "Federal timber lease covenants and cold high-elevation snowpack.",
    heritage: "A four-season resort carved beside the White Mountain National Forest in Stoneham with quiet glades and federal lease rules.",
    mapPoint: { x: 186, y: 122 },
  },
  {
    id: "brodie",
    act: 4,
    name: "Brodie",
    town: "New Ashford",
    state: "MA",
    verticalFt: 1250,
    verticalNote: "1,250 ft",
    years: "1964 to 2002",
    startingCash: 90_000,
    playable: false,
    localContact: "Mae Donnelly",
    contactRole: "Berkshire night patrol & St. Patrick's steward",
    signatureHook: "Green-dyed snow, full-mountain night lights, and New York weekend trains.",
    heritage: "Kelly Green legend along Route 7 in the northern Berkshires. Famous for night skiing, green St. Patrick's Day snow, and the Harp Lounge until 2002.",
    mapPoint: { x: 64, y: 268 },
  },
  {
    id: "mount_whittier",
    act: 4,
    name: "Mount Whittier",
    town: "West Ossipee",
    state: "NH",
    verticalFt: 1350,
    verticalNote: "1,100 to 1,650 ft",
    years: "1949 to 1985",
    startingCash: 120_000,
    playable: false,
    localContact: "Walt Gagnon",
    contactRole: "Veteran gondola mechanic",
    signatureHook: "Dual bases bridged across Route 16 by New England's storied four-passenger gondola.",
    heritage: "Iconic Lakes Region twin-base ski area whose red gondola cabins sailed straight over Route 16 until 1985.",
    mapPoint: { x: 158, y: 146 },
  },
];

export const LORE_PINS: readonly LorePin[] = [
  {
    id: "hogback",
    name: "Hogback Mountain",
    town: "Marlboro",
    state: "VT",
    verticalNote: "460 to 500 ft",
    years: "1946 to 1986",
    heritage: "Conserved Route 9 overlook west of Brattleboro with a famous hundred-mile view. Protected town parkland today, remembered for fifty-cent nights.",
    mapPoint: { x: 96, y: 230 },
  },
];

export function hillById(id: MountainId): HillCatalogEntry {
  return HILL_ROSTER.find((entry) => entry.id === id) ?? HILL_ROSTER[0];
}

export function localContactFor(id: MountainId): string {
  return hillById(id).localContact;
}

export function defaultCareerHills(activeId: MountainId = "dutch_hill"): CareerHillRecord[] {
  return HILL_ROSTER.map((entry) => ({
    mountainId: entry.id,
    status: entry.id === activeId ? "open" : "unopened",
    caretakerAlly: null,
    wintersRun: 0,
    lastCashDelta: 0,
    lastReputation: null,
    bestScore: null,
  }));
}

export function ensureCareerHills(
  records: readonly CareerHillRecord[] | undefined,
  activeId: MountainId = "dutch_hill",
): CareerHillRecord[] {
  const existing = new Map((records ?? []).map((item) => [item.mountainId, item]));
  return HILL_ROSTER.map((entry) => {
    const found = existing.get(entry.id);
    if (found) return found;
    return {
      mountainId: entry.id,
      status: entry.id === activeId ? "open" : "unopened",
      caretakerAlly: null,
      wintersRun: 0,
      lastCashDelta: 0,
      lastReputation: null,
      bestScore: null,
    };
  });
}

export function pinTone(status: CareerHillStatus): "pine" | "whiterock" | "slate" {
  if (status === "open" || status === "caretaker") return "pine";
  if (status === "whiterock") return "whiterock";
  return "slate";
}

export function townMatchBonus(winterScore: number): number {
  if (winterScore >= 80) return 0.2;
  if (winterScore >= 60) return 0.1;
  return 0;
}

export function townMatchCash(mountainId: MountainId, winterScore: number): number {
  const base = hillById(mountainId).startingCash;
  return Math.round(base * (1 + townMatchBonus(winterScore)));
}

export type CallOffer = {
  mountainId: MountainId;
  hillName: string;
  townLabel: string;
  caller: string;
  callerRole: string;
  pitch: string;
  whiterockWarning: string;
  startingCash: number;
  bonusPct: number;
  bonusActive: boolean;
};

export function buildCallOffers(input: {
  mountainId: MountainId;
  calendar: CalendarDef;
  seasonDays: readonly SeasonDayRecord[];
  dayHistory: readonly DayRecord[];
  lastDay: LastDay | null;
  schoolContract: SchoolContract | null;
  lastWinter?: WinterRecord;
  careerHills?: readonly CareerHillRecord[];
}): CallOffer[] {
  const busiest = Math.max(
    input.lastDay?.arrivals ?? 0,
    ...input.seasonDays.map((day) => day.arrivals),
  );
  const satWaits = input.dayHistory
    .filter((day) => weekdayForDay(input.calendar, day.day) === "Sat" || day.recap.arrivals > 0)
    .map((day) => Math.round(day.recap.facts.avgWaitMin));
  const bestWait = satWaits.length
    ? Math.max(0, Math.min(...satWaits))
    : Math.round(input.lastDay?.avgWaitMin ?? 3);
  const winterScore = input.lastWinter?.score?.total ?? 0;
  const bonusPct = Math.round(townMatchBonus(winterScore) * 100);
  const pupilsTaught = input.schoolContract?.decision === "accepted" ? input.schoolContract.pupilsTaught : null;
  const candidates: MountainId[] = (["mount_tom", "maple_valley"] as MountainId[])
    .filter((id) => id !== input.mountainId);

  return candidates.map((id) => {
    const hill = hillById(id);
    const startingCash = townMatchCash(id, winterScore);
    if (id === "mount_tom") {
      return {
        mountainId: id,
        hillName: hill.name,
        townLabel: `${hill.town}, ${hill.state}`,
        caller: "Lou Carvalho",
        callerRole: "Holyoke electrician",
        pitch: `Lou Carvalho called from Holyoke. Says anybody who moved ${busiest} skiers through ${hillById(input.mountainId).name} with a ${bestWait}-minute wait can handle his ridge lights.`,
        whiterockWarning: "Maris reports Whiterock holds an option on the Mount Tom traprock ridge until April.",
        startingCash,
        bonusPct,
        bonusActive: bonusPct > 0,
      };
    }
    const busNote = pupilsTaught !== null && pupilsTaught >= 6
      ? `Hank Pelletier gave her your number after going six-for-six on Readsboro school lessons.`
      : `Hank Pelletier passed along your ledger from ${hillById(input.mountainId).name}, and Dummerston needs a winter anchor.`;
    return {
      mountainId: id,
      hillName: hill.name,
      townLabel: `${hill.town}, ${hill.state}`,
      caller: "Rosa Merrill",
      callerRole: "Dummerston principal",
      pitch: `Rosa Merrill called from Dummerston. ${busNote}`,
      whiterockWarning: "Maris warns Sloane Prescott is already pricing the orchard parcel beside Maple Valley's base.",
      startingCash,
      bonusPct,
      bonusActive: bonusPct > 0,
    };
  });
}
