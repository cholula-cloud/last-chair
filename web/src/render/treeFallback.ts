import * as THREE from "three";
import { PALETTE } from "./palette";

type Tier = { y0: number; y1: number; r: number; base: string };

function coneTip(base: THREE.Color): THREE.Color {
  return base.clone().lerp(new THREE.Color(PALETTE.pineTip), 0.55).lerp(new THREE.Color(PALETTE.snow), 0.12);
}

function pushCone(pos: number[], col: number[], tier: Tier, sides: number, twist: number) {
  const base = new THREE.Color(tier.base);
  const tip = coneTip(base);
  for (let i = 0; i < sides; i++) {
    const a0 = twist + (i / sides) * Math.PI * 2;
    const a1 = twist + ((i + 1) / sides) * Math.PI * 2;
    pos.push(
      Math.cos(a0) * tier.r, tier.y0, Math.sin(a0) * tier.r,
      Math.cos(a1) * tier.r, tier.y0, Math.sin(a1) * tier.r,
      0, tier.y1, 0,
    );
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
}

function build(pos: number[], col: number[], normals?: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  if (normals) g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  else g.computeVertexNormals();
  return g;
}

/** Low graphics: one cone shared by all pine variants. */
export function leasePineLow(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  pushCone(pos, col, { y0: 0.04, y1: 1, r: 0.52, base: PALETTE.pineDeep }, 4, 0);
  return build(pos, col);
}

/** Shadow-only cone sized for kit crowns. */
export function shadowProxyLow(): THREE.BufferGeometry {
  return new THREE.ConeGeometry(0.38, 0.92, 4, 1, true).translate(0, 0.5, 0);
}

/** Far ring: three crossed billboard planes, kit-like tier colours. */
export function farTreeImpostor(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const tiers = [
    { y0: 0.04, y1: 0.62, hw: 0.58, base: PALETTE.pineDeep },
    { y0: 0.36, y1: 1, hw: 0.42, base: PALETTE.pine },
  ];
  for (let turn = 0; turn < 3; turn++) {
    const sn = Math.sin((turn * Math.PI) / 3);
    const cs = Math.cos((turn * Math.PI) / 3);
    for (const tier of tiers) {
      const base = new THREE.Color(tier.base);
      const tip = coneTip(base);
      const corner = (u: number, y: number) => [sn * u, y, cs * u];
      pos.push(...corner(-tier.hw, tier.y0), ...corner(tier.hw, tier.y0), ...corner(0, tier.y1));
      col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
      const n = [sn, 0, cs];
      nor.push(...n, ...n, ...n);
    }
  }
  return build(pos, col, nor);
}