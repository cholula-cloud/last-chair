"use client";

import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { checkAssetPlacement, checkGunPlacement, checkPlacement } from "@/game/rules";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { usePlacementDraft } from "@/ui/placementDraft";

/** A sampled guide: the placement preview remains the final authority. */
export function BuildGrid() {
  const draft = usePlacementDraft();
  const state = useGameStore();
  const { active, showBuildGrid, kind, type, asset, bottom, top, step } = draft;
  const { lifts, assets, guns, cash, phase, lodgeTier, trails } = state;
  const placementKey = JSON.stringify({
    lifts: lifts.map(({ anchor, bottom, type, confirmed }) => ({ anchor, bottom, type, confirmed })),
    assets, guns, cash, phase, lodgeTier,
    trails: trails.map(({ open }) => open),
  });
  const geometry = useMemo(() => {
    if (!active && !showBuildGrid) return null;
    const positions: number[] = [];
    const colors: number[] = [];
    const green = new Color("#36a975");
    const red = new Color("#d46c64");
    const neutral = new Color("#d7e5dd");
    const size = TERRAIN.scale.horizontal / 2;
    const { xMin, xMax, zMin, zMax } = TERRAIN.bounds;
    const segment = (ax: number, az: number, bx: number, bz: number, color: Color) => {
      positions.push(ax, TERRAIN.height(ax, az) + 0.07, az, bx, TERRAIN.height(bx, bz) + 0.07, bz);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    };
    for (let x = xMin; x + size <= xMax; x += size) {
      for (let z = zMin; z + size <= zMax; z += size) {
        const at = { x: x + size / 2, z: z + size / 2 };
        let valid: boolean | null = null;
        if (active && kind === "lift" && (step === "top" || top)) {
          valid = checkPlacement(state, type, step === "bottom" && top
            ? { bottom: at, top }
            : { bottom: bottom ?? TERRAIN.base, top: at }).ok;
        } else if (active && kind === "asset" && asset) valid = checkAssetPlacement(state, asset, at).ok;
        else if (active && kind === "gun") valid = checkGunPlacement(state, at).ok;
        const color = valid === null ? neutral : valid ? green : red;
        segment(x, z, x + size, z, color);
        segment(x, z, x, z + size, color);
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setAttribute("color", new Float32BufferAttribute(colors, 3));
    return result;
    // The rules depend on these fields, not the clock or moving guests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, showBuildGrid, kind, type, asset, bottom, top, step, placementKey]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  return geometry ? (
    <lineSegments geometry={geometry} renderOrder={1}>
      <lineBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} toneMapped={false} />
    </lineSegments>
  ) : null;
}
