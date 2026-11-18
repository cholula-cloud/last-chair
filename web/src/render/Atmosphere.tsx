"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store";
import { SHADOW_LAYER } from "./kit";
import { smoothstep } from "./math";
import { fbm } from "@/game/terrain";
import { sceneCameraTarget } from "./sceneCamera";
import { HILL_CENTER, PALETTE, SUN_DIR } from "./palette";

/**
 * Shared lighting mood, written once per frame by <Atmosphere> and read by
 * windows, lamps and plumes. 0 = bright day, 1 = full night.
 */
export const sceneMood = { night: 0, dusk: 0 };

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vDir;
  void main() {
    float h = smoothstep(-0.02, 0.55, vDir.y);
    gl_FragColor = vec4(mix(horizonColor, topColor, pow(h, 0.7)), 1.0);
    #include <colorspace_fragment>
  }
`;

const DAY = {
  top: new THREE.Color(PALETTE.skyTop),
  horizon: new THREE.Color(PALETTE.skyHorizon),
  sun: new THREE.Color(PALETTE.sunDay),
  dusk: new THREE.Color(PALETTE.sunDusk),
  hemiSky: new THREE.Color(PALETTE.hemiSkyDay),
  hemiGround: new THREE.Color(PALETTE.hemiGroundDay),
  overcastTop: new THREE.Color(PALETTE.overcastTop),
  duskHorizon: new THREE.Color(PALETTE.duskHorizon),
};
const NIGHT = {
  top: new THREE.Color(PALETTE.nightSkyTop),
  horizon: new THREE.Color(PALETTE.nightHorizon),
  sun: new THREE.Color(PALETTE.sunNight),
  hemiSky: new THREE.Color(PALETTE.hemiSkyNight),
  hemiGround: new THREE.Color(PALETTE.hemiGroundNight),
};
const WHITE = new THREE.Color(PALETTE.white);

/** Layered hazy ridges behind the hill so it sits in a valley. */
function ridgeGeometry(radius: number, base: number, amp: number, seed: number, color: string) {
  const segs = 120;
  const pos: number[] = [];
  const colors: number[] = [];
  const idx: number[] = [];
  const low = new THREE.Color(color);
  const top = low.clone().lerp(new THREE.Color(PALETTE.snow), 0.6);
  for (let i = 0; i <= segs; i++) {
    const a = -2.4 + (i / segs) * 4.8;
    const x = HILL_CENTER.x + Math.sin(a) * radius;
    const z = HILL_CENTER.z - Math.cos(a) * radius * 0.85;
    const n = fbm(a * 2.2 + seed, seed * 0.7) * 1.4;
    const peaks = Math.abs(Math.sin(a * 3.1 + seed)) * 0.5;
    const h = base + amp * (0.5 + n + peaks) * (0.55 + 0.45 * Math.cos(a * 0.6));
    pos.push(x, h, z, x, h - amp * 1.6 - 2, z);
    colors.push(top.r, top.g, top.b, low.r, low.g, low.b);
    if (i < segs) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  return g;
}

const RIDGES = [
  { radius: 520, base: 54, amp: 42, seed: 11.3, color: PALETTE.ridgeFar },
  { radius: 420, base: 36, amp: 33, seed: 4.7, color: PALETTE.ridgeMid },
  { radius: 320, base: 21, amp: 24, seed: 23.1, color: PALETTE.ridgeNear },
];

const SHADOW_TEXEL = 28 / 1024;

/**
 * Sky, fog, ridges, sun and hemisphere light. Re-reads the game clock, phase
 * and weather from the store each frame, so it never re-renders on a tick.
 */
export function Atmosphere() {
  const fog = useRef<THREE.Fog>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  // Shadow-only proxies (trees, skiers) live on SHADOW_LAYER.
  useEffect(() => {
    sun.current?.shadow.camera.layers.enable(SHADOW_LAYER);
  }, []);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const mood = useRef(useGameStore.getState().phase === "night" ? 1 : 0);
  const ridgeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: DAY.top.clone() },
          horizonColor: { value: DAY.horizon.clone() },
        },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const ridgeGeos = useMemo(
    () => RIDGES.map((r) => ridgeGeometry(r.radius, r.base, r.amp, r.seed, r.color)),
    [],
  );
  const target = useMemo(() => new THREE.Object3D(), []);

  useEffect(
    () => () => {
      sky.dispose();
      ridgeGeos.forEach((g) => g.dispose());
    },
    [sky, ridgeGeos],
  );

  useFrame((_, delta) => {
    const { phase, clockMin, weather } = useGameStore.getState();
    const goal = phase === "night" ? 1 : 0;
    mood.current += (goal - mood.current) * Math.min(1, delta * 1.8);
    const n = mood.current;
    const dusk = smoothstep(14 * 60, 16 * 60, clockMin) * (1 - n);
    sceneMood.night = n;
    sceneMood.dusk = dusk;
    const overcast = weather === "snow" ? 1 : 0;

    const top = sky.uniforms.topColor.value as THREE.Color;
    const hor = sky.uniforms.horizonColor.value as THREE.Color;
    top.copy(DAY.top).lerp(DAY.overcastTop, overcast * 0.6).lerp(NIGHT.top, n);
    hor.copy(DAY.horizon).lerp(DAY.duskHorizon, dusk * 0.7).lerp(NIGHT.horizon, n);
    if (fog.current) fog.current.color.copy(hor);

    if (sun.current) {
      sun.current.color.copy(DAY.sun).lerp(DAY.dusk, dusk).lerp(NIGHT.sun, n);
      sun.current.intensity =
        (2.5 - dusk * 0.6 - overcast * 0.9 + (weather === "thaw" ? 0.2 : 0)) *
          (1 - n) +
        0.35 * n;
    }
    if (hemi.current) {
      hemi.current.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
      hemi.current.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, n);
      hemi.current.intensity = (1.25 + overcast * 0.25) * (1 - n) + 0.75 * n;
    }
    ridgeMats.current.forEach((m) => {
      if (!m) return;
      m.color.copy(WHITE).lerp(NIGHT.horizon, n * 0.85);
    });

    const tx = Math.round(sceneCameraTarget.x / SHADOW_TEXEL) * SHADOW_TEXEL;
    const tz = Math.round(sceneCameraTarget.z / SHADOW_TEXEL) * SHADOW_TEXEL;
    target.position.set(tx, 0, tz);
    if (sun.current) {
      sun.current.position.set(tx + SUN_DIR[0] * 30, SUN_DIR[1] * 30, tz + SUN_DIR[2] * 30);
    }
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={[PALETTE.skyHorizon, 140, 420]} />
      <mesh material={sky} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[140, 24, 12]} />
      </mesh>
      {ridgeGeos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial
            ref={(m) => {
              ridgeMats.current[i] = m;
            }}
            vertexColors
            fog={false}
          />
        </mesh>
      ))}
      <hemisphereLight ref={hemi} args={[DAY.hemiSky, DAY.hemiGround, 1.25]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        position={[HILL_CENTER.x + SUN_DIR[0] * 30, SUN_DIR[1] * 30, HILL_CENTER.z + SUN_DIR[2] * 30]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={8}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
      />
    </>
  );
}
