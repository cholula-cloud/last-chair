"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { liftLineOf } from "@/game/rules";
import { box, cyl, merge, placeParts, sphere, type Part } from "./geo";
import { LIFT_BASE, SITE } from "./layout";
import { mountainTheme } from "./mountainThemes";
import { PALETTE } from "./palette";
import { OVERLAY_DIM } from "./terrainOverlay";
import { hash01 } from "./forest";

function makeArchSignTexture(title: string, subtitle: string): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#1b3a57";
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = "#f4ebd4";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 492, 140);

  ctx.fillStyle = "#f8fbff";
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 256, 62);

  ctx.fillStyle = "#ffc93c";
  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillText(subtitle, 256, 114);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeOrchardSignTexture(owned: boolean, whiterock: boolean): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = whiterock ? "#1d4ed8" : owned ? "#0b6b3a" : "#f4ebd4";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#1b3a57";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 240, 112);
  ctx.fillStyle = whiterock || owned ? "#ffffff" : "#1b3a57";
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(whiterock ? "WHITEROCK" : owned ? "TOWN ORCHARD" : "ORCHARD LOT", 128, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Welcome arch over the arrival path, lift-line safety-orange snow fencing,
 * steep-face rock outcrops, and Maple Valley's eastern orchard grove.
 */
export function DioramaLandmarks({ lowDetail = false }: { lowDetail?: boolean }) {
  const mountainId = useGameStore((s) => s.mountainId);
  const lifts = useGameStore((s) => s.lifts);
  const orchardParcel = useGameStore((s) => s.orchardParcel);
  const theme = useMemo(() => mountainTheme(mountainId), [mountainId]);

  const archX = SITE.arrival.center.x;
  const archZ = 22.85;
  const archY = TERRAIN.height(archX, archZ);

  // Single merged static geometry for Welcome Arch timber/stone, snow fencing, and rock outcrops (1 draw call).
  const staticGeo = useMemo(() => {
    const parts: Part[] = [
      ...placeParts(
        [
          { geo: cyl(0.05, 0.06, 0.72, 6), color: PALETTE.bark, pos: [-0.42, 0.34, 0] },
          { geo: cyl(0.05, 0.06, 0.72, 6), color: PALETTE.bark, pos: [0.42, 0.34, 0] },
          { geo: box(0.16, 0.12, 0.16), color: PALETTE.stone, pos: [-0.42, 0.04, 0] },
          { geo: box(0.16, 0.12, 0.16), color: PALETTE.stone, pos: [0.42, 0.04, 0] },
          { geo: box(1.04, 0.08, 0.1), color: PALETTE.deckWood, pos: [0, 0.71, 0] },
          { geo: box(1.1, 0.05, 0.14), color: PALETTE.snow, pos: [0, 0.77, 0] },
        ],
        archX,
        archY - 0.02,
        archZ,
        0,
      ),
    ];

    const confirmed = lifts.filter((l) => l.confirmed);
    const primary = confirmed[0] ? liftLineOf(confirmed[0]).bottom : LIFT_BASE;
    const addFenceRun = (x0: number, z0: number, x1: number, z1: number, posts: number) => {
      for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const x = x0 + (x1 - x0) * t;
        const z = z0 + (z1 - z0) * t;
        const y = TERRAIN.height(x, z);
        parts.push({ geo: box(0.028, 0.18, 0.028), color: PALETTE.bark, pos: [x, y + 0.08, z] });
      }
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const len = Math.hypot(x1 - x0, z1 - z0);
      const yaw = Math.atan2(x1 - x0, z1 - z0);
      const cy = TERRAIN.height(cx, cz);
      parts.push(
        ...placeParts(
          [{ geo: box(0.015, 0.1, len), color: PALETTE.amber, pos: [0, 0.09, 0] }],
          cx,
          cy,
          cz,
          yaw,
        ),
      );
    };
    addFenceRun(primary.x - 0.68, primary.z + 0.18, primary.x - 0.68, primary.z + 1.45, 4);
    addFenceRun(primary.x + 0.35, primary.z + 0.38, primary.x + 0.35, primary.z + 1.35, 3);
    addFenceRun(4.35, 19.2, 6.1, 19.2, 4);
    addFenceRun(8.2, 19.2, 9.95, 19.2, 4);

    const maxRocks = lowDetail ? 16 : 36;
    const baseRock = new THREE.DodecahedronGeometry(0.24, 0);
    let rockCount = 0;
    for (let gx = -9; gx <= 9 && rockCount < maxRocks; gx += 1.4) {
      for (let gz = -7; gz <= 2 && rockCount < maxRocks; gz += 1.4) {
        const jx = gx + (hash01(gx * 10, gz * 10, 1) - 0.5) * 0.9;
        const jz = gz + (hash01(gx * 10, gz * 10, 2) - 0.5) * 0.9;
        const grade = TERRAIN.grade(jx, jz);
        if (grade > theme.rockThreshold && hash01(gx * 10, gz * 10, 5) < 0.46) {
          const s = 0.7 + hash01(gx * 10, gz * 10, 11) * 0.85;
          parts.push({
            geo: baseRock,
            color: theme.rock,
            pos: [jx, TERRAIN.height(jx, jz) - 0.03, jz],
            rot: [0.12, hash01(gx * 10, gz * 10, 9) * Math.PI * 2, -0.08],
            scale: [1.35 * s, 0.72 * s, 1.1 * s],
          });
          rockCount++;
        }
      }
    }
    baseRock.dispose();
    return merge(parts);
  }, [archX, archY, archZ, lifts, lowDetail, theme.rock, theme.rockThreshold]);

  // Maple Valley orchard apple-tree grove east of the parking lot.
  const orchardGeo = useMemo(() => {
    if (mountainId !== "maple_valley") return null;
    const parts: Part[] = [];
    const xs = [11.6, 13.0, 14.4];
    const zs = [24.8, 26.2, 27.6];
    for (const x of xs) {
      for (const z of zs) {
        const y = TERRAIN.height(x, z);
        parts.push(
          ...placeParts(
            [
              { geo: cyl(0.025, 0.04, 0.24, 6), color: PALETTE.bark, pos: [0, 0.12, 0] },
              { geo: sphere(0.18, 7, 5), color: "#7d5438", pos: [0, 0.3, 0], scale: [1.15, 0.82, 1.15] },
              { geo: sphere(0.15, 7, 4), color: PALETTE.snow, pos: [0, 0.36, 0], scale: [1.05, 0.52, 1.05] },
            ],
            x,
            y - 0.02,
            z,
            0,
          ),
        );
      }
    }
    return merge(parts);
  }, [mountainId]);

  const archTex = useMemo(() => makeArchSignTexture(theme.archTitle, theme.archSubtitle), [theme.archTitle, theme.archSubtitle]);
  const orchardTex = useMemo(
    () => (mountainId === "maple_valley" ? makeOrchardSignTexture(orchardParcel === "owned", orchardParcel === "whiterock") : null),
    [mountainId, orchardParcel],
  );

  useEffect(
    () => () => {
      staticGeo.dispose();
      orchardGeo?.dispose();
      archTex?.dispose();
      orchardTex?.dispose();
    },
    [staticGeo, orchardGeo, archTex, orchardTex],
  );

  return (
    <group name="diorama-landmarks">
      {/* Merged Welcome Arch, Snow Fencing, and Rock Outcrops */}
      <mesh geometry={staticGeo} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.85} metalness={0.04} {...OVERLAY_DIM} />
      </mesh>
      {archTex && (
        <mesh position={[archX, archY + 0.55, archZ + 0.055]}>
          <planeGeometry args={[0.74, 0.22]} />
          <meshStandardMaterial map={archTex} roughness={0.65} {...OVERLAY_DIM} />
        </mesh>
      )}

      {/* Maple Valley Orchard Grove */}
      {orchardGeo && (
        <group>
          <mesh geometry={orchardGeo} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.86} metalness={0.02} {...OVERLAY_DIM} />
          </mesh>
          {orchardTex && (
            <group position={[11.1, TERRAIN.height(11.1, 25.4), 25.4]}>
              <mesh position={[0, 0.14, 0]}>
                <boxGeometry args={[0.04, 0.28, 0.04]} />
                <meshStandardMaterial color={PALETTE.bark} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.26, 0.03]}>
                <planeGeometry args={[0.36, 0.18]} />
                <meshStandardMaterial map={orchardTex} roughness={0.65} />
              </mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
}
