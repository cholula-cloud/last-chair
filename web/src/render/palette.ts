/**
 * Art pass 1 palette. Anchors from docs/ART_DIRECTION.md (navy, snow, amber,
 * pine) plus the extended diorama colours. Keep scene colours here so the
 * look can be tuned in one place.
 */
export const PALETTE = {
  navy: "#0b1628",
  snow: "#f8fbff",
  amber: "#e85d26",
  pine: "#1e5e41",

  snowShade: "#b9d4f7",
  snowWarm: "#fff8eb",
  snowOld: "#d9e3f0",
  /** Scraped, icy snow on a worn trail segment. */
  snowIce: "#c2d4e8",
  rock: "#6b7382",
  earth: "#7a6850",
  pineDeep: "#194f39",
  /** Lighter green for cone tips (barely any snow). */
  pineTip: "#348a5e",
  /** Soft green-blue wash under forest snow (terrain vertex tint). */
  forestFloor: "#527c7a",
  trimWhite: "#f6efe2",
  pineCool: "#246e4c",
  bark: "#5c3a24",
  barnRed: "#c93b2b",
  clapboard: "#f2ece1",
  shutter: "#24313f",
  roofSlate: "#2d3b4e",
  stone: "#87847e",
  window: "#ffc46b",
  steel: "#56616e",
  cable: "#222933",
  road: "#455061",

  white: "#ffffff",
  ink: "#2c333b",
  inkDeep: "#1b2129",
  silver: "#c9cfd6",
  poleGrey: "#9aa4b0",
  yellow: "#f6c700",
  deckWood: "#7c5234",
  doorWood: "#4a2e1d",
  cafeRoof: "#2f5a4c",
  shopBlue: "#26547c",

  /** Build-preview ghosts and the followed-guest marker. */
  valid: "#3fd27a",
  invalid: "#ff2a2a",
  marker: "#ffb020",

  /** Skier kit. */
  pants: "#222a36",
  skin: "#f1c7a3",

  skyTop: "#4fa0e8",
  skyMid: "#9ad7f5",
  /** Day horizon: crisp winter air with subtle alpine lift. */
  skyHorizon: "#dceffc",
  ridgeNear: "#7aa3cf",
  ridgeMid: "#9abce0",
  ridgeFar: "#bed7f0",

  nightSkyTop: "#081226",
  nightHorizon: "#24365a",

  overcastTop: "#9bb3cc",
  duskHorizon: "#ffd2a8",
  sunMorning: "#ffe8c8",
  sunDay: "#fff6e3",
  sunDusk: "#ffc088",
  sunNight: "#9db4ff",
  hemiSkyDay: "#9ed0ff",
  hemiSkyDusk: "#d4b8dc",
  hemiGroundDay: "#d6e6f6",
  hemiGroundDusk: "#ead6be",
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
