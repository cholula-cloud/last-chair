/** Hooks between the camera rig and the pointer handlers, so neither re-renders React. */
export const cameraBus: {
  /** Set by the camera rig: stops any running glide or tilt. */
  cancelMotion: (() => void) | null;
  /** True while the paint tilt is still moving; painting waits until it settles. */
  settling: boolean;
} = { cancelMotion: null, settling: false };
