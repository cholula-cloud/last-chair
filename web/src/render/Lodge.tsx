"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneMood } from "./Atmosphere";
import { box, cyl, gable, merge, pitchedRoof, placeParts, type Part } from "./geo";
import { CAFE_POS, LODGE, ROAD_Z, SHOP_POS } from "./layout";
import { PALETTE } from "./palette";
import { terrainHeight } from "./terrainShape";

type Building = { body: Part[]; windows: Part[] };

/** New England base lodge: barn-red clapboard, steep snowy gable, chimney, deck. */
function lodge(): Building {
  const W = 1.4; // along X (ridge)
  const D = 0.95;
  const H = 0.62;
  const R = 0.62; // roof rise
  const trim = PALETTE.clapboard;
  const body: Part[] = [
    { geo: box(W + 0.06, 0.1, D + 0.06), color: PALETTE.stone, pos: [0, 0.03, 0] },
    { geo: box(W, H, D), color: PALETTE.barnRed, pos: [0, 0.05 + H / 2, 0] },
    // Corner boards.
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map(
        (sz): Part => ({
          geo: box(0.05, H, 0.05),
          color: trim,
          pos: [(sx * W) / 2, 0.05 + H / 2, (sz * D) / 2],
        }),
      ),
    ),
    // Gable ends.
    ...[-1, 1].map(
      (sx): Part => ({
        geo: gable(D, R, 0.02),
        color: PALETTE.barnRed,
        pos: [(sx * (W - 0.02)) / 2, 0.05 + H, 0],
        rot: [0, Math.PI / 2, 0],
      }),
    ),
    ...pitchedRoof({
      width: D,
      length: W,
      rise: R,
      y: 0.05 + H,
      roof: PALETTE.roofSlate,
      snow: PALETTE.snow,
    }),
    // Ridge snow bead.
    { geo: box(W + 0.1, 0.07, 0.1), color: PALETTE.snow, pos: [0, 0.05 + H + R + 0.04, 0] },
    // Stone chimney.
    { geo: box(0.16, 0.6, 0.16), color: PALETTE.stone, pos: [0.42, 0.05 + H + R * 0.55 + 0.1, -0.18] },
    { geo: box(0.2, 0.05, 0.2), color: PALETTE.snow, pos: [0.42, 0.05 + H + R * 0.55 + 0.42, -0.18] },
    // Front deck with posts and rail (faces the road).
    { geo: box(W + 0.2, 0.05, 0.42), color: PALETTE.deckWood, pos: [0, 0.16, D / 2 + 0.21] },
    { geo: box(W + 0.2, 0.025, 0.4), color: PALETTE.snow, pos: [0, 0.195, D / 2 + 0.21] },
    { geo: box(W + 0.2, 0.03, 0.03), color: trim, pos: [0, 0.38, D / 2 + 0.41] },
    ...[-0.8, -0.27, 0.27, 0.8].map(
      (x): Part => ({ geo: box(0.03, 0.22, 0.03), color: trim, pos: [x, 0.27, D / 2 + 0.41] }),
    ),
    // Door.
    { geo: box(0.2, 0.36, 0.02), color: PALETTE.doorWood, pos: [-0.12, 0.05 + 0.2, D / 2 + 0.01] },
    // Shutters beside front windows.
    ...[-0.52, 0.32].flatMap((x) =>
      [-1, 1].map(
        (s): Part => ({
          geo: box(0.07, 0.24, 0.02),
          color: PALETTE.shutter,
          pos: [x + s * 0.15, 0.4, D / 2 + 0.012],
        }),
      ),
    ),
    // Sign board over the deck.
    { geo: box(0.7, 0.14, 0.03), color: PALETTE.clapboard, pos: [0.1, 0.05 + H + 0.02, D / 2 + 0.06] },
    { geo: box(0.6, 0.05, 0.035), color: PALETTE.barnRed, pos: [0.1, 0.05 + H + 0.02, D / 2 + 0.065] },
  ];
  const windows: Part[] = [
    ...[-0.52, 0.32].map((x): Part => ({ geo: box(0.2, 0.22, 0.02), color: PALETTE.white, pos: [x, 0.4, D / 2 + 0.008] })),
    ...[-0.4, 0.05, 0.45].map((x): Part => ({ geo: box(0.2, 0.22, 0.02), color: PALETTE.white, pos: [x, 0.4, -D / 2 - 0.008] })),
    ...[-1, 1].map((sx): Part => ({ geo: box(0.02, 0.2, 0.16), color: PALETTE.white, pos: [(sx * W) / 2 + sx * 0.008, 0.82, 0] })),
  ];
  return { body, windows };
}

