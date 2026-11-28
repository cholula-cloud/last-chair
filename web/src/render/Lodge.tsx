"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { type AssetId, type LodgeTier, type PlacedAsset } from "@/game/base";
import { hasMaintenanceGarage } from "@/game/base";
import { groomCoverage } from "@/game/guns";
import { useGameStore } from "@/game/store";
import { TERRAIN } from "@/game/terrain";
import type { AssetMarker } from "./assetPick";
import { useReducedMotion } from "./useReducedMotion";
import { pathSampler } from "./trail";
import { sceneMood } from "./Atmosphere";
import { box, merge, placeParts, type Part } from "./geo";
import { kitForAsset } from "./activityKits";
import { resolveLodgeCoreKit, resolveStyledKit, resolveVenueKit } from "@/game/styles";
import {
  bakeKit,
  type KitAsset,
  LIFT_TOY_SCALE,
  METERS_TO_WORLD,
  mergePlaced,
  placeKit,
  useKit,
} from "./kit";
import { useVillageKitScenes, type VillageKitName } from "./useVillageKits";
import { footpathLampPosts } from "./footpathSurface";
import { HOUSES, LODGE, ROAD_Z, SITE, SNOWCAT_POS } from "./layout";
import { OVERLAY_DIM } from "./terrainOverlay";

