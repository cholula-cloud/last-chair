import { onLease, polygonBounds } from "@/game/lease";
import type { Terrain } from "@/game/terrain";

export const MASK_SIZE = 256;
/** World units added around the lease so the mask's border texels are always outside it. */
const PAD = 1.5;

export type LeaseMask = {
  /** One byte per texel, 255 on the lease and 0 off it. Row j is the z axis, column i the x axis. */
  data: Uint8Array;
  size: number;
  /** World x and z of texel (0, 0)'s corner, and the world span covered. */
  x0: number;
  z0: number;
  spanX: number;
  spanZ: number;
};

/** A coverage mask of the lease for the terrain shader, which clips the overlay with it. Built once per layer use. */
export function buildLeaseMask(terrain: Terrain, size: number = MASK_SIZE): LeaseMask {
  const poly = terrain.lease;
  const b = poly && poly.length >= 3
    ? polygonBounds(poly)
    : { xMin: terrain.bounds.xMin, xMax: terrain.bounds.xMax, zMin: terrain.bounds.zMin, zMax: terrain.bounds.zMax };
  const x0 = b.xMin - PAD;
  const z0 = b.zMin - PAD;
  const spanX = b.xMax - b.xMin + PAD * 2;
  const spanZ = b.zMax - b.zMin + PAD * 2;
  const data = new Uint8Array(size * size);
  for (let j = 0; j < size; j++) {
    const z = z0 + ((j + 0.5) / size) * spanZ;
    for (let i = 0; i < size; i++) {
      const x = x0 + ((i + 0.5) / size) * spanX;
      if (onLease({ x, z }, terrain)) data[j * size + i] = 255;
    }
  }
  return { data, size, x0, z0, spanX, spanZ };
}
