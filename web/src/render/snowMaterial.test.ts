import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { patchSnowMaterial } from "./snowMaterial";

describe("patchSnowMaterial", () => {
  it("injects snow shader chunks", () => {
    const mat = patchSnowMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }));
    let source = "";
    const shader = {
      uniforms: {},
      vertexShader: "#include <common>\n#include <begin_vertex>",
      fragmentShader: "#include <common>\n#include <color_fragment>",
    } as THREE.WebGLProgramParametersWithUniforms;
    mat.onBeforeCompile?.(shader, {} as THREE.WebGLRenderer);
    const compile = mat.onBeforeCompile!;
    compile(shader, {} as THREE.WebGLRenderer);
    mat.onBeforeCompile = (s) => {
      source = `${s.vertexShader}\n${s.fragmentShader}`;
    };
    mat.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(source).toContain("vTrail");
    expect(source).toContain("uGroomStrength");
    expect(source).toContain("snowHash");
    expect(mat.customProgramCacheKey?.()).toContain("snow");
  });
});