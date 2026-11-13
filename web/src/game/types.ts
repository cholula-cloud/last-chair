export type FarePreset = "cheap" | "balanced" | "expensive";
export type SnowPreset = "minimal" | "mid" | "high";
export type GamePhase = "day" | "night";
export type GuestState =
  | "arrive"
  | "queue"
  | "ride"
  | "ski"
  | "depart";

export type Guest = {
  id: string;
  label: string;
  state: GuestState;
  progress: number;
  mood: number;
};

export type DayStats = {
  arrivals: number;
  completedRuns: number;
  avgQueueMin: number;
};

export const FARE_PRICES: Record<FarePreset, number> = {
  cheap: 35,
  balanced: 48,
  expensive: 62,
};

export const FARE_LABELS: Record<FarePreset, string> = {
  cheap: "Cheap",
  balanced: "Balanced",
  expensive: "Expensive",
};

export const SNOW_LABELS: Record<SnowPreset, string> = {
  minimal: "Minimal",
  mid: "Mid",
  high: "High",
};

export const SNOW_NIGHT_COST: Record<SnowPreset, number> = {
  minimal: 0,
  mid: 150,
  high: 350,
};

export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 16 * 60;
export const MS_PER_GAME_MINUTE = 500;
