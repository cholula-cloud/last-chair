/** Opt-in camera diagnostics — open the game with `?cameraDebug=1`. */

export type CameraLockReason =
  | "guestFollow"
  | "returningHome"
  | "glide"
  | "tilt"
  | "buildNoPan"
  | "none";

export type CameraDebugEvent = { t: number; msg: string };

export type CameraDebugSnapshot = {
  followId: string | null;
  returning: boolean;
  interacting: boolean;
  glide: boolean;
  tilt: boolean;
  building: boolean;
  moveCamera: boolean;
  lockReason: CameraLockReason;
  targetDistFromHome: number;
  orbitState: number | null;
  eventLog: readonly CameraDebugEvent[];
};

const MAX_EVENTS = 24;

export function cameraDebugEnabled() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("cameraDebug");
}

const empty = (): CameraDebugSnapshot => ({
  followId: null,
  returning: false,
  interacting: false,
  glide: false,
  tilt: false,
  building: false,
  moveCamera: false,
  lockReason: "none",
  targetDistFromHome: 0,
  orbitState: null,
  eventLog: [],
});

let snapshot: CameraDebugSnapshot = empty();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export const cameraDebug = {
  getSnapshot(): CameraDebugSnapshot {
    return snapshot;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  push(msg: string) {
    if (!cameraDebugEnabled()) return;
    const t = Math.round(performance.now());
    const eventLog = [...snapshot.eventLog, { t, msg }].slice(-MAX_EVENTS);
    snapshot = { ...snapshot, eventLog };
    notify();
  },
  patch(patch: Partial<CameraDebugSnapshot>) {
    if (!cameraDebugEnabled()) return;
    snapshot = { ...snapshot, ...patch };
    notify();
  },
  reset() {
    snapshot = empty();
    notify();
  },
};

/** Which automated target motion is most likely to block a pan this frame. */
export function inferLockReason(input: {
  followId: string | null;
  returning: boolean;
  glide: boolean;
  tilt: boolean;
  building: boolean;
  moveCamera: boolean;
  interacting: boolean;
}): CameraLockReason {
  if (input.building && !input.moveCamera) return "buildNoPan";
  if (!input.interacting) {
    if (input.followId) return "guestFollow";
    if (input.returning) return "returningHome";
    if (input.glide) return "glide";
    if (input.tilt) return "tilt";
  }
  return "none";
}

/** OrbitControls `state` values that correspond to pan (three.js / three-stdlib). */
export const ORBIT_PAN_STATES = new Set([2, 4, 5]);