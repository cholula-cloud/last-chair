/**
 * Where the paint brush is on the ground right now. Written by the pointer handlers and read by
 * the brush cursor inside the frame loop, so pointer moves never re-render React.
 */
export const brushState = { x: 0, z: 0, visible: false };
