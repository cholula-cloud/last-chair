"use client";

import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { TERRAIN } from "@/game/terrain";
import { classifyPitch, realGradeFactor } from "@/game/trails";

const colors = {
  green: new Color("#37845b"),
  blue: new Color("#2275c9"),
  black: new Color("#292939"),
};

/** The color describes the fall line. A route can cross it at a gentler angle. */
export function SlopeGrid() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const tints: number[] = [];
    const step = TERRAIN.scale.horizontal / 3;
    const factor = realGradeFactor();
    const { xMin, xMax, zMin, zMax } = TERRAIN.bounds;
    const segment = (x: number, z: number, endX: number, endZ: number) => {
      const grade = TERRAIN.grade((x + endX) / 2, (z + endZ) / 2) * factor;
      const color = colors[classifyPitch(grade)];
      positions.push(x, TERRAIN.height(x, z) + 0.1, z, endX, TERRAIN.height(endX, endZ) + 0.1, endZ);
      tints.push(color.r, color.g, color.b, color.r, color.g, color.b);
    };
    for (let x = xMin; x <= xMax; x += step) {
      for (let z = zMin; z <= zMax; z += step) {
        if (x + step <= xMax) segment(x, z, x + step, z);
        if (z + step <= zMax) segment(x, z, x, z + step);
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setAttribute("color", new Float32BufferAttribute(tints, 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry} renderOrder={1}>
      <lineBasicMaterial vertexColors transparent opacity={0.5} depthWrite={false} toneMapped={false} />
    </lineSegments>
  );
}
