import { DAY_END_MIN, DAY_START_MIN, type WeatherKind } from "@/game/types";
import { clamp01, lerp, smoothstep } from "./math";
import { PALETTE } from "./palette";

export type RigInput = { clockMin: number; night: number; weather: WeatherKind };
export type Rig = {
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  skyTop: string;
  skyHorizon: string;
  fogNear: number;
  fogFar: number;
  exposure: number;
  glow: number;
  shadowStrength: number;
};

const NIGHT_RIG: Omit<Rig, "sunDir"> & { azimuth: number; elevation: number } = {
  azimuth: 200,
  elevation: 40,
  sunColor: PALETTE.sunNight,
  sunIntensity: 0.35,
  hemiSky: PALETTE.hemiSkyNight,
  hemiGround: PALETTE.hemiGroundNight,
  hemiIntensity: 0.75,
  skyTop: PALETTE.nightSkyTop,
  skyHorizon: PALETTE.nightHorizon,
  fogNear: 140,
  fogFar: 420,
  exposure: 0.9,
  glow: 1.15,
  shadowStrength: 1,
};

type DayKey = {
  min: number;
  azimuth: number;
  elevation: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  skyTop: string;
  skyHorizon: string;
  glow: number;
  exposure: number;
};

const DAY_KEYS: DayKey[] = [
  {
    min: DAY_START_MIN,
    azimuth: 108,
    elevation: 24,
    sunColor: PALETTE.sunMorning,
    sunIntensity: 2.55,
    hemiSky: PALETTE.hemiSkyDay,
    hemiGround: PALETTE.hemiGroundDay,
    hemiIntensity: 1.15,
    skyTop: PALETTE.skyTop,
    skyHorizon: PALETTE.skyHorizon,
    glow: 0.62,
    exposure: 1.04,
  },
  {
    min: 8 * 60,
    azimuth: 112,
    elevation: 25,
    sunColor: PALETTE.sunMorning,
    sunIntensity: 2.6,
    hemiSky: PALETTE.hemiSkyDay,
    hemiGround: PALETTE.hemiGroundDay,
    hemiIntensity: 1.15,
    skyTop: PALETTE.skyTop,
    skyHorizon: PALETTE.skyHorizon,
    glow: 0.62,
    exposure: 1.04,
  },
  {
    min: 12 * 60,
    azimuth: 170,
    elevation: 32,
    sunColor: PALETTE.sunDay,
    sunIntensity: 2.75,
    hemiSky: PALETTE.hemiSkyDay,
    hemiGround: PALETTE.hemiGroundDay,
    hemiIntensity: 1.15,
    skyTop: PALETTE.skyTop,
    skyHorizon: PALETTE.skyHorizon,
    glow: 0.62,
    exposure: 1.04,
  },
  {
    min: 15 * 60 + 30,
    azimuth: 226,
    elevation: 16,
    sunColor: PALETTE.sunDusk,
    sunIntensity: 2.2,
    hemiSky: PALETTE.hemiSkyDusk,
    hemiGround: PALETTE.hemiGroundDusk,
    hemiIntensity: 1.1,
    skyTop: PALETTE.skyTop,
    skyHorizon: PALETTE.duskHorizon,
    glow: 0.85,
    exposure: 1.02,
  },
  {
    min: DAY_END_MIN,
    azimuth: 236,
    elevation: 13,
    sunColor: PALETTE.sunDusk,
    sunIntensity: 1.85,
    hemiSky: PALETTE.hemiSkyDusk,
    hemiGround: PALETTE.hemiGroundDusk,
    hemiIntensity: 1.05,
    skyTop: PALETTE.skyTop,
    skyHorizon: PALETTE.duskHorizon,
    glow: 0.92,
    exposure: 1.0,
  },
];

