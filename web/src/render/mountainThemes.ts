import type { MountainId } from "@/game/calendar";
import { PALETTE } from "./palette";

export type HorizonProfile = {
  valleyNotchDepth: number;
  bluffSharpness: number;
  valleyLightCount: number;
};

export type MountainVisualTheme = {
  id: MountainId;
  archTitle: string;
  archSubtitle: string;
  routeBadge: string;
  rock: string;
  forestFloor: string;
  ridgeNear: string;
  ridgeMid: string;
  ridgeFar: string;
  birchRatio: number;
  mapleRatio: number;
  rockThreshold: number;
  horizon: HorizonProfile;
};

const THEMES: Partial<Record<MountainId, MountainVisualTheme>> & { dutch_hill: MountainVisualTheme } = {
  dutch_hill: {
    id: "dutch_hill",
    archTitle: "DUTCH HILL",
    archSubtitle: "EST 1944  VT-100",
    routeBadge: "VT-100",
    rock: PALETTE.rock,
    forestFloor: PALETTE.forestFloor,
    ridgeNear: PALETTE.ridgeNear,
    ridgeMid: PALETTE.ridgeMid,
    ridgeFar: PALETTE.ridgeFar,
    birchRatio: 0.09,
    mapleRatio: 0,
    rockThreshold: 0.42,
    horizon: { valleyNotchDepth: 0.25, bluffSharpness: 1.0, valleyLightCount: 14 },
  },
  mount_tom: {
    id: "mount_tom",
    archTitle: "MOUNT TOM",
    archSubtitle: "EST 1962  US-5",
    routeBadge: "US-5",
    rock: "#3d4554",
    forestFloor: "#486b72",
    ridgeNear: "#6d88b0",
    ridgeMid: "#8da7cc",
    ridgeFar: "#b6cae6",
    birchRatio: 0.16,
    mapleRatio: 0,
    rockThreshold: 0.34,
    horizon: { valleyNotchDepth: 0.65, bluffSharpness: 1.45, valleyLightCount: 22 },
  },
  maple_valley: {
    id: "maple_valley",
    archTitle: "MAPLE VALLEY",
    archSubtitle: "EST 1963  VT-30",
    routeBadge: "VT-30",
    rock: "#6d6a66",
    forestFloor: "#5a796b",
    ridgeNear: "#84a4c4",
    ridgeMid: "#a5c0dc",
    ridgeFar: "#c8dcf0",
    birchRatio: 0.11,
    mapleRatio: 0.14,
    rockThreshold: 0.42,
    horizon: { valleyNotchDepth: 0.35, bluffSharpness: 1.1, valleyLightCount: 14 },
  },
};

export function mountainTheme(id: MountainId | string | undefined): MountainVisualTheme {
  return (id ? THEMES[id as MountainId] : undefined) ?? THEMES.dutch_hill;
}
