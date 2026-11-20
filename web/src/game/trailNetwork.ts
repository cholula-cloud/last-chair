import { rulesFor } from "./descent";
import { PERSONAS } from "./personas";
import { TERRAIN, type Terrain } from "./terrain";
import { DIFF_RANK, hashPick, pickTrailIndex, type TrailConnection, type TrailRun } from "./trails";
import type { PersonaId, SkiLeg } from "./types";

export const JUNCTION_EPSILON = 1e-6;

function skiable(trail: TrailRun | undefined): trail is TrailRun {
  return !!trail?.open && trail.path.length >= 2 && trail.lengthFt > 0;
}

export function endsInBaseArea(trail: TrailRun, terrain: Terrain): boolean {
  const end = trail.path.at(-1);
  return !!end && Math.hypot(end.x - terrain.base.x, end.z - terrain.base.z) <= rulesFor(terrain).baseAreaRadius;
}

/** Required endpoint links face downhill and go to an earlier trail slot. */
export function hasBaseContinuation(trails: readonly TrailRun[], index: number, from: number, terrain: Terrain): boolean {
  const trail = trails[index];
  if (!skiable(trail) || from >= 1 - JUNCTION_EPSILON) return false;
  const join = trail.links?.end;
  if (!join) return endsInBaseArea(trail, terrain);
  return join.trailIndex < index && hasBaseContinuation(trails, join.trailIndex, join.to, terrain);
}

export function hasTrailDependents(trails: readonly TrailRun[], removed: ReadonlySet<number>): boolean {
  return trails.some((trail, index) => trail.open && !removed.has(index) &&
    [trail.links?.start, trail.links?.end].some((link) => link && removed.has(link.trailIndex)));
}

type Transfer = SkiLeg & { toTrail: number; toStart: number; atHeight: number };
type LegChoice = { leg: SkiLeg; next?: Transfer; ranks: number };
const ALL_RANKS = 0b111;

function routeNetwork(trails: readonly TrailRun[]) {
  const open = trails.map(skiable);
  const transfers: Transfer[][] = trails.map(() => []);
  const starts = trails.flatMap((trail, index) => open[index] && !trail.links?.start ? [index] : []);
  const add = (index: number, join: TrailConnection, reverse = false) => {
    const toTrail = join.trailIndex;
    if (!open[index] || !open[toTrail]) return;
    const src = reverse ? toTrail : index;
    const dst = reverse ? index : toTrail;
    const from = reverse ? join.to : join.from;
    const toStart = reverse ? join.from : join.to;
    if (reverse && !hasBaseContinuation(trails, dst, toStart, TERRAIN)) return;
    transfers[src].push({
      trailIndex: src, from, to: from, toTrail: dst, toStart,
      atHeight: TERRAIN.height(join.at.x, join.at.z),
    });
  };
  for (const [index, trail] of trails.entries()) {
    if (trail.links?.start) add(index, trail.links.start, true);
    if (trail.links?.end) add(index, trail.links.end);
    for (const cross of trail.links?.crossings ?? []) {
      add(index, cross);
      add(index, cross, true);
    }
  }

  const memo = new Map<string, LegChoice[]>();
  function choices(index: number, from: number, height = Infinity): LegChoice[] {
    const key = `${index}:${from}:${height}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const trail = trails[index];
    const rank = DIFF_RANK[trail.difficulty];
    const options: LegChoice[] = [];
    if (!trail.links?.end) options.push({ leg: { trailIndex: index, from, to: 1 }, ranks: 1 << rank });
    for (const transfer of transfers[index]) {
      // A lap only moves ahead along a trail and downhill between transfers.
      if (transfer.from <= from + JUNCTION_EPSILON || transfer.atHeight >= height - JUNCTION_EPSILON) continue;
      const downstream = choices(transfer.toTrail, transfer.toStart, transfer.atHeight);
      const reachable = downstream.reduce((mask, option) => mask | option.ranks, 0);
      if (reachable) {
        const ranks = reachable & (ALL_RANKS << rank) | ((reachable & ((1 << rank) - 1)) ? 1 << rank : 0);
        options.push({ leg: { trailIndex: index, from, to: transfer.from }, next: transfer, ranks });
      }
    }
    memo.set(key, options);
    return options;
  }

  function startingChoices(liftIndex: number) {
    return starts.flatMap((index) => trails[index].liftIndex === liftIndex ? choices(index, 0) : []);
  }
  return { startingChoices, choices };
}

let lastTrails: readonly TrailRun[] | undefined;
let lastNetwork: ReturnType<typeof routeNetwork> | null = null;

function networkFor(trails: readonly TrailRun[]) {
  if (trails === lastTrails) return lastNetwork;
  const unchanged = lastTrails?.length === trails.length && trails.every((trail, index) => {
    const old = lastTrails![index];
    return trail.path === old.path && trail.open === old.open && trail.links === old.links &&
      trail.lengthFt === old.lengthFt && trail.liftIndex === old.liftIndex && trail.difficulty === old.difficulty;
  });
  if (!unchanged) lastNetwork = trails.some((trail) => trail.open && trail.links) ? routeNetwork(trails) : null;
  lastTrails = trails;
  return lastNetwork;
}

export function liftHasDescent(trails: readonly TrailRun[], liftIndex: number, persona?: PersonaId): boolean {
  const network = networkFor(trails);
  const max = persona ? DIFF_RANK[PERSONAS[persona].maxDifficulty] : DIFF_RANK.black;
  if (!network) {
    return trails.some((trail) => skiable(trail) && trail.liftIndex === liftIndex && DIFF_RANK[trail.difficulty] <= max);
  }
  const allowed = (1 << (max + 1)) - 1;
  return network.startingChoices(liftIndex).some((option) => (option.ranks & allowed) !== 0);
}

export function pickSkiRoute(
  persona: PersonaId,
  trails: readonly TrailRun[],
  liftIndex: number,
  guestId: string,
  runs: number,
): SkiLeg[] {
  const network = networkFor(trails);
  if (!network) {
    const trailIndex = pickTrailIndex(persona, trails, liftIndex, guestId, runs);
    return trailIndex >= 0 ? [{ trailIndex, from: 0, to: 1 }] : [];
  }
  let choices = network.startingChoices(liftIndex);
  const available = choices.reduce((mask, option) => mask | option.ranks, 0);
  if (!available) return [];
  const max = DIFF_RANK[PERSONAS[persona].maxDifficulty];
  const pref = DIFF_RANK[PERSONAS[persona].preferred];
  const within = available & ((1 << (max + 1)) - 1);
  const rank = within & (1 << pref) ? pref : within ? Math.floor(Math.log2(within)) : Math.log2(available & -available);
  const route: SkiLeg[] = [];
  let skiedRank = -1;
  while (choices.length) {
    const allowed = skiedRank === rank ? (1 << (rank + 1)) - 1 : 1 << rank;
    const options = choices.filter((option) => (option.ranks & allowed) !== 0);
    const key = route.length ? `${guestId}:${route.length}` : guestId;
    const selected = options[hashPick(key, runs, options.length)];
    if (!selected) break;
    route.push(selected.leg);
    if (!selected.next) break;
    skiedRank = Math.max(skiedRank, DIFF_RANK[trails[selected.leg.trailIndex].difficulty]);
    choices = network.choices(selected.next.toTrail, selected.next.toStart, selected.next.atHeight);
  }
  return route;
}
