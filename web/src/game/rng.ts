/** Seeded PRNG (mulberry32). `state()` can be saved and passed to `createRng` to resume. */
export type Rng = {
  /** Next float in [0, 1). */
  next(): number;
  /** Current 32-bit internal state. */
  state(): number;
};

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state() {
      return s;
    },
  };
}

/** A fixed integer avalanche for deriving seeds without drawing from a stream. */
export function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

/** Fixed stream salts. Keep these stable so old seeds reproduce their weather. */
export const STREAM = { WEATHER: 0x57ea7e2, RADIO: 0x4ad10, SURPRISE: 0x5a79e31 } as const;

export function streamFor(seed: number, stream: number): Rng {
  return createRng(mix32(seed ^ stream));
}
