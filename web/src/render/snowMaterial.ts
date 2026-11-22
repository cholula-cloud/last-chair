import * as THREE from "three";
import { TERRAIN } from "@/game/terrain";
import { PALETTE } from "./palette";
import { sceneMood } from "./Atmosphere";
import { SNOW_TEX_SEGMENTS, SNOW_TEX_TRAILS } from "./snowTexture";

const color = (hex: string) => new THREE.Color(hex);

/** When false, corridor condition art defers to the Conditions map overlay (row O3). */
export const MOUNTAIN_TRAIL_CONDITIONING = true;

export const snowUniforms = {
  uSnow: { value: null as THREE.DataTexture | null },
  uTrailCount: { value: 0 },
  uSegWidth: { value: SNOW_TEX_SEGMENTS },
  uGroomStrength: { value: 0.6 },
  uStripePitch: { value: 0.22 },
  uWear: { value: new Float32Array(SNOW_TEX_TRAILS) },
  uPatchScale: { value: 0.9 * (6 / TERRAIN.scale.horizontal) },
  uNight: { value: 0 },
  uSnowColor0: { value: color(PALETTE.snow) },
  uSnowColor1: { value: color(PALETTE.snowShade) },
  uSnowColor2: { value: color(PALETTE.snowOld) },
  uSnowColor3: { value: color(PALETTE.snowIce) },
  /** Corridor bare patches use worn snow, not earth brown. */
  uSnowColor4: { value: color(PALETTE.snowOld) },
  uSnowColor5: { value: color(PALETTE.rock) },
};

const SNOW_VERT = `
attribute float aTrail;
attribute float aT;
attribute float aU;
attribute float aW;
varying float vTrail;
varying float vAlong;
varying float vCross;
varying float vWeight;
varying vec3 vSnowWorld;
`;

const SNOW_FRAG_UNIFORMS = `
uniform sampler2D uSnow;
uniform float uTrailCount;
uniform float uSegWidth;
uniform float uGroomStrength;
uniform float uStripePitch;
uniform float uWear[8];
uniform float uPatchScale;
uniform float uNight;
uniform vec3 uSnowColor0;
uniform vec3 uSnowColor1;
uniform vec3 uSnowColor2;
uniform vec3 uSnowColor3;
uniform vec3 uSnowColor4;
uniform vec3 uSnowColor5;
varying float vTrail;
varying float vAlong;
varying float vCross;
varying float vWeight;
varying vec3 vSnowWorld;
float snowHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
`;

const SNOW_FRAG = `
if (vTrail >= 0.0 && vWeight > 0.02) {
  float row = vTrail;
  float segF = clamp(vAlong, 0.0, 1.0) * (uSegWidth - 1.0);
  vec2 uv = vec2((segF + 0.5) / uSegWidth, (row + 0.5) / max(uTrailCount, 1.0));
  vec4 seg = texture2D(uSnow, uv) / 255.0;
  float depth = seg.r;
  float quality = seg.g;
  float coverage = seg.b;
  float condition = seg.a;
  float groomed = step(0.75, condition);
  float gunOnly = step(0.12, condition) * (1.0 - groomed);
  float wear = uWear[int(row)];
  float n = snowHash(vSnowWorld.xz * uPatchScale);
  float barePatch = smoothstep(coverage - 0.04, coverage + 0.04, n);
  float awful = smoothstep(0.14, 0.05, coverage) * smoothstep(0.22, 0.08, quality);
  float bare = barePatch * awful;
  vec3 col = mix(uSnowColor0, uSnowColor3, clamp((0.45 - quality) / 0.35, 0.0, 1.0) * 0.85);
  col = mix(col, uSnowColor2, clamp(0.75 - quality, 0.0, 1.0) * 0.35);
  col = mix(col, mix(uSnowColor3, uSnowColor2, 0.55), bare * vWeight * 0.5);
  float stripe = 0.5 + 0.5 * sin(vCross / max(uStripePitch, 1e-4) * 6.2831853);
  float edgeFade = smoothstep(0.85, 1.0, abs(vCross) / 6.3);
  float depthBoost = 0.65 + 0.35 * depth;
  float amp = uGroomStrength * groomed * quality * depthBoost * (1.0 - wear) * (1.0 - edgeFade);
  float stripeMix = stripe * amp * vWeight;
  col = mix(col, mix(uSnowColor0, uSnowColor1, 0.35), stripeMix);
  col = mix(col, uSnowColor0, groomed * depth * 0.12 * vWeight);
  col = mix(col, mix(uSnowColor0, uSnowColor3, 0.22), gunOnly * depth * 0.4 * vWeight);
  col *= 1.0 - 0.05 * uNight;
  diffuseColor.rgb = mix(diffuseColor.rgb, col, vWeight);
}
`;

/** GPU snow patches and groom stripes (row 30). Chain before overlay / lease dim patches. */
export function patchSnowMaterial<T extends THREE.Material>(material: T): T {
  if (!MOUNTAIN_TRAIL_CONDITIONING) return material;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    Object.assign(shader.uniforms, snowUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${SNOW_VERT}`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTrail = aTrail;\nvAlong = aT;\nvCross = aU;\nvWeight = aW;\nvSnowWorld = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SNOW_FRAG_UNIFORMS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${SNOW_FRAG}`);
  };
  const key = material.customProgramCacheKey?.bind(material) ?? (() => "");
  material.customProgramCacheKey = () => `${key()}+snow`;
  return material;
}

/** Writes night mood into the snow shader each frame. */
export function syncSnowNightUniform(): void {
  if (!MOUNTAIN_TRAIL_CONDITIONING) return;
  snowUniforms.uNight.value = sceneMood.night;
}