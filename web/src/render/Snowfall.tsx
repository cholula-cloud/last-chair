"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store";
import { sceneCameraTarget } from "./sceneCamera";
import { useReducedMotion } from "./useReducedMotion";

const SNOW_VERT = /* glsl */ `
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aPhase;
  varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    float dist = max(1.0, -mvPosition.z);
    gl_PointSize = clamp(uSize * uPixelRatio * (28.0 / dist), 1.5, 10.0);
    vAlpha = 0.65 + 0.35 * sin(aPhase);
  }
`;

const SNOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float r = dot(c, c);
    if (r > 0.25) discard;
    float soft = smoothstep(0.25, 0.04, r);
    gl_FragColor = vec4(uColor, soft * uOpacity * vAlpha);
    #include <colorspace_fragment>
  }
`;

const BOX_HALF_XZ = 15;
const BOX_MIN_Y = -0.5;
const BOX_HEIGHT_Y = 12;

function wrapOffset(val: number, center: number, halfSpan: number): number {
  const span = halfSpan * 2;
  let d = ((val - (center - halfSpan)) % span + span) % span;
  if (d < 0) d += span;
  return center - halfSpan + d;
}

/**
 * Weather-driven snowfall volume centered around the camera target.
 * Single Points draw call; skips animation when reduced motion is preferred.
 */
export function Snowfall({ lowDetail = false }: { lowDetail?: boolean }) {
  const count = lowDetail ? 90 : 240;
  const reduced = useReducedMotion();
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, phases, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const sp = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Deterministic Halton-like scatter.
      const h1 = ((i * 0.61803398875) % 1);
      const h2 = ((i * 0.38196601125 + 0.17) % 1);
      const h3 = ((i * 0.7548776662 + 0.43) % 1);
      pos[i * 3] = (h1 - 0.5) * BOX_HALF_XZ * 2;
      pos[i * 3 + 1] = BOX_MIN_Y + h2 * BOX_HEIGHT_Y;
      pos[i * 3 + 2] = (h3 - 0.5) * BOX_HALF_XZ * 2;
      ph[i] = h3 * Math.PI * 2;
      sp[i] = 0.78 + h1 * 0.44;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    return { geometry: g, phases: ph, speeds: sp };
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#f8fbff") },
          uOpacity: { value: 0 },
          uSize: { value: 3.4 },
          uPixelRatio: { value: typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1 },
        },
        vertexShader: SNOW_VERT,
        fragmentShader: SNOW_FRAG,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }, delta) => {
    const pts = pointsRef.current;
    const mat = matRef.current;
    if (!pts || !mat) return;
    const { weather, paused } = useGameStore.getState();
    const isSnow = weather === "snow" || weather === "storm";
    pts.visible = isSnow;
    if (!isSnow) return;

    const storm = weather === "storm";
    mat.uniforms.uOpacity.value = reduced.current ? 0.32 : storm ? 0.85 : 0.65;
    mat.uniforms.uSize.value = storm ? 4.2 : 3.2;

    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const dt = reduced.current || paused ? 0 : Math.min(0.05, delta);
    const t = clock.elapsedTime;
    const cx = sceneCameraTarget.x;
    const cz = sceneCameraTarget.z;
    const fallRate = storm ? 3.8 : 1.55;
    const windX = storm ? 2.4 : 0.25;
    const windZ = storm ? 0.95 : 0.1;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const spd = speeds[i];
      const ph = phases[i];
      let x = arr[ix] + (windX + Math.sin(t * 1.4 + ph) * 0.35) * dt * spd;
      let y = arr[ix + 1] - fallRate * dt * spd;
      let z = arr[ix + 2] + (windZ + Math.cos(t * 1.1 + ph) * 0.25) * dt * spd;
      if (y < BOX_MIN_Y) y += BOX_HEIGHT_Y;
      x = wrapOffset(x, cx, BOX_HALF_XZ);
      z = wrapOffset(z, cz, BOX_HALF_XZ);
      arr[ix] = x;
      arr[ix + 1] = y;
      arr[ix + 2] = z;
    }
    attr.needsUpdate = true;
  });

  const weather = useGameStore((s) => s.weather);
  const initialSnow = weather === "snow" || weather === "storm";

  return (
    <points ref={pointsRef} geometry={geometry} visible={initialSnow} frustumCulled={false} renderOrder={5}>
      <primitive ref={matRef} object={material} attach="material" />
    </points>
  );
}
