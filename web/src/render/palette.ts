/**
 * Art pass 1 palette. Anchors from docs/ART_DIRECTION.md (navy, snow, amber,
 * pine) plus the extended diorama colours. Keep scene colours here so the
 * look can be tuned in one place.
 */
export const PALETTE = {
  navy: "#0b1628",
  snow: "#f4f7fb",
  amber: "#e85d26",
  pine: "#2d5a4a",

  snowShade: "#bccbec",
  snowWarm: "#fff4e4",
  snowOld: "#c8cfd9",
  rock: "#5d5650",
  earth: "#7a6850",
  pineDeep: "#1f4a3d",
  pineCool: "#356b5e",
  pineOlive: "#3f6b4a",
  bark: "#4a3526",
  barnRed: "#a8382b",
  clapboard: "#ece6da",
  shutter: "#24313f",
  roofSlate: "#3a4250",
  stone: "#8b8682",
  lampGlow: "#ffb35c",
  window: "#ffc46b",
  steel: "#56616e",
  cable: "#2b3138",
  road: "#6f7279",

  skyTop: "#8fb6e3",
  skyHorizon: "#e9e7e6",
  ridgeNear: "#7f93ad",
  ridgeMid: "#a3b2c8",
  ridgeFar: "#c3ccdb",

  nightSkyTop: "#081226",
  nightHorizon: "#24365a",
} as const;

/** Bright jacket colours for guests. */
export const JACKETS = [
  "#d7263d",
  "#f2c014",
  "#0fa3a3",
  "#f2711c",
  "#7b4fc9",
  "#2f7de1",
  "#e8467c",
] as const;

/** Beanie / helmet colours. */
export const HATS = ["#f4f7fb", "#1d2633", "#e85d26", "#2f7de1", "#f2c014", "#d7263d"] as const;

/** Direction toward the sun (normalised), late-morning from the east-southeast. */
export const SUN_DIR: [number, number, number] = (() => {
  const v = [7, 10, 6];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

/** Centre of the playable hill, used by camera, lights and shadows. */
export const HILL_CENTER = { x: 0.6, y: 1.2, z: 0.2 } as const;
