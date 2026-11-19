"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LODGE_FOOTPRINT, type AssetId, type LodgeTier, type PlacedAsset } from "@/game/base";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import { requestLodge, usePlacementDraft } from "@/ui/placementDraft";
import { useReducedMotion } from "./useReducedMotion";
import { pathSampler } from "./trail";
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
import { HOUSES, LODGE, ROAD_Z, SNOWCAT_POS } from "./layout";

/** Lamp posts along the road and around the base, with soft light pools. */
const LAMPS: [number, number][] = [
  [-7.2, ROAD_Z - 3.3],
  [6.0, ROAD_Z - 3.3],
  [18.0, ROAD_Z - 3.3],
  [30.0, ROAD_Z - 3.3],
  [6.9, LODGE.z + 2.1],
  [18.3, LODGE.z + 0.9],
];
const LODGE_GROUND = TERRAIN.height(LODGE.x, LODGE.z);
const TIMBER = "#704133";
const TRIM = "#e6d8be";
const ASSET_MODELS: Partial<Record<AssetId, KitAsset>> = {
  cafe: "cafe",
  shop: "ski-shop",
  warming_hut: "warming-hut",
  rentals: "ski-shop",
  ski_school: "warming-hut",
};

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

function villagePlacements(assets: readonly PlacedAsset[], tier: LodgeTier): Placement[] {
  const B = METERS_TO_WORLD;
  const P = METERS_TO_WORLD * LIFT_TOY_SCALE;
  const list: Placement[] = [
    { name: "base-lodge", x: LODGE.x, z: LODGE.z + 0.05, yaw: 0, scale: B * [1, 1.17, 1.31][tier - 1] },
    ...HOUSES.map((h) => ({ name: "clapboard-house" as const, ...h, scale: B })),
    ...LAMPS.map(([x, z]) => ({ name: "lamp-post" as const, x, z, yaw: 0, scale: P })),
  ];
  for (const asset of assets) {
    const name = ASSET_MODELS[asset.id];
    if (!name) continue;
    const attached = asset.attachPad !== undefined;
    list.push({
      name: attached ? "warming-hut" : name,
      ...asset.at,
      yaw: (asset.attachPad ?? -1) >= 4 ? Math.PI : 0,
      scale: B * (attached ? 1.15 : 1.05),
    });
  }
  return list;
}

function lodgeDetails(tier: LodgeTier, construction: boolean): Part[] {
  const parts: Part[] = [];
  if (tier >= 2) {
    parts.push(
      { geo: box(1.21, 0.12, 0.33), pos: [0, 0.07, 0.60], color: TIMBER },
      { geo: box(0.8, 0.13, 0.04), pos: [0, 0.49, 0.56], color: TRIM },
    );
    for (const x of [-0.52, -0.23, 0.23, 0.52]) {
      parts.push({ geo: box(0.038, 0.21, 0.038), pos: [x, 0.23, 0.74], color: TRIM });
    }
  }
  if (tier === 3) {
    for (const x of [-0.65, 0.65]) {
      parts.push(
        { geo: box(0.023, 0.55, 0.023), pos: [x, 0.34, 0.78], color: TRIM },
        { geo: box(0.025, 0.20, 0.21), pos: [x, 0.51, 0.88], color: "#9d3627" },
      );
    }
  }
  if (construction) {
    const color = "#ce9a4b";
    for (const x of [-0.74, 0.74]) {
      for (const z of [-0.36, 0.10, 0.61]) {
        parts.push({ geo: box(0.036, 1.10, 0.036), pos: [x, 0.53, z], color });
      }
      for (const y of [0.25, 0.63, 1]) {
        parts.push({ geo: box(0.11, 0.035, 1.02), pos: [x, y, 0.12], color });
      }
    }
    for (const y of [0.25, 0.63, 1]) {
      parts.push({ geo: box(1.52, 0.043, 0.048), pos: [0, y, 0.61], color });
    }
    for (const x of [-0.39, 0.39]) {
      parts.push({ geo: box(0.035, 0.55, 0.035), pos: [x, 0.45, 0.64], rot: [0, 0, x], color });
    }
  }
  return placeParts(parts, LODGE.x, LODGE_GROUND, LODGE.z);
}

function venueDetails(assets: readonly PlacedAsset[]): Part[] {
  const parts: Part[] = [];
  for (const asset of assets) {
    const { id, at, attachPad } = asset;
    const ground = TERRAIN.height(at.x, at.z);
    if (attachPad !== undefined) {
      const dx = at.x - LODGE.x;
      const dz = at.z - LODGE.z;
      const t = 0.66;
      parts.push({
        geo: box(0.28, 0.22, Math.hypot(dx, dz) * 0.6),
        pos: [LODGE.x + dx * t, ground + 0.12, LODGE.z + dz * t],
        rot: [0, Math.atan2(dx, dz), 0],
        color: TIMBER,
      });
    }
    if (id === "rentals" || id === "ski_school" || attachPad !== undefined) {
      const color = id === "rentals" ? "#286889" : id === "ski_school" ? "#cd861d"
        : id === "cafe" ? "#713c2e" : id === "shop" ? "#31594c" : TIMBER;
      const front = attachPad !== undefined && attachPad >= 4 ? -0.23 : 0.34;
      parts.push(
        { geo: box(0.19, 0.12, 0.025), pos: [at.x, ground + 0.22, at.z + front], color },
        { geo: box(0.12, 0.025, 0.034), pos: [at.x, ground + 0.232, at.z + front], color: TRIM },
      );
    }
  }
  return parts;
}

