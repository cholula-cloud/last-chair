import type { SiteDef } from "../site";

/** Dutch Hill base area layout at H=6 world scale (see world scale 2b / 2d handoff). */
export const DUTCH_HILL_SITE: SiteDef = {
  arrival: {
    kind: "gravel_lot",
    center: { x: 7.2, z: 19.8 },
    size: { w: 5.0, d: 2.0 },
    yaw: 0,
    stalls: 30,
    rows: 2,
    overflow: {
      kind: "road_shoulder",
      spots: 12,
      from: { x: 10.5, z: 24 },
      to: { x: 24, z: 24 },
    },
  },
  road: { z: 24, xFrom: -16, xTo: 34, spur: [{ x: 7.2, z: 24 }, { x: 7.2, z: 20.9 }] },
  paths: [
    {
      id: "lot_lodge",
      points: [
        { x: 7.2, z: 18.55 },
        { x: 6.1, z: 16.85 },
        { x: 5.35, z: 15.62 },
      ],
    },
    {
      id: "lodge_lift",
      points: [
        { x: 5.3, z: 15.15 },
        { x: 4.0, z: 15.08 },
        { x: 2.85, z: 15.12 },
      ],
    },
  ],
  buildings: {
    lodge: { x: 5.3, z: 15.1, footprint: { width: 1.5, depth: 1.35 }, startingTier: 1 },
    warmingHut: { x: 3.6, z: 14.5 },
    cafe: { x: 7.7, z: 14.7 },
    shop: { x: 8.9, z: 15.9 },
    houses: [
      { at: { x: -4.2, z: 25.5 }, yaw: Math.PI },
      { at: { x: 1.05, z: 25.5 }, yaw: Math.PI + 0.08 },
    ],
    snowcat: { x: 9.0, z: 16.3, yaw: -1.2 },
  },
  berms: [
    { from: { x: 4.7, z: 20.8 }, to: { x: 9.7, z: 20.8 }, height: 0.25 },
    { from: { x: 9.7, z: 18.8 }, to: { x: 9.7, z: 20.8 }, height: 0.25 },
  ],
  signs: [
    { kind: "route_shield", at: { x: 5.5, z: 24.2 }, yaw: 0 },
    { kind: "area_sign", at: { x: 9.8, z: 20.0 }, yaw: -0.2, text: "Dutch Hill" },
  ],
  water: [],
  backdrop: { radii: [320, 420, 520] },
  homeFrame: [{ x: 4.7, z: 18.8 }],
};
