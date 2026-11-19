import * as THREE from "three";
import { CONTOUR_INTERVAL_FT, SLOPE_BAND_LIMITS, SLOPE_LEGEND } from "@/game/overlays";
import { TERRAIN } from "@/game/terrain";

/**
 * Shared uniforms for the map overlay. The terrain material reads them, so switching a layer on or
 * off writes a number and rebuilds nothing. Mode 0 is off; each layer in `game/overlays.ts` owns a mode.
 */
export const overlayUniforms = {
  uOverlayMode: { value: 0 },
  uOverlayMask: { value: null as THREE.Texture | null },
  /** x0, z0, 1 / spanX, 1 / spanZ of the lease mask. */
  uMaskRect: { value: new THREE.Vector4(0, 0, 1, 1) },
  uBaseY: { value: TERRAIN.height(TERRAIN.base.x, TERRAIN.base.z) },
  uFeetPerUnit: { value: TERRAIN.feetPerUnit },
  uContourFt: { value: CONTOUR_INTERVAL_FT },
  uBandLimits: { value: new THREE.Vector3(...SLOPE_BAND_LIMITS.slice(0, 3).map((b) => b.maxPitch) as [number, number, number]) },
  uBandColors: { value: SLOPE_LEGEND.map((e) => new THREE.Color(e.color)) },
};

/** 0 to 1. Buildings and guests fade toward a pale tone while a layer is on. */
export const overlayDim = { value: 0 };

/** Adds the overlay to a terrain material. The geometry carries `aPitch`, the real pitch at each vertex. */
export function patchOverlay<T extends THREE.Material>(material: T): T {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, overlayUniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPitch;\nvarying float vPitch;\nvarying vec3 vOverlayPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPitch = aPitch;\nvOverlayPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float uOverlayMode;
uniform sampler2D uOverlayMask;
uniform vec4 uMaskRect;
uniform float uBaseY;
uniform float uFeetPerUnit;
uniform float uContourFt;
uniform vec3 uBandLimits;
uniform vec3 uBandColors[4];
varying float vPitch;
varying vec3 vOverlayPos;
float lineMask(float coord, float halfWidth, float aa) {
  float f = fract(coord);
  float d = min(f, 1.0 - f);
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, d);
}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
if (uOverlayMode > 0.5) {
  vec2 p = vOverlayPos.xz;
  float inside = smoothstep(0.3, 0.7, texture2D(uOverlayMask, (p - uMaskRect.xy) * uMaskRect.zw).r);
  float band = vPitch <= uBandLimits.x ? 0.0 : vPitch <= uBandLimits.y ? 1.0 : vPitch <= uBandLimits.z ? 2.0 : 3.0;
  vec3 tint = uBandColors[int(band)];
  float period = 1.1;
  vec2 q = p / period;
  float pxPerPeriod = 1.0 / (fwidth(q.x) + 1e-6);
  float fade = clamp((pxPerPeriod - 3.0) / 4.0, 0.0, 1.0);
  float aa = fwidth(q.x);
  float mark = 0.0;
  if (band < 0.5) {
    mark = 1.0 - smoothstep(0.26 - aa, 0.26 + aa, length(fract(q * 1.3) - 0.5));
  } else if (band < 1.5) {
    mark = lineMask((q.x + q.y) * 1.1, 0.2, aa * 2.2);
  } else if (band < 2.5) {
    mark = max(lineMask((q.x + q.y) * 0.9, 0.09, aa * 1.8), lineMask((q.x - q.y) * 0.9, 0.09, aa * 1.8));
  } else {
    mark = max(lineMask((q.x + q.y) * 1.9, 0.2, aa * 3.8), lineMask((q.x - q.y) * 1.9, 0.2, aa * 3.8));
  }
  float contourCoord = (vOverlayPos.y - uBaseY) * uFeetPerUnit / uContourFt;
  float cw = fwidth(contourCoord);
  float cf = fract(contourCoord);
  float contour = (1.0 - smoothstep(0.6 * cw, 1.4 * cw, min(cf, 1.0 - cf))) * clamp((1.0 / (cw + 1e-6) - 5.0) / 6.0, 0.0, 1.0);
  vec3 col = mix(diffuseColor.rgb, tint, 0.4 * inside);
  col = mix(col, tint * 0.5, mark * fade * 0.65 * inside);
  col = mix(col, vec3(0.05, 0.1, 0.18), contour * 0.55 * inside);
  diffuseColor.rgb = col;
}`);
  };
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}+overlay`;
  return material;
}

/** Props for a building or guest material: it fades toward a pale tone while `overlayDim` is up. */
function dimCompile(shader: { uniforms: Record<string, unknown>; fragmentShader: string }) {
  shader.uniforms.uOverlayDim = overlayDim;
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform float uOverlayDim;")
    .replace(
      "#include <dithering_fragment>",
      "#include <dithering_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.8, 0.85, 0.9), uOverlayDim * 0.55);",
    );
}
export const OVERLAY_DIM = {
  onBeforeCompile: dimCompile,
  customProgramCacheKey: () => "overlayDim",
};
