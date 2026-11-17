"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneMood } from "./Atmosphere";
import { box, merge, placeParts, type Part } from "./geo";
import {
  bakeKit,
  GLOW_DAY,
  GLOW_NIGHT,
  type KitAsset,
  LIFT_TOY_SCALE,
  METERS_TO_WORLD,
  mergePlaced,
  placeKit,
  useKit,
} from "./kit";
import {
  CAFE_POS,
  HOUSES,
  LODGE,
  ROAD_Z,
  SHOP_POS,
  SNOWCAT_POS,
  WARMING_HUT_POS,
} from "./layout";
import { PALETTE } from "./palette";
import { terrainHeight } from "./terrainShape";

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

type Placement = { name: KitAsset; x: number; z: number; yaw: number; scale: number };

/** Kit buildings and props for the current purchases, in world placements. */
function villagePlacements(owned: { cafe: boolean; shop: boolean; hut: boolean }): Placement[] {
  const B = METERS_TO_WORLD;
  const P = METERS_TO_WORLD * LIFT_TOY_SCALE;
  const list: Placement[] = [
    { name: "base-lodge", x: LODGE.x, z: LODGE.z + 0.05, yaw: 0, scale: B },
    ...HOUSES.map((h) => ({ name: "clapboard-house" as const, ...h, scale: B })),
    { name: "snowcat", ...SNOWCAT_POS, scale: B * 1.25 },
    ...LAMPS.map(([x, z]) => ({ name: "lamp-post" as const, x, z, yaw: 0, scale: P })),
  ];
  if (owned.cafe) list.push({ name: "cafe", ...CAFE_POS, yaw: -0.15, scale: B * 1.05 });
  if (owned.shop) list.push({ name: "ski-shop", ...SHOP_POS, yaw: -0.35, scale: B * 1.05 });
  if (owned.hut) list.push({ name: "warming-hut", ...WARMING_HUT_POS, yaw: 0.35, scale: B * 1.1 });
  return list;
}

/**
 * Base village: kit lodge, houses, optional café / shop / warming hut, snowcat,
 * lamp posts and procedural cars. Bodies merge into one mesh; window and lamp
 * glass share an untonemapped glow material so the amber stays warm at night.
 */
export function Village({ buildings }: { buildings: string[] }) {
  const hasCafe = buildings.includes("cafe");
  const hasShop = buildings.includes("shop");
  const hasHut = buildings.includes("warming_hut");

  const lodgeKit = useKit("base-lodge");
  const houseKit = useKit("clapboard-house");
  const cafeKit = useKit("cafe");
  const shopKit = useKit("ski-shop");
  const hutKit = useKit("warming-hut");
  const catKit = useKit("snowcat");
  const lampKit = useKit("lamp-post");

  const { body, glow } = useMemo(() => {
    const scenes: Partial<Record<KitAsset, THREE.Object3D>> = {
      "base-lodge": lodgeKit,
      "clapboard-house": houseKit,
      cafe: cafeKit,
      "ski-shop": shopKit,
      "warming-hut": hutKit,
      snowcat: catKit,
      "lamp-post": lampKit,
    };
    const bodies: THREE.BufferGeometry[] = [];
    const glows: THREE.BufferGeometry[] = [];
    for (const p of villagePlacements({ cafe: hasCafe, shop: hasShop, hut: hasHut })) {
      const scene = scenes[p.name];
      if (!scene) continue;
      const kit = bakeKit(scene);
      const y = terrainHeight(p.x, p.z) - 0.02;
      bodies.push(placeKit(kit.body, p.x, y, p.z, p.yaw, p.scale));
      if (kit.glow) glows.push(placeKit(kit.glow, p.x, y, p.z, p.yaw, p.scale));
    }

    const carParts: Part[] = [];
    const cars = ["#2f7de1", "#a8382b", "#e8e4dc", "#3f6b4a"];
    cars.forEach((c, i) => {
      const x = 2.9 + i * 0.32;
      const z = 3.62;
      carParts.push(...placeParts(car(c), x, terrainHeight(x, z), z, Math.PI / 2 + 0.06 * i));
    });
    bodies.push(merge(carParts));
    return { body: mergePlaced(bodies), glow: mergePlaced(glows) };
  }, [hasCafe, hasShop, hasHut, lodgeKit, houseKit, cafeKit, shopKit, hutKit, catKit, lampKit]);

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
    if (glowMat.current) glowMat.current.color.setScalar(GLOW_DAY + (GLOW_NIGHT - GLOW_DAY) * k);
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