/** The base kits and new additions share batched body and window geometry. */
export function Village() {
  const assets = useGameStore((s) => s.assets);
  const tier = useGameStore((s) => s.lodgeTier);
  const construction = useGameStore((s) => s.lodgeUpgrade !== null);

  const lodgeKit = useKit("base-lodge");
  const houseKit = useKit("clapboard-house");
  const cafeKit = useKit("cafe");
  const shopKit = useKit("ski-shop");
  const hutKit = useKit("warming-hut");
  const catKit = useKit("snowcat");
  const cat = bakeKit(catKit);
  const catRef = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const trail = useGameStore(s => s.phase === "night" && s.dayIndex < s.seasonLength && s.pendingSnow !== "minimal"
    ? s.trails.find(run => run.open && !run.glade && run.path.length > 1)?.path : undefined);
  const groom = useMemo(() => trail && pathSampler(trail), [trail]);
  const lampKit = useKit("lamp-post");

  const { body, glow } = useMemo(() => {
    const scenes: Partial<Record<KitAsset, THREE.Object3D>> = {
      "base-lodge": lodgeKit,
      "clapboard-house": houseKit,
      cafe: cafeKit,
      "ski-shop": shopKit,
      "warming-hut": hutKit,
      "lamp-post": lampKit,
    };
    const bodies: THREE.BufferGeometry[] = [];
    const glows: THREE.BufferGeometry[] = [];
    for (const p of villagePlacements(assets, tier)) {
      const scene = scenes[p.name];
      if (!scene) continue;
      const kit = bakeKit(scene);
      const y = TERRAIN.height(p.x, p.z) - 0.02;
      bodies.push(placeKit(kit.body, p.x, y, p.z, p.yaw, p.scale));
      if (kit.glow) glows.push(placeKit(kit.glow, p.x, y, p.z, p.yaw, p.scale));
    }
    const additions = [...lodgeDetails(tier, construction), ...venueDetails(assets)];
    if (additions.length > 0) bodies.push(merge(additions));

    return { body: mergePlaced(bodies), glow: mergePlaced(glows) };
  }, [assets, tier, construction, lodgeKit, houseKit, cafeKit, shopKit, hutKit, lampKit]);

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
      d.position.set(x, TERRAIN.height(x, z) + 0.035, z);
      d.rotation.set(-Math.PI / 2, 0, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    // Lodge porch pool.
    d.position.set(LODGE.x, TERRAIN.height(LODGE.x, LODGE.z + 0.9) + 0.035, LODGE.z + 0.95);
    d.scale.set(1.8, 1.2, 1);
    d.updateMatrix();
    m.setMatrixAt(LAMPS.length, d.matrix);
    m.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    if (catRef.current) {
      const cat = catRef.current;
      if (groom) {
        const cycle = reduced.current ? 0.55 : (clock.elapsedTime / 90) % 2;
        const t = cycle <= 1 ? cycle : 2 - cycle;
        const p = groom(t);
        const next = groom(Math.max(0, Math.min(1, t + (cycle < 1 ? 0.008 : -0.008))));
        cat.position.set(p.x, p.y, p.z);
        cat.rotation.y = Math.atan2(next.x - p.x, next.z - p.z);
      } else {
        cat.position.set(SNOWCAT_POS.x, TERRAIN.height(SNOWCAT_POS.x, SNOWCAT_POS.z) - 0.02, SNOWCAT_POS.z);
        cat.rotation.y = SNOWCAT_POS.yaw;
      }
    }
    const k = Math.max(sceneMood.night, sceneMood.dusk * 0.6);
    if (glowMat.current) glowMat.current.color.setScalar(GLOW_DAY + (GLOW_NIGHT - GLOW_DAY) * k);
    if (poolMat.current) poolMat.current.opacity = 0.05 + k * 0.75;
  });

  return (
    <group>
      <group name="snowcat" ref={catRef} scale={METERS_TO_WORLD * 1.25} dispose={null}>
        <mesh geometry={cat.body} castShadow><meshLambertMaterial vertexColors /></mesh>
        {cat.glow && <mesh geometry={cat.glow}><meshBasicMaterial vertexColors toneMapped={false} /></mesh>}
      </group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshLambertMaterial vertexColors />
      </mesh>
      <mesh geometry={glow}>
        <meshBasicMaterial ref={glowMat} vertexColors toneMapped={false} />
      </mesh>
      <mesh
        position={[LODGE.x, LODGE_GROUND + 0.61, LODGE.z]}
        onClick={(event) => {
          if (event.delta > 5 || usePlacementDraft.getState().active) return;
          event.stopPropagation();
          requestLodge();
        }}
      >
        <boxGeometry args={[LODGE_FOOTPRINT.width, 1.28, LODGE_FOOTPRINT.depth]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
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
