import * as THREE from "three";
import { distanceOutsideLease } from "@/game/lease";
import { smoothstep } from "./math";

/** How much darker the land outside the lease gets in build modes; small, so it still reads as snow. */
export const DIM_AMOUNT = 0.08;
/** How far the outside land moves toward grey, from 0 to 1. */
export const DIM_DESATURATE = 0.12;
/** Distance outside the lease over which the dimming fades in, so the edge is not a hard step. */
export const DIM_FEATHER = 2.5;

/** Shared uniform: 0 outside build modes, 1 while building. Written by <LeaseBoundary>, read by shaders. */
export const leaseDim = { value: 0 };

/** Per-vertex or per-instance weight: 0 on the lease, 1 beyond the feather. */
export function outsideWeight(p: { x: number; z: number }): number {
  return smoothstep(0, DIM_FEATHER, distanceOutsideLease(p));
}

/**
 * Darkens a Lambert material by `aOut * leaseDim * DIM_AMOUNT`. The geometry must carry a
 * float attribute `aOut` (a plain attribute for a mesh, an instanced one for instances).
 */
export function patchLeaseDim<T extends THREE.Material>(material: T): T {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uLeaseDim = leaseDim;
    shader.uniforms.uLeaseDimAmount = { value: DIM_AMOUNT };
    shader.uniforms.uLeaseDimGrey = { value: DIM_DESATURATE };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aOut;\nvarying float vOut;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvOut = aOut;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uLeaseDim;\nuniform float uLeaseDimAmount;\nuniform float uLeaseDimGrey;\nvarying float vOut;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nfloat leaseK = uLeaseDim * vOut;\ndiffuseColor.rgb *= 1.0 - uLeaseDimAmount * leaseK;\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), uLeaseDimGrey * leaseK);");
  };
  const prevKey = material.customProgramCacheKey?.bind(material) ?? (() => "");
  material.customProgramCacheKey = () => `${prevKey()}+leaseDim`;
  return material;
}