const OUT: Rig = {
  sunDir: [0, 1, 0],
  sunColor: PALETTE.sunDay,
  sunIntensity: 2.5,
  hemiSky: PALETTE.hemiSkyDay,
  hemiGround: PALETTE.hemiGroundDay,
  hemiIntensity: 1.25,
  skyTop: PALETTE.skyTop,
  skyHorizon: PALETTE.skyHorizon,
  fogNear: 140,
  fogFar: 420,
  exposure: 1,
  glow: 0.62,
  shadowStrength: 1,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(clamp01(n / 255) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(lerp(ar, br, t), lerp(ag, bg, t), lerp(ab, bb, t));
}

function sampleDay(clockMin: number): DayKey {
  if (clockMin <= DAY_KEYS[0].min) return DAY_KEYS[0];
  for (let i = 0; i < DAY_KEYS.length - 1; i++) {
    const a = DAY_KEYS[i];
    const b = DAY_KEYS[i + 1];
    if (clockMin <= b.min) {
      const t = (clockMin - a.min) / (b.min - a.min);
      return {
        min: clockMin,
        azimuth: lerp(a.azimuth, b.azimuth, t),
        elevation: Math.max(10, lerp(a.elevation, b.elevation, t)),
        sunColor: lerpHex(a.sunColor, b.sunColor, t),
        sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
        hemiSky: lerpHex(a.hemiSky, b.hemiSky, t),
        hemiGround: lerpHex(a.hemiGround, b.hemiGround, t),
        hemiIntensity: lerp(a.hemiIntensity, b.hemiIntensity, t),
        skyTop: lerpHex(a.skyTop, b.skyTop, t),
        skyHorizon: lerpHex(a.skyHorizon, b.skyHorizon, t),
        glow: lerp(a.glow, b.glow, t),
        exposure: lerp(a.exposure, b.exposure, t),
      };
    }
  }
  return DAY_KEYS[DAY_KEYS.length - 1];
}

/** Sun direction from azimuth (degrees from +X toward -Z) and elevation degrees. */
export function sunDirection(azimuthDeg: number, elevationDeg: number): [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  const h = Math.cos(el);
  const x = Math.cos(az) * h;
  const y = Math.sin(el);
  const z = -Math.sin(az) * h;
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

export function sunElevationDeg(azimuthDeg: number, dir: [number, number, number]): number {
  return (Math.asin(dir[1]) * 180) / Math.PI;
}

export function sunAzimuthDeg(dir: [number, number, number]): number {
  let deg = (Math.atan2(-dir[2], dir[0]) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function applyWeather(base: DayKey, weather: WeatherKind): DayKey {
  const out = { ...base };
  const snowLike = weather === "snow" || weather === "storm";
  if (snowLike) {
    out.sunIntensity *= 0.65;
    out.hemiIntensity *= 1.2;
    out.skyTop = lerpHex(out.skyTop, PALETTE.overcastTop, 0.6);
    if (weather === "storm") {
      out.skyHorizon = lerpHex(out.skyHorizon, PALETTE.overcastTop, 0.55);
    }
  } else if (weather === "thaw") {
    out.sunIntensity *= 1.08;
    out.skyHorizon = lerpHex(out.skyHorizon, PALETTE.duskHorizon, 0.35);
  }
  return out;
}

function blendDayNight(day: DayKey, night: number): void {
  const n = clamp01(night);
  const azimuth = lerp(day.azimuth, NIGHT_RIG.azimuth, n);
  const elevation = lerp(day.elevation, NIGHT_RIG.elevation, n);
  OUT.sunDir = sunDirection(azimuth, elevation);
  OUT.sunColor = lerpHex(day.sunColor, NIGHT_RIG.sunColor, n);
  OUT.sunIntensity = lerp(day.sunIntensity, NIGHT_RIG.sunIntensity, n);
  OUT.hemiSky = lerpHex(day.hemiSky, NIGHT_RIG.hemiSky, n);
  OUT.hemiGround = lerpHex(day.hemiGround, NIGHT_RIG.hemiGround, n);
  OUT.hemiIntensity = lerp(day.hemiIntensity, NIGHT_RIG.hemiIntensity, n);
  OUT.skyTop = lerpHex(day.skyTop, NIGHT_RIG.skyTop, n);
  OUT.skyHorizon = lerpHex(day.skyHorizon, NIGHT_RIG.skyHorizon, n);
  OUT.fogNear = lerp(140, NIGHT_RIG.fogNear, n);
  OUT.fogFar = lerp(420, NIGHT_RIG.fogFar, n);
  OUT.exposure = lerp(day.exposure, NIGHT_RIG.exposure, n);
  OUT.glow = lerp(day.glow, NIGHT_RIG.glow, n);
  OUT.shadowStrength = 1 - n * 0.15;
}

function writeRig(target: Rig, source: Rig): void {
  target.sunDir = source.sunDir;
  target.sunColor = source.sunColor;
  target.sunIntensity = source.sunIntensity;
  target.hemiSky = source.hemiSky;
  target.hemiGround = source.hemiGround;
  target.hemiIntensity = source.hemiIntensity;
  target.skyTop = source.skyTop;
  target.skyHorizon = source.skyHorizon;
  target.fogNear = source.fogNear;
  target.fogFar = source.fogFar;
  target.exposure = source.exposure;
  target.glow = source.glow;
  target.shadowStrength = source.shadowStrength;
}

/** Pure lighting rig; writes into a reused object (default `OUT`). */
export function lightRig(i: RigInput, scale: { horizontal: number }, out: Rig = OUT): Rig {
  if (i.night >= 1) {
    OUT.sunDir = sunDirection(NIGHT_RIG.azimuth, NIGHT_RIG.elevation);
    OUT.sunColor = NIGHT_RIG.sunColor;
    OUT.sunIntensity = NIGHT_RIG.sunIntensity;
    OUT.hemiSky = NIGHT_RIG.hemiSky;
    OUT.hemiGround = NIGHT_RIG.hemiGround;
    OUT.hemiIntensity = NIGHT_RIG.hemiIntensity;
    OUT.skyTop = NIGHT_RIG.skyTop;
    OUT.skyHorizon = NIGHT_RIG.skyHorizon;
    OUT.fogNear = NIGHT_RIG.fogNear;
    OUT.fogFar = NIGHT_RIG.fogFar;
    OUT.exposure = NIGHT_RIG.exposure;
    OUT.glow = NIGHT_RIG.glow;
    OUT.shadowStrength = NIGHT_RIG.shadowStrength;
    if (out !== OUT) writeRig(out, OUT);
    return out;
  }
  const day = applyWeather(sampleDay(i.clockMin), i.weather);
  const dusk = smoothstep(14 * 60, 16 * 60, i.clockMin) * (1 - clamp01(i.night));
  if (dusk > 0) {
    day.sunIntensity *= 1 - dusk * 0.25;
    day.glow = lerp(day.glow, 0.85, dusk);
    day.skyHorizon = lerpHex(day.skyHorizon, PALETTE.duskHorizon, dusk * 0.7);
    day.sunColor = lerpHex(day.sunColor, PALETTE.sunDusk, dusk);
  }
  blendDayNight(day, i.night);
  void scale;
  if (out !== OUT) writeRig(out, OUT);
  return out;
}

/** Distance from the shadow target to place the directional light. */
export function sunDistance(scale: { horizontal: number }): number {
  return 60 * (scale.horizontal / 6);
}