/** Route 100 edge lights plus evenly spaced posts along the lot→lodge walk. */
function baseLampPosts(): [number, number][] {
  const z = ROAD_Z - 3.3;
  const { xFrom, xTo } = SITE.road;
  const span = xTo - xFrom;
  const roadXs = [0.12, 0.38, 0.64, 0.88].map((f) => xFrom + span * f);
  return [
    ...roadXs.map((x) => [x, z] as [number, number]),
    ...footpathLampPosts(SITE).map((p) => [p.x, p.z] as [number, number]),
  ];
}
const LODGE_GROUND = TERRAIN.height(LODGE.x, LODGE.z);
const TIMBER = "#704133";
const TRIM = "#e6d8be";
const ASSET_MODELS: Partial<Record<AssetId, KitAsset>> = {
  cafe: "cafe",
  shop: "ski-shop",
  warming_hut: "warming-hut",
  rentals: "rental-shop",
  ski_school: "ski-school-desk",
  waffle_haus: "waffle-haus",
  ticket_booth: "ticket-booth",
  patrol_hut: "patrol-hut",
  maintenance_garage: "maintenance-garage",
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

type Placement = { name: VillageKitName; x: number; z: number; yaw: number; scale: number; asset?: AssetMarker };

export const LODGE_BASE_KIT = "base-lodge" as const satisfies KitAsset;
export const LODGE_TIER_SHELL_KITS = ["lodge-tier-2", "lodge-tier-3"] as const satisfies readonly KitAsset[];

/** One full-shell lodge GLB per sim tier at the lodge anchor. */
export function lodgeTierKit(tier: LodgeTier, lodgeStyleId: string): VillageKitName {
  if (tier === 1) return resolveLodgeCoreKit(lodgeStyleId) as VillageKitName;
  const styleOf = tier === 2 ? "lodge-tier-2" : "lodge-tier-3";
  return resolveStyledKit(styleOf, lodgeStyleId) as VillageKitName;
}

/** Structural lodge pieces drawn at the lodge anchor for the current sim tier. */
export function lodgeStructureKits(tier: LodgeTier, lodgeStyleId: string): readonly VillageKitName[] {
  return [lodgeTierKit(tier, lodgeStyleId)];
}

/** Kit assets the village merge loop must register (prevents tier lodge skip). */
export const VILLAGE_SCENE_KITS = [
  LODGE_BASE_KIT,
  ...LODGE_TIER_SHELL_KITS,
  "lodge-tier-1-chalet70s",
  "lodge-tier-2-chalet70s",
  "lodge-tier-3-chalet70s",
  "lodge-tier-1-aframe60s",
  "lodge-tier-2-aframe60s",
  "lodge-tier-3-aframe60s",
  "lodge-tier-1-adirondack",
  "lodge-tier-2-adirondack",
  "lodge-tier-3-adirondack",
  "lodge-tier-1-sugarhouse",
  "lodge-tier-2-sugarhouse",
  "lodge-tier-3-sugarhouse",
  "clapboard-house",
  "cafe",
  "cafe-chalet70s",
  "ski-shop",
  "ski-shop-chalet70s",
  "rental-shop",
  "rental-shop-chalet70s",
  "warming-hut",
  "warming-hut-chalet70s",
  "waffle-haus",
  "ski-school-desk",
  "ticket-booth",
  "patrol-hut",
  "maintenance-garage",
  "lamp-post",
  "tubing-hut",
  "ice-rink",
  "apres-bar",
  "fire-pit",
  "string-lights",
] as const satisfies readonly KitAsset[];

export function villagePlacements(
  assets: readonly PlacedAsset[],
  tier: LodgeTier,
  lodgeStyleId: string,
): Placement[] {
  const B = METERS_TO_WORLD;
  const P = METERS_TO_WORLD * LIFT_TOY_SCALE;
  const lodgeAnchor = { x: LODGE.x, z: LODGE.z + 0.05, yaw: 0, scale: B };
  const structure = lodgeStructureKits(tier, lodgeStyleId);
  const list: Placement[] = structure.map((name, index) => ({
    name,
    ...lodgeAnchor,
    ...(index === 0 ? { asset: { kind: "lodge" } as const } : {}),
  }));
  list.push(
    ...HOUSES.map((h) => ({ name: "clapboard-house" as const, ...h, scale: B })),
    ...baseLampPosts().map(([x, z]) => ({ name: "lamp-post" as const, x, z, yaw: 0, scale: P })),
  );
  for (const [index, asset] of assets.entries()) {
    if (asset.id === "direction_sign") continue;
    const base = ASSET_MODELS[asset.id] ?? kitForAsset(asset.id);
    if (!base) continue;
    const attached = asset.attachPad !== undefined;
    const name = (ASSET_MODELS[asset.id]
      ? resolveVenueKit(base, asset.styleId)
      : base) as VillageKitName;
    list.push({
      name,
      ...asset.at,
      yaw: asset.attachPad === 1 ? Math.PI : 0,
      scale: B * (attached ? 1.15 : 1.05),
      asset: { kind: "venue", index },
    });
  }
  return list;
}

function lodgeDetails(construction: boolean): Part[] {
  const parts: Part[] = [];
  // Tier 2/3 meshes include wings, trim, and chimneys; only draw upgrade scaffolding here.
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
      const front = attachPad === 1 ? -0.23 : 0.34;
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
  const lodgeStyleId = useGameStore((s) => s.lodgeStyleId);
  const construction = useGameStore((s) => s.lodgeUpgrade !== null);

  const villageKits = useVillageKitScenes();
  const catKit = useKit("snowcat");
  const cat = bakeKit(catKit);
  const catRef = useRef<THREE.Group>(null);
  const catBeamMat = useRef<THREE.MeshBasicMaterial>(null);
  const catBeaconMat = useRef<THREE.MeshBasicMaterial>(null);
  const catBeamsMesh = useRef<THREE.Mesh>(null);
  const catBeaconMesh = useRef<THREE.Mesh>(null);
  const catBeamsGeo = useMemo(() => {
    const cone = new THREE.ConeGeometry(1.45, 5.2, 10, 1, true);
    const geo = merge([
      { geo: cone, color: "#ffe4a8", pos: [-0.65, 1.5, 4.2], rot: [Math.PI / 2 + 0.12, 0, 0] },
      { geo: cone, color: "#ffe4a8", pos: [0.65, 1.5, 4.2], rot: [Math.PI / 2 + 0.12, 0, 0] },
    ]);
    cone.dispose();
    return geo;
  }, []);
  const reduced = useReducedMotion();
  const night = useGameStore(s => s.phase === "night" && s.dayIndex < s.seasonLength ? s : null);
  const groom = useMemo(() => {
    if (!night || night.pendingSnow === "minimal") return null;
    const coverage = groomCoverage(
      night.trails,
      night.dayStats.runsByTrail,
      night.pendingSnow,
      night.talentsOwned,
      hasMaintenanceGarage(night.assets, night.lodgeTier),
    );
    const index = coverage.findIndex(row => row.some(Boolean));
    if (index < 0) return null;
    const first = coverage[index].indexOf(true) / coverage[index].length;
    const sample = pathSampler(night.trails[index].path);
    return (t: number) => sample(first + (1 - first) * t);
  }, [night]);
  const { matte, semiGloss, glass, glow, pickMeshes } = useMemo(() => {
    const mattes: THREE.BufferGeometry[] = [];
    const glosses: THREE.BufferGeometry[] = [];
    const glasses: THREE.BufferGeometry[] = [];
    const glows: THREE.BufferGeometry[] = [];
    const pickMeshes: { placement: Placement; geometry: THREE.BufferGeometry; y: number }[] = [];
    for (const p of villagePlacements(assets, tier, lodgeStyleId)) {
      const scene = villageKits[p.name];
      if (!scene) continue;
      const kit = bakeKit(scene);
      const y = TERRAIN.height(p.x, p.z) - 0.02;
      if (kit.matte.attributes.position) mattes.push(placeKit(kit.matte, p.x, y, p.z, p.yaw, p.scale));
      if (kit.semiGloss) glosses.push(placeKit(kit.semiGloss, p.x, y, p.z, p.yaw, p.scale));
      if (kit.glass) glasses.push(placeKit(kit.glass, p.x, y, p.z, p.yaw, p.scale));
      if (kit.glow) glows.push(placeKit(kit.glow, p.x, y, p.z, p.yaw, p.scale));
      if (p.asset) pickMeshes.push({ placement: p, geometry: kit.body, y });
    }
    const additions = [...lodgeDetails(construction), ...venueDetails(assets)];
    if (additions.length > 0) mattes.push(merge(additions));

    return {
      matte: mergePlaced(mattes),
      semiGloss: mergePlaced(glosses),
      glass: mergePlaced(glasses),
      glow: mergePlaced(glows),
      pickMeshes,
    };
  }, [assets, tier, lodgeStyleId, construction, villageKits]);

  useEffect(
    () => () => {
      matte.dispose();
      semiGloss.dispose();
      glass.dispose();
      glow.dispose();
      catBeamsGeo.dispose();
    },
    [matte, semiGloss, glass, glow, catBeamsGeo],
  );

  const glassMat = useRef<THREE.MeshStandardMaterial>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const hearthLight = useRef<THREE.PointLight>(null);
  const poolMat = useRef<THREE.MeshBasicMaterial>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => lightPoolTexture(), []);
  useEffect(() => () => tex?.dispose(), [tex]);

  const lamps = useMemo(() => baseLampPosts(), []);

  useEffect(() => {
    const m = pools.current;
    if (!m) return;
    const d = new THREE.Object3D();
    lamps.forEach(([x, z], i) => {
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
    m.setMatrixAt(lamps.length, d.matrix);
    m.instanceMatrix.needsUpdate = true;
  }, [lamps]);

  useFrame(({ clock }) => {
    if (catRef.current) {
      const cat = catRef.current;
      if (catBeamsMesh.current) catBeamsMesh.current.visible = Boolean(groom);
      if (catBeaconMesh.current) catBeaconMesh.current.visible = Boolean(groom);
      if (groom) {
        const cycle = reduced.current ? 0.55 : (clock.elapsedTime / 90) % 2;
        const t = cycle <= 1 ? cycle : 2 - cycle;
        const p = groom(t);
        const next = groom(Math.max(0, Math.min(1, t + (cycle < 1 ? 0.008 : -0.008))));
        cat.position.set(p.x, p.y, p.z);
        cat.rotation.y = Math.atan2(next.x - p.x, next.z - p.z);
        if (catBeamMat.current) catBeamMat.current.opacity = 0.22;
        if (catBeaconMat.current) {
          const pulse = reduced.current ? 1 : 0.45 + 0.55 * Math.max(0, Math.sin(clock.elapsedTime * 7));
          catBeaconMat.current.color.set("#ff9f2e").multiplyScalar(0.5 + pulse * 1.1);
        }
      } else {
        cat.position.set(SNOWCAT_POS.x, TERRAIN.height(SNOWCAT_POS.x, SNOWCAT_POS.z) - 0.02, SNOWCAT_POS.z);
        cat.rotation.y = SNOWCAT_POS.yaw;
      }
    }
    const k = Math.max(sceneMood.night, sceneMood.dusk * 0.6);
    if (glassMat.current) {
      glassMat.current.emissiveIntensity = 0.22 + sceneMood.dusk * 0.63 + sceneMood.night * 1.13;
    }
    if (glowMat.current) glowMat.current.color.setScalar(sceneMood.glow);
    if (hearthLight.current) {
      hearthLight.current.intensity = sceneMood.dusk * 0.85 + sceneMood.night * 1.85;
    }
    if (poolMat.current) poolMat.current.opacity = 0.05 + k * 0.75;
  });

  return (
    <group>
      <group name="snowcat" ref={catRef} scale={METERS_TO_WORLD * 1.25} dispose={null} userData={{ asset: { kind: "snowcat" } }}>
        <mesh geometry={cat.matte} castShadow><meshStandardMaterial vertexColors roughness={0.8} metalness={0.02} /></mesh>
        {cat.semiGloss && <mesh geometry={cat.semiGloss} castShadow><meshStandardMaterial vertexColors roughness={0.36} metalness={0.25} /></mesh>}
        {cat.glass && <mesh geometry={cat.glass}><meshStandardMaterial vertexColors roughness={0.2} metalness={0.15} emissive="#ff9f2e" emissiveIntensity={0.45} /></mesh>}
        {cat.glow && <mesh geometry={cat.glow}><meshBasicMaterial vertexColors toneMapped={false} /></mesh>}
        <mesh ref={catBeaconMesh} visible={false} position={[0, 3.34, 0.25]}>
          <boxGeometry args={[0.26, 0.16, 0.26]} />
          <meshBasicMaterial ref={catBeaconMat} color="#ff9f2e" toneMapped={false} />
        </mesh>
        <mesh ref={catBeamsMesh} visible={false} geometry={catBeamsGeo} renderOrder={4}>
          <meshBasicMaterial
            ref={catBeamMat}
            vertexColors
            transparent
            opacity={0.22}
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
      {matte.attributes.position && (
        <mesh geometry={matte} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.82} metalness={0.02} {...OVERLAY_DIM} />
        </mesh>
      )}
      {semiGloss.attributes.position && (
        <mesh geometry={semiGloss} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={0.36} metalness={0.25} {...OVERLAY_DIM} />
        </mesh>
      )}
      {glass.attributes.position && (
        <mesh geometry={glass}>
          <meshStandardMaterial
            ref={glassMat}
            vertexColors
            roughness={0.18}
            metalness={0.15}
            emissive="#ff9f2e"
            emissiveIntensity={0.22}
            {...OVERLAY_DIM}
          />
        </mesh>
      )}
      {glow.attributes.position && (
        <mesh geometry={glow}>
          <meshBasicMaterial ref={glowMat} vertexColors {...OVERLAY_DIM} toneMapped={false} />
        </mesh>
      )}
      {pickMeshes.map(({ placement: p, geometry, y }) => (
        <mesh key={`${p.name}-${p.x}-${p.z}`} position={[p.x, y, p.z]} rotation-y={p.yaw} scale={p.scale}
          geometry={geometry} visible={false} dispose={null} userData={{ asset: p.asset }} />
      ))}
      <pointLight
        ref={hearthLight}
        position={[LODGE.x, LODGE_GROUND + 0.55, LODGE.z + 1.05]}
        color="#ff9d42"
        intensity={0}
        distance={6}
        decay={2}
      />
      <instancedMesh ref={pools} args={[undefined, undefined, Math.max(1, lamps.length + 1)]} renderOrder={3}>
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
