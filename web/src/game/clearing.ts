import { trailSegmentMidpoints } from "./guns";
import { TERRAIN, type Terrain, type XZ } from "./terrain";
import type { TrailRun } from "./trails";

export type ClearingCell = `${number}:${number}`;

export const CLEARING_CELL_FT = 15;
export const CLEARING_COST_PER_ACRE = 300;
const SQ_FT_PER_ACRE = 43_560;
const STANDARD_WIDTH_FT = 60;
const MAX_BRUSH_WIDTH_FT = 150;
const EXPOSURE_RADIUS_FT = 90;

const cellId = (x: number, z: number): ClearingCell => `${x}:${z}`;
const brushWidth = (width: number | undefined): number =>
  width !== undefined && Number.isFinite(width) ? Math.min(MAX_BRUSH_WIDTH_FT, Math.max(0, width)) : STANDARD_WIDTH_FT;

export function isClearedAt(
  at: XZ,
  cells: ReadonlySet<ClearingCell>,
  terrain: Terrain = TERRAIN,
): boolean {
  const factor = terrain.horizontalFeetPerUnit / CLEARING_CELL_FT;
  return cells.has(cellId(Math.floor(at.x * factor), Math.floor(at.z * factor)));
}

/** Rasterize the union of a brush corridor by testing the centers of 15 ft cells. */
export function clearingCells(
  path: readonly XZ[],
  widthsFt: readonly number[],
  terrain: Terrain = TERRAIN,
): ClearingCell[] {
  const factor = terrain.horizontalFeetPerUnit / CLEARING_CELL_FT;
  const terrainBounds = terrain.bounds;
  const minX = Math.ceil(terrainBounds.xMin * factor - 0.5);
  const maxX = Math.floor(terrainBounds.xMax * factor - 0.5);
  const minZ = Math.ceil(terrainBounds.zMin * factor - 0.5);
  const maxZ = Math.floor(terrainBounds.zMax * factor - 0.5);
  const points = path.map(({ x, z }) => ({ x: x * factor, z: z * factor }));
  const cells = new Set<ClearingCell>();

  for (let i = 0; i < points.length; i++) {
    const previous = Math.max(0, i - 1);
    const a = points[previous];
    const b = points[i];
    if (![a.x, a.z, b.x, b.z].every(Number.isFinite)) continue;
    const radiusA = brushWidth(widthsFt[previous]) / (2 * CLEARING_CELL_FT);
    const radiusB = brushWidth(widthsFt[i]) / (2 * CLEARING_CELL_FT);
    const radius = Math.max(radiusA, radiusB);
    if (radius === 0) continue;
    const xStart = Math.max(minX, Math.ceil(Math.min(a.x, b.x) - radius - 0.5));
    const xEnd = Math.min(maxX, Math.floor(Math.max(a.x, b.x) + radius - 0.5));
    const zStart = Math.max(minZ, Math.ceil(Math.min(a.z, b.z) - radius - 0.5));
    const zEnd = Math.min(maxZ, Math.floor(Math.max(a.z, b.z) + radius - 0.5));
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;

    for (let x = xStart; x <= xEnd; x++) {
      for (let z = zStart; z <= zEnd; z++) {
        const offsetX = x + 0.5 - a.x;
        const offsetZ = z + 0.5 - a.z;
        const along = lengthSq > 0 ? Math.max(0, Math.min(1, (offsetX * dx + offsetZ * dz) / lengthSq)) : 0;
        const width = lengthSq > 0 ? radiusA + (radiusB - radiusA) * along : radius;
        if (Math.hypot(offsetX - dx * along, offsetZ - dz * along) <= width) cells.add(cellId(x, z));
      }
    }
  }
  return [...cells].sort();
}

/** Quote only new clearing; erasing a trail does not replant a cleared cell. */
export function clearingQuote(
  path: readonly XZ[],
  widthsFt: readonly number[],
  previouslyCleared: Iterable<ClearingCell>,
  terrain: Terrain = TERRAIN,
): { newCells: ClearingCell[]; acres: number; cost: number } {
  const existing = new Set(previouslyCleared);
  const newCells = clearingCells(path, widthsFt, terrain).filter((cell) => !existing.has(cell));
  const acres = newCells.length * CLEARING_CELL_FT ** 2 / SQ_FT_PER_ACRE;
  return { newCells, acres, cost: Math.round(acres * CLEARING_COST_PER_ACRE) };
}

/** Fraction of the 90 ft neighborhood that was cleared around each snow segment. */
export function trailExposure(
  trail: Pick<TrailRun, "path" | "snow">,
  cells: ReadonlySet<ClearingCell>,
  terrain: Terrain = TERRAIN,
): number[] {
  if (!cells.size || !trail.path.length) return trail.snow.map(() => 0);
  const factor = terrain.horizontalFeetPerUnit / CLEARING_CELL_FT;
  const radius = EXPOSURE_RADIUS_FT / CLEARING_CELL_FT;
  return trailSegmentMidpoints(trail).map((at) => {
    const xCenter = at.x * factor;
    const zCenter = at.z * factor;
    let total = 0;
    let cleared = 0;
    for (let x = Math.ceil(xCenter - radius - 0.5); x <= xCenter + radius - 0.5; x++) {
      for (let z = Math.ceil(zCenter - radius - 0.5); z <= zCenter + radius - 0.5; z++) {
        if (Math.hypot(x + 0.5 - xCenter, z + 0.5 - zCenter) > radius) continue;
        total++;
        if (cells.has(cellId(x, z))) cleared++;
      }
    }
    return total ? cleared / total : 0;
  });
}
