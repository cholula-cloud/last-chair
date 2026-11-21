/**
 * Art pass 1 palette. Anchors from docs/ART_DIRECTION.md (navy, snow, amber,
 * pine) plus the extended diorama colours. Keep scene colours here so the
 * look can be tuned in one place.
 */
export const PALETTE = {
  navy: "#0b1628",
  snow: "#f4f7fb",
  amber: "#e85d26",
  pine: "#2b6b48",

  snowShade: "#bccbec",
  snowWarm: "#fff4e4",
  snowOld: "#c8cfd9",
  /** Scraped, icy snow on a worn trail segment. */
  snowIce: "#8995a8",
  rock: "#5d5650",
  earth: "#7a6850",
  pineDeep: "#1a5238",
  /** Lighter green for cone tips (barely any snow). */
  pineTip: "#4a9a6a",
  trimWhite: "#f0ebe2",
  pineCool: "#327a58",
  bark: "#4a3526",
  barnRed: "#a8382b",
  clapboard: "#ece6da",
  shutter: "#24313f",
  roofSlate: "#3a4250",
  stone: "#8b8682",
  window: "#ffc46b",
  steel: "#56616e",
  cable: "#2b3138",
  road: "#6f7279",

  white: "#ffffff",
  ink: "#2c333b",
  inkDeep: "#1b2129",
  silver: "#c9cfd6",
  poleGrey: "#9aa4b0",
  yellow: "#f2c014",
  deckWood: "#8a6a4c",
  doorWood: "#3b2a20",
  cafeRoof: "#2f5a4c",
  shopBlue: "#4f6f8f",

  /** Build-preview ghosts and the followed-guest marker. */
  valid: "#3fd27a",
  invalid: "#ff2a2a",
  marker: "#ffb020",

  /** Skier kit. */
  pants: "#222a36",
  skin: "#f1c7a3",

  skyTop: "#8fb6e3",
  skyHorizon: "#e9e7e6",
  ridgeNear: "#7f93ad",
  ridgeMid: "#a3b2c8",
  ridgeFar: "#c3ccdb",

  nightSkyTop: "#081226",
  nightHorizon: "#24365a",

  overcastTop: "#aebfd4",
  duskHorizon: "#ffc9a0",
  sunMorning: "#ffe2c0",
  sunDay: "#fff0da",
  sunDusk: "#ffbd85",
  sunNight: "#9db4ff",
  hemiSkyDay: "#b4c6f2",
  hemiSkyDusk: "#c9b8d8",
  hemiGroundDay: "#e2d3bf",
  hemiGroundDusk: "#e8cdb0",
  hemiSkyNight: "#3b5188",
  hemiGroundNight: "#1a2236",
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
