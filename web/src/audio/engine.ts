import { isAudible, mixGains, type BusId, type Gains } from "./mix";
import { createSampleLibrary } from "./samples";
import { SYNTH, startBed, type Bed, type BedMood, type SoundId } from "./synth";

const BASE_PATH = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_BASE_PATH ?? "" : "";

/** Seconds a sound must wait after the previous one of its kind, so a drag of taps does not buzz. */
const MIN_GAP: Record<SoundId, number> = { tap: 0.04, thunk: 0.15, sting: 0.5, chime: 0.5, dial: 0.08 };
/** Seconds a bus gain takes to follow a slider, so dragging one does not click. */
const GAIN_SMOOTHING = 0.03;

export type EngineDeps = {
  /** Returns a new context, or null when the browser has no Web Audio. */
  createContext: () => AudioContext | null;
  /** Sets the iOS audio session type. Optional; the default feature-detects navigator.audioSession. */
  setSessionType?: (type: "ambient") => void;
  basePath?: string;
};

type Graph = { master: GainNode } & Record<BusId, GainNode>;

/**
 * Web Audio engine with three buses (effects, ambience, voice) feeding one master gain.
 * Nothing is created until unlock() runs inside a user gesture, which iOS Safari requires.
 */
export function createAudioEngine(deps: EngineDeps) {
  const samples = createSampleLibrary(deps.basePath ?? BASE_PATH);
  let ctx: AudioContext | null = null;
  let graph: Graph | null = null;
  let gains: Gains = mixGains({ soundOn: true, masterVolume: 80, effectsVolume: 80, ambienceVolume: 50, voiceOn: true, voiceVolume: 80 });
  let mood: BedMood | null = null;
  let bed: Bed | null = null;
  let hidden = false;
  let unlocked = false;
  let bedsAllowed = false;
  const lastPlayed: Partial<Record<SoundId, number>> = {};
  const routed = new WeakSet<HTMLMediaElement>();

  function applyGains(): void {
    if (!ctx || !graph) return;
    const t = ctx.currentTime;
    graph.master.gain.setTargetAtTime(gains.master, t, GAIN_SMOOTHING);
    graph.effects.gain.setTargetAtTime(gains.effects, t, GAIN_SMOOTHING);
    graph.ambience.gain.setTargetAtTime(gains.ambience, t, GAIN_SMOOTHING);
    graph.voice.gain.setTargetAtTime(gains.voice, t, GAIN_SMOOTHING);
  }

  function startBedForMood(c: AudioContext, next: BedMood): Bed {
    if (bedsAllowed) {
      const sample = samples.startBed(c, graph!.ambience, next);
      if (sample) return sample;
    }
    return startBed(c, graph!.ambience, next);
  }

  /** Runs the wind bed only while it can be heard, so a muted run costs no audio work. */
  function syncBed(): void {
    if (!ctx || !graph) return;
    const wanted = mood !== null && !hidden && isAudible(gains, "ambience");
    if (wanted && !bed && mood) bed = startBedForMood(ctx, mood);
    else if (!wanted && bed) {
      bed.stop(ctx);
      bed = null;
    }
  }

  function build(): boolean {
    if (ctx) return true;
    let created: AudioContext | null = null;
    try {
      created = deps.createContext();
    } catch {
      created = null;
    }
    if (!created) return false;
    ctx = created;
    const master = ctx.createGain();
    master.connect(ctx.destination);
    const c = ctx;
    const bus = () => {
      const node = c.createGain();
      node.connect(master);
      return node;
    };
    graph = { master, effects: bus(), ambience: bus(), voice: bus() };
    applyGains();
    return true;
  }

  return {
    /** Creates the context if needed and resumes it. Call from pointerup, touchend, click or keydown. */
    unlock(): void {
      if (unlocked && ctx?.state === "running") return;
      if (!build() || !ctx) return;
      unlocked = true;
      deps.setSessionType?.("ambient");
      if (ctx.state !== "running" && !hidden) void Promise.resolve(ctx.resume()).catch(() => undefined);
      void samples.loadEffects(ctx).finally(() => syncBed());
      if (bedsAllowed) void samples.loadBeds(ctx).finally(() => syncBed());
      syncBed();
    },
    get state(): AudioContextState | "none" {
      return ctx ? ctx.state : "none";
    },
    /** True once a gesture has run and the context can play. */
    get running(): boolean {
      return ctx?.state === "running";
    },
    setMix(next: Gains): void {
      gains = next;
      applyGains();
      syncBed();
    },
    get gains(): Gains {
      return gains;
    },
    /** Plays a sound on the effects bus. Does nothing before unlock, while muted, or when hidden. */
    play(id: SoundId): void {
      if (!ctx || !graph || ctx.state !== "running" || hidden || !isAudible(gains, "effects")) return;
      const t = ctx.currentTime;
      const last = lastPlayed[id];
      if (last !== undefined && t - last < MIN_GAP[id]) return;
      lastPlayed[id] = t;
      if (!samples.playEffect(ctx, graph.effects, id, t)) SYNTH[id](ctx, graph.effects, t);
    },
    prepareBeds(): void {
      if (bedsAllowed) return;
      bedsAllowed = true;
      if (!ctx || !unlocked) return;
      void samples.loadBeds(ctx).finally(() => {
        if (bed && ctx && mood && samples.hasBed(mood)) {
          bed.stop(ctx);
          bed = null;
        }
        syncBed();
      });
    },
    /** Sets the wind bed: "day", "night", or null for none. */
    setBed(next: BedMood | null): void {
      const prev = mood;
      mood = next;
      if (bed && ctx) {
        if (next === null) {
          bed.stop(ctx);
          bed = null;
        } else if (bedsAllowed && (samples.hasBed(next) || (prev && samples.hasBed(prev)))) {
          if (prev !== next) {
            bed.stop(ctx);
            bed = null;
          }
        } else if (prev !== next) {
          bed.setMood(ctx, next);
        }
      }
      syncBed();
    },
    /** Tab hidden: suspend the context. Tab visible: resume it if a gesture already unlocked it. */
    setHidden(next: boolean): void {
      hidden = next;
      if (!ctx) return;
      if (next) {
        syncBed();
        void Promise.resolve(ctx.suspend()).catch(() => undefined);
      } else if (unlocked) {
        void Promise.resolve(ctx.resume()).catch(() => undefined);
        syncBed();
      }
    },
    /**
     * Sends a media element (the cold-open voice-over) through the voice bus. Returns false when
     * the context is not running; the caller then plays it directly at a volume from voiceFallbackVolume().
     */
    routeVoice(el: HTMLMediaElement): boolean {
      if (!ctx || !graph || ctx.state !== "running") return false;
      if (routed.has(el)) return true;
      try {
        ctx.createMediaElementSource(el).connect(graph.voice);
      } catch {
        return false;
      }
      routed.add(el);
      return true;
    },
    /** Volume (0 to 1) for a voice element that is not routed through the bus. */
    voiceFallbackVolume(): number {
      return gains.master * gains.voice;
    },
    /** True when the voice-over would be heard through master and voice. */
    voiceAudible(): boolean {
      return isAudible(gains, "voice");
    },
    /** For tests: the nodes the engine built. */
    get nodes(): Graph | null {
      return graph;
    },
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;

function defaultContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor({ latencyHint: "interactive" }) : null;
}

function setIosSession(type: "ambient"): void {
  // Safari 16.4 and later. "ambient" follows the silent switch and mixes with the player's music.
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = type;
}

/** The shared engine used by the game. */
export const audio: AudioEngine = createAudioEngine({ createContext: defaultContext, setSessionType: setIosSession });