function cafe(): Building {
  const W = 0.78;
  const D = 0.6;
  const H = 0.46;
  return {
    body: [
      { geo: box(W, H, D), color: PALETTE.clapboard, pos: [0, H / 2, 0] },
      ...[-1, 1].map(
        (sx): Part => ({
          geo: gable(D, 0.36, 0.02),
          color: PALETTE.clapboard,
          pos: [(sx * (W - 0.02)) / 2, H, 0],
          rot: [0, Math.PI / 2, 0],
        }),
      ),
      ...pitchedRoof({ width: D, length: W, rise: 0.36, y: H, roof: PALETTE.cafeRoof, snow: PALETTE.snow }),
      // Striped awning.
      ...[0, 1, 2, 3, 4].map(
        (i): Part => ({
          geo: box(0.13, 0.03, 0.22),
          color: i % 2 ? PALETTE.clapboard : PALETTE.amber,
          pos: [-0.26 + i * 0.13, 0.36, D / 2 + 0.1],
          rot: [0.35, 0, 0],
        }),
      ),
      { geo: box(0.16, 0.3, 0.02), color: PALETTE.doorWood, pos: [0.24, 0.15, D / 2 + 0.01] },
      // Stovepipe.
      { geo: cyl(0.035, 0.035, 0.3, 6), color: PALETTE.ink, pos: [-0.22, H + 0.32, -0.12] },
    ],
    windows: [
      { geo: box(0.3, 0.18, 0.02), color: PALETTE.white, pos: [-0.12, 0.24, D / 2 + 0.008] },
      { geo: box(0.02, 0.16, 0.2), color: PALETTE.white, pos: [W / 2 + 0.008, 0.26, 0] },
    ],
  };
}

function shop(): Building {
  const W = 0.62;
  const D = 0.5;
  const H = 0.42;
  return {
    body: [
      { geo: box(W, H, D), color: PALETTE.shopBlue, pos: [0, H / 2, 0] },
      ...[-1, 1].map(
        (sx): Part => ({
          geo: gable(D, 0.3, 0.02),
          color: PALETTE.shopBlue,
          pos: [(sx * (W - 0.02)) / 2, H, 0],
          rot: [0, Math.PI / 2, 0],
        }),
      ),
      ...pitchedRoof({ width: D, length: W, rise: 0.3, y: H, roof: PALETTE.roofSlate, snow: PALETTE.snow }),
      { geo: box(0.46, 0.1, 0.03), color: PALETTE.amber, pos: [0, H + 0.02, D / 2 + 0.03] },
      { geo: box(0.15, 0.28, 0.02), color: PALETTE.clapboard, pos: [-0.18, 0.14, D / 2 + 0.01] },
      // Ski rack with skis.
      { geo: box(0.3, 0.02, 0.04), color: PALETTE.doorWood, pos: [0.12, 0.2, D / 2 + 0.12] },
      ...[0, 1, 2, 3].map(
        (i): Part => ({
          geo: box(0.02, 0.32, 0.015),
          color: ["#d7263d", "#f2c014", "#0fa3a3", "#7b4fc9"][i],
          pos: [0.0 + i * 0.07, 0.16, D / 2 + 0.13],
          rot: [-0.15, 0, 0],
        }),
      ),
    ],
    windows: [{ geo: box(0.2, 0.16, 0.02), color: PALETTE.white, pos: [0.12, 0.25, D / 2 + 0.008] }],
  };
}

function car(color: string): Part[] {
  return [
    { geo: box(0.36, 0.1, 0.18), color, pos: [0, 0.08, 0] },
    { geo: box(0.2, 0.08, 0.16), color: "#cfd8e3", pos: [-0.02, 0.17, 0] },
    { geo: box(0.21, 0.025, 0.17), color: PALETTE.snow, pos: [-0.02, 0.22, 0] },
  ];
}

/** Lamp posts along the road and around the base, with soft light pools. */
const LAMPS: [number, number][] = [
  [-1.2, ROAD_Z - 0.55],
  [1.0, ROAD_Z - 0.55],
  [3.0, ROAD_Z - 0.55],
  [5.0, ROAD_Z - 0.55],
  [1.15, 2.9],
  [3.05, 2.3],
];

/** Soft amber radial gradient used for the lamp light pools. */
function lightPoolTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,190,110,1)");
  g.addColorStop(0.5, "rgba(255,170,90,0.35)");
  g.addColorStop(1, "rgba(255,160,80,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const WINDOW_DAY = new THREE.Color("#d9a35a");
const WINDOW_NIGHT = new THREE.Color(PALETTE.window).multiplyScalar(1.6);

/**
 * Base village: lodge, optional café and shop, cars, lamp posts. Static
 * bodies merge into one mesh; windows and lamp heads share a glow material.
 */
export function Village({ buildings }: { buildings: string[] }) {
  const hasCafe = buildings.includes("cafe");
  const hasShop = buildings.includes("shop");

  const { body, glow } = useMemo(() => {
    const bodyParts: Part[] = [];
    const glowParts: Part[] = [];
    const add = (b: Building, x: number, z: number, yaw = 0) => {
      const y = terrainHeight(x, z) - 0.02;
      bodyParts.push(...placeParts(b.body, x, y, z, yaw));
      glowParts.push(...placeParts(b.windows, x, y, z, yaw));
    };
    add(lodge(), LODGE.x, LODGE.z + 0.05);
    if (hasCafe) add(cafe(), CAFE_POS.x, CAFE_POS.z, -0.15);
    if (hasShop) add(shop(), SHOP_POS.x, SHOP_POS.z, -0.35);

    const cars = ["#2f7de1", "#a8382b", "#e8e4dc", "#3f6b4a"];
    cars.forEach((c, i) => {
      const x = 2.9 + i * 0.32;
      const z = 3.62;
      bodyParts.push(...placeParts(car(c), x, terrainHeight(x, z), z, Math.PI / 2 + 0.06 * i));
    });

    for (const [x, z] of LAMPS) {
      const y = terrainHeight(x, z);
      bodyParts.push(
        { geo: cyl(0.018, 0.025, 0.55, 5), color: "#1e252e", pos: [x, y + 0.275, z] },
        { geo: box(0.09, 0.02, 0.09), color: PALETTE.snow, pos: [x, y + 0.62, z] },
      );
      glowParts.push({ geo: box(0.06, 0.07, 0.06), color: PALETTE.white, pos: [x, y + 0.57, z] });
    }
    return { body: merge(bodyParts), glow: merge(glowParts) };
  }, [hasCafe, hasShop]);

  useEffect(
    () => () => {
      body.dispose();
      glow.dispose();
    },
    [body, glow],
  );

  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const poolMat = useRef<THREE.MeshBasicMaterial>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => lightPoolTexture(), []);
  useEffect(() => () => tex?.dispose(), [tex]);

  useEffect(() => {
    const m = pools.current;
    if (!m) return;
    const d = new THREE.Object3D();
    LAMPS.forEach(([x, z], i) => {
      d.position.set(x, terrainHeight(x, z) + 0.035, z);
      d.rotation.set(-Math.PI / 2, 0, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    // Lodge porch pool.
    d.position.set(LODGE.x, terrainHeight(LODGE.x, LODGE.z + 0.9) + 0.035, LODGE.z + 0.95);
    d.scale.set(1.8, 1.2, 1);
    d.updateMatrix();
    m.setMatrixAt(LAMPS.length, d.matrix);
    m.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const k = Math.max(sceneMood.night, sceneMood.dusk * 0.6);
    if (glowMat.current) glowMat.current.color.copy(WINDOW_DAY).lerp(WINDOW_NIGHT, k);
    if (poolMat.current) poolMat.current.opacity = 0.05 + k * 0.75;
  });

  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={glow}>
        <meshBasicMaterial ref={glowMat} vertexColors toneMapped={false} />
      </mesh>
      <instancedMesh ref={pools} args={[undefined, undefined, LAMPS.length + 1]} renderOrder={3}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial
          ref={poolMat}
          map={tex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
