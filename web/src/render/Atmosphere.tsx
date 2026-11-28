"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useGameStore } from "@/game/store";
import { fbm, TERRAIN } from "@/game/terrain";
import { hash01 } from "./forest";
import { SHADOW_LAYER } from "./kit";
import { useReducedMotion } from "./useReducedMotion";
import { smoothstep } from "./math";
import { dayTintAt, type Tint } from "./dayTint";
import { sceneCameraTarget } from "./sceneCamera";
import { HILL_CENTER, PALETTE } from "./palette";
import { lightRig, sunDistance, type Rig } from "./lighting";
import { mountainTheme, type HorizonProfile } from "./mountainThemes";

/**
 * Shared lighting mood, written once per frame by <Atmosphere> and read by
 * windows, lamps and plumes. 0 = bright day, 1 = full night.
 */
export const sceneMood = { night: 0, dusk: 0, exposure: 1, glow: 0.62 };

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 midColor;
  uniform vec3 horizonColor;
  uniform vec3 sunDir;
  uniform float uTime;
  uniform float uDusk;
  uniform float uNight;
  uniform float uCloudCover;
  varying vec3 vDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.25, h));
    col = mix(col, topColor, smoothstep(0.18, 0.68, h));

    // Sun halo and golden-hour horizon alpenglow bloom.
    float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
    float clearSun = (1.0 - uCloudCover * 0.65) * (1.0 - uNight);
    float halo = pow(sunDot, 16.0) * 0.22 + pow(sunDot, 160.0) * 0.45;
    float horBloom = pow(sunDot, 3.2) * (1.0 - smoothstep(0.0, 0.42, h)) * (0.12 + 0.34 * uDusk);
    vec3 sunTint = mix(vec3(1.0, 0.93, 0.8), vec3(1.0, 0.68, 0.44), uDusk);
    col = mix(col, sunTint, clamp((halo + horBloom) * clearSun, 0.0, 0.55));

    // Wispy drifting winter cloud bands overhead.
    float cloudMask = smoothstep(0.03, 0.26, dir.y);
    if (cloudMask > 0.001) {
      vec2 cuv = dir.xz / (max(dir.y, 0.0) + 0.24);
      vec2 uv1 = cuv * 1.25 + vec2(uTime * 0.007, uTime * 0.0025);
      float n = vnoise(uv1) * 0.66 + vnoise(uv1 * 2.2 - vec2(uTime * 0.004, 0.0)) * 0.34;
      float wisp = smoothstep(0.62 - uCloudCover * 0.26, 0.9 - uCloudCover * 0.14, n);
      vec3 cloudCol = mix(vec3(0.98, 0.99, 1.0), vec3(1.0, 0.83, 0.72), uDusk * 0.75);
      cloudCol = mix(cloudCol, topColor * 1.35 + vec3(0.08, 0.1, 0.16), uNight);
      float strength = wisp * cloudMask * (0.14 + uCloudCover * 0.26) * (1.0 - uNight * 0.65);
      col = mix(col, cloudCol, clamp(strength, 0.0, 0.42));
    }

    // Crisp subtle stars and crescent moon when night settles in.
    float starMask = uNight * smoothstep(0.1, 0.38, dir.y) * (1.0 - uCloudCover * 0.7);
    if (starMask > 0.01) {
      vec2 suv = dir.xz / (dir.y + 0.32) * 34.0;
      vec2 cell = floor(suv);
      vec2 f = fract(suv) - 0.5;
      float rnd = hash21(cell);
      if (rnd > 0.982) {
        float d = length(f);
        float star = smoothstep(0.22, 0.02, d) * (0.45 + 0.55 * fract(rnd * 37.0));
        col += vec3(0.86, 0.91, 1.0) * star * starMask * 0.75;
      }
      vec3 moonDir = normalize(vec3(-0.38, 0.44, -0.81));
      float dm = length(dir - moonDir);
      float dc = length(dir - normalize(moonDir + vec3(0.014, 0.01, 0.0)));
      float moon = smoothstep(0.032, 0.027, dm) * (1.0 - smoothstep(0.029, 0.024, dc));
      col = mix(col, vec3(1.0, 0.96, 0.86), moon * uNight * (1.0 - uCloudCover * 0.65) * 0.9);
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const VALLEY_VERT = /* glsl */ `
  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(240.0 / max(-mvPos.z, 20.0), 2.5, 6.5);
    gl_Position = projectionMatrix * mvPos;
  }
`;
const VALLEY_FRAG = /* glsl */ `
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float a = smoothstep(0.5, 0.04, d) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(1.0, 0.82, 0.48, a);
  }
`;

const WHITE = new THREE.Color(PALETTE.white);
const DUSK_ALPENGLOW = new THREE.Color("#ffd7bd");
const SKY_HORIZON_COLOR = new THREE.Color(PALETTE.skyHorizon);
/** Scratch values for the day tint, reused every frame. */
const tintNow: Tint = { r: 1, g: 1, b: 1 };
const tintColor = new THREE.Color();
const rigScratch: Rig = {
  sunDir: [0, 1, 0],
  sunColor: PALETTE.sunDay,
  sunIntensity: 2.5,
  hemiSky: PALETTE.hemiSkyDay,
  hemiGround: PALETTE.hemiGroundDay,
  hemiIntensity: 1.25,
  skyTop: PALETTE.skyTop,
  skyHorizon: PALETTE.skyHorizon,
  fogNear: 140,
  fogFar: 420,
  exposure: 1,
  glow: 0.62,
  shadowStrength: 1,
};

/** Layered hazy ridges framing the mountain behind the lease. */
function ridgeLayerGeometry(
  radius: number,
  base: number,
  amp: number,
  seed: number,
  color: string,
  treeLine: number,
  horizon: HorizonProfile,
) {
  const segs = 140;
  const pos: number[] = [];
  const colors: number[] = [];
  const idx: number[] = [];
  const ridgeCol = new THREE.Color(color);
  const low = ridgeCol.clone().lerp(SKY_HORIZON_COLOR, 0.78);
  const top = ridgeCol
    .clone()
    .lerp(new THREE.Color(PALETTE.snow), 0.44)
    .lerp(new THREE.Color(PALETTE.pineDeep), treeLine);
  for (let i = 0; i <= segs; i++) {
    const a = -2.75 + (i / segs) * 5.5;
    const x = HILL_CENTER.x + Math.sin(a) * radius;
    const z = HILL_CENTER.z - Math.cos(a) * radius * 0.85;
    const n = fbm(a * 2.2 + seed, seed * 0.7) * 1.35;
    const wave = Math.abs(Math.sin(a * 3.1 + seed));
    const peaks = Math.pow(wave, horizon.bluffSharpness) * 0.55;
    const valleyDip = 1 - horizon.valleyNotchDepth * Math.exp(-a * a * 2.4);
    const h = (base + amp * (0.48 + n + peaks) * (0.58 + 0.42 * Math.cos(a * 0.55))) * valleyDip;
    const midY = Math.min(h - 14, -8);
    pos.push(x, h, z, x, midY, z, x, -140, z);
    colors.push(
      top.r, top.g, top.b,
      ridgeCol.r, ridgeCol.g, ridgeCol.b,
      low.r, low.g, low.b,
    );
    if (i < segs) {
      const k = i * 3;
      idx.push(
        k, k + 1, k + 3,
        k + 1, k + 4, k + 3,
        k + 1, k + 2, k + 4,
        k + 2, k + 5, k + 4,
      );
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  return g;
}

function valleyLightPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = -2.45 + hash01(i * 13, 7, 1) * 4.9;
    const r = 56 + hash01(i * 19, 11, 2) * 46;
    const x = HILL_CENTER.x + Math.sin(a) * r;
    const z = HILL_CENTER.z - Math.cos(a) * r * 0.85;
    const y = TERRAIN.height(x, z) + 0.35;
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  return arr;
}

const SHADOW_HALF = 18;

/**
 * Sky, fog, ridges, sun and hemisphere light. Re-reads the game clock, phase
 * and weather from the store each frame, so it never re-renders on a tick.
 */
export function Atmosphere({ lowDetail = false }: { lowDetail?: boolean }) {
  const mountainId = useGameStore((s) => s.mountainId);
  const theme = mountainTheme(mountainId);
  const shadowSize = lowDetail ? 1024 : 2048;
  const shadowTexel = (SHADOW_HALF * 2) / shadowSize;
  const reduced = useReducedMotion();
  const fog = useRef<THREE.Fog>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  // Shadow-only proxies (trees, skiers) live on SHADOW_LAYER.
  useEffect(() => {
    sun.current?.shadow.camera.layers.enable(SHADOW_LAYER);
  }, []);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const mood = useRef(useGameStore.getState().phase === "night" ? 1 : 0);
  const skyTime = useRef(0);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const ridgeMat = useRef<THREE.MeshBasicMaterial>(null);
  const valleyPtsRef = useRef<THREE.Points>(null);
  const valleyMatRef = useRef<THREE.ShaderMaterial>(null);
  const sunColor = useMemo(() => new THREE.Color(), []);
  const hemiSkyColor = useMemo(() => new THREE.Color(), []);
  const hemiGroundColor = useMemo(() => new THREE.Color(), []);
  const skyTopColor = useMemo(() => new THREE.Color(), []);
  const skyMidColor = useMemo(() => new THREE.Color(PALETTE.skyMid), []);
  const skyHorizonColor = useMemo(() => new THREE.Color(), []);
  const nightHorizon = useMemo(() => new THREE.Color(PALETTE.nightHorizon), []);

  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: skyTopColor.clone() },
          midColor: { value: skyMidColor.clone() },
          horizonColor: { value: skyHorizonColor.clone() },
          sunDir: { value: new THREE.Vector3(0.4, 0.5, 0.7) },
          uTime: { value: 0 },
          uDusk: { value: 0 },
          uNight: { value: 0 },
          uCloudCover: { value: 0.25 },
        },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [skyHorizonColor, skyMidColor, skyTopColor],
  );
  const mergedRidgesGeo = useMemo(() => {
    const layers = [
      ridgeLayerGeometry(255, 22, 20, 11.3, theme.ridgeFar, 0.16, theme.horizon),
      ridgeLayerGeometry(198, 12, 15, 4.7, theme.ridgeMid, 0.26, theme.horizon),
      ridgeLayerGeometry(148, 4, 11, 23.1, theme.ridgeNear, 0.36, theme.horizon),
    ];
    const merged = mergeGeometries(layers, false);
    layers.forEach((g) => g.dispose());
    return merged;
  }, [theme.ridgeFar, theme.ridgeMid, theme.ridgeNear, theme.horizon]);
  const valleyGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(valleyLightPositions(theme.horizon.valleyLightCount), 3));
    return g;
  }, [theme.horizon.valleyLightCount]);
  const valleyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: VALLEY_VERT,
        fragmentShader: VALLEY_FRAG,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const target = useMemo(() => new THREE.Object3D(), []);
  const sunDist = sunDistance(TERRAIN.scale);

  useEffect(
    () => () => {
      sky.dispose();
      mergedRidgesGeo.dispose();
      valleyGeo.dispose();
      valleyMat.dispose();
    },
    [sky, mergedRidgesGeo, valleyGeo, valleyMat],
  );

  useFrame((_, delta) => {
    const { phase, clockMin, weather } = useGameStore.getState();
    const goal = phase === "night" || phase === "winter_review" || phase === "mountain2" ? 1 : 0;
    mood.current += (goal - mood.current) * (reduced.current ? 1 : Math.min(1, delta * 1.8));
    const n = mood.current;
    const dusk = smoothstep(14 * 60, 16 * 60, clockMin) * (1 - n);
    sceneMood.night = n;
    sceneMood.dusk = dusk;

    if (!reduced.current) skyTime.current += Math.min(0.05, delta);

    const rig = lightRig({ clockMin, night: n, weather }, TERRAIN.scale, rigScratch);
    sceneMood.exposure = rig.exposure;
    sceneMood.glow = rig.glow;

    dayTintAt(clockMin, tintNow);
    const tintAmount = 1 - n;
    tintColor.setRGB(1 + (tintNow.r - 1) * tintAmount, 1 + (tintNow.g - 1) * tintAmount, 1 + (tintNow.b - 1) * tintAmount);

    if (skyMatRef.current) {
      const uniforms = skyMatRef.current.uniforms;
      skyTopColor.set(rig.skyTop);
      skyHorizonColor.set(rig.skyHorizon);
      (uniforms.topColor.value as THREE.Color).copy(skyTopColor);
      (uniforms.horizonColor.value as THREE.Color).copy(skyHorizonColor).multiply(tintColor);
      (uniforms.midColor.value as THREE.Color)
        .copy(uniforms.topColor.value as THREE.Color)
        .lerp(uniforms.horizonColor.value as THREE.Color, 0.48);
      (uniforms.sunDir.value as THREE.Vector3).set(rig.sunDir[0], rig.sunDir[1], rig.sunDir[2]);
      uniforms.uTime.value = skyTime.current;
      uniforms.uDusk.value = dusk;
      uniforms.uNight.value = n;
      uniforms.uCloudCover.value = weather === "storm" ? 0.94 : weather === "snow" ? 0.78 : weather === "thaw" ? 0.34 : 0.2;
    }
    if (fog.current) {
      fog.current.color.copy(skyHorizonColor).multiply(tintColor);
      fog.current.near = rig.fogNear;
      fog.current.far = rig.fogFar;
    }

    if (sun.current) {
      sunColor.set(rig.sunColor).multiply(tintColor);
      sun.current.color.copy(sunColor);
      sun.current.intensity = rig.sunIntensity;
    }
    if (hemi.current) {
      hemiSkyColor.set(rig.hemiSky).multiply(tintColor);
      hemiGroundColor.set(rig.hemiGround);
      hemi.current.color.copy(hemiSkyColor);
      hemi.current.groundColor.copy(hemiGroundColor);
      hemi.current.intensity = rig.hemiIntensity;
    }
    if (ridgeMat.current) {
      ridgeMat.current.color
        .copy(WHITE)
        .lerp(DUSK_ALPENGLOW, dusk * 0.24)
        .lerp(nightHorizon, n * 0.86);
    }
    const valleyLevel = Math.min(1, dusk * 0.72 + n * 0.92);
    if (valleyPtsRef.current) {
      valleyPtsRef.current.visible = valleyLevel > 0.12;
    }
    if (valleyMatRef.current) {
      valleyMatRef.current.uniforms.uOpacity.value = valleyLevel;
    }

    const tx = Math.round(sceneCameraTarget.x / shadowTexel) * shadowTexel;
    const tz = Math.round(sceneCameraTarget.z / shadowTexel) * shadowTexel;
    target.position.set(tx, 0, tz);
    if (sun.current) {
      const [dx, dy, dz] = rig.sunDir;
      sun.current.position.set(tx + dx * sunDist, dy * sunDist, tz + dz * sunDist);
    }
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={[PALETTE.skyHorizon, 140, 420]} />
      <mesh renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[380, 24, 12]} />
        <primitive ref={skyMatRef} object={sky} attach="material" />
      </mesh>
      <mesh geometry={mergedRidgesGeo}>
        <meshBasicMaterial ref={ridgeMat} vertexColors fog={false} side={THREE.DoubleSide} />
      </mesh>
      <points ref={valleyPtsRef} geometry={valleyGeo} visible={false} frustumCulled={false}>
        <primitive ref={valleyMatRef} object={valleyMat} attach="material" />
      </points>
      <hemisphereLight ref={hemi} intensity={1.25} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        intensity={2.6}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-SHADOW_HALF}
        shadow-camera-right={SHADOW_HALF}
        shadow-camera-top={SHADOW_HALF}
        shadow-camera-bottom={-SHADOW_HALF}
        shadow-camera-near={8}
        shadow-camera-far={84}
        shadow-bias={-0.00035}
        shadow-normalBias={0.038}
      />
    </>
  );
}