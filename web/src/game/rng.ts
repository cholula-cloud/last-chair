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
