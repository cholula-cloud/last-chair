import type { PerspectiveCamera } from "three";
import type { GameState } from "@/game/state";
import type { LiftType } from "@/game/types";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { PaintStroke } from "@/game/paintedTrail";
import { liftBottomAt, liftDrag, liftPress, liftTopAt, type LiftGrab } from "@/ui/liftGesture";
import type { LiftPhase } from "@/ui/placementDraft";
import { usePlacementDraft } from "@/ui/placementDraft";
import { brushState } from "./brushState";
import { MAX_STROKE_POINTS, PAN_MOVE_PX } from "./paintAssist";
import { LIFT_BUILD_ANCHORS, snapRadiusAtHit } from "./placementTap";

const MIN_POINT_DISTANCE = 0.1;

export function flushTrailPending(pending: XZ[]) {
  if (!pending.length) return;
  const draft = usePlacementDraft.getState();
  if (draft.kind !== "trail") {
    pending.length = 0;
    return;
  }
  const stroke: PaintStroke = draft.activeStroke ?? {
    points: [], widthFt: draft.brushWidth, erase: draft.erasing,
  };
  usePlacementDraft.setState({
    tapPoint: pending[pending.length - 1],
    activeStroke: { ...stroke, points: [...stroke.points, ...pending] },
  });
  pending.length = 0;
}

/** Queue a stroke point; at the cap it stops taking points and says why once. */
export function queueTrailPoint(
  pending: XZ[],
  full: { current: boolean },
  raw: XZ,
  immediate: boolean,
) {
  const stroke = usePlacementDraft.getState().activeStroke;
  const last = pending.length ? pending[pending.length - 1] : stroke?.points.at(-1);
  const count = (stroke?.points.length ?? 0) + pending.length;
  if (count >= MAX_STROKE_POINTS) {
    if (!full.current) {
      full.current = true;
      usePlacementDraft.setState({ strokeFull: true });
    }
    return;
  }
  if (last && Math.hypot(last.x - raw.x, last.z - raw.z) < MIN_POINT_DISTANCE) return;
  pending.push(raw);
  if (immediate) flushTrailPending(pending);
}

export function pointerTrailMove(
  raw: XZ,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  pressing: boolean,
  screen: { x: number; y: number; down: boolean; movedAt: number },
) {
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  if (pressing || !screen.down || Math.hypot(sx - screen.x, sy - screen.y) >= PAN_MOVE_PX) {
    screen.movedAt = performance.now();
  }
  screen.x = sx;
  screen.y = sy;
  screen.down = true;
  brushState.x = raw.x;
  brushState.z = raw.z;
  brushState.visible = true;
}

export function pointerLiftTap(
  game: GameState,
  type: LiftType,
  phase: LiftPhase,
  draft: ReturnType<typeof usePlacementDraft.getState>,
  raw: XZ,
  camera: PerspectiveCamera,
  canvasHeight: number,
): void {
  const y = TERRAIN.height(raw.x, raw.z);
  const radius = snapRadiusAtHit(camera, { ...raw, y }, canvasHeight);
  if (phase === "bottom") {
    usePlacementDraft.setState({
      bottom: liftBottomAt(raw),
      top: undefined,
      snapped: false,
      tapPoint: raw,
    });
    return;
  }
  if (phase === "top" && draft.bottom) {
    const next = liftTopAt(game, type, draft.bottom, raw, radius, LIFT_BUILD_ANCHORS);
    usePlacementDraft.setState({
      top: next.top,
      snapped: next.snapped,
      tapPoint: raw,
      liftPhase: "adjust",
    });
  }
}

export function pointerLiftMove(
  game: GameState,
  draft: ReturnType<typeof usePlacementDraft.getState>,
  type: LiftType,
  grab: LiftGrab,
  offset: XZ,
  raw: XZ,
  camera: PerspectiveCamera,
  canvasHeight: number,
  pressing: boolean,
): { grab: LiftGrab; offset: XZ } {
  if (draft.liftPhase === "bottom") {
    usePlacementDraft.setState({ bottom: liftBottomAt(raw), tapPoint: raw });
    return { grab: "bottom", offset: { x: 0, z: 0 } };
  }
  if (draft.liftPhase !== "adjust") return { grab, offset };
  const y = TERRAIN.height(raw.x, raw.z);
  const radius = snapRadiusAtHit(camera, { ...raw, y }, canvasHeight);
  if (pressing) {
    const press = liftPress(game, type, draft, raw, radius, LIFT_BUILD_ANCHORS);
    usePlacementDraft.setState(press.patch);
    return { grab: press.grab, offset: press.offset };
  }
  usePlacementDraft.setState(liftDrag(game, type, grab, offset, draft, raw, radius, LIFT_BUILD_ANCHORS));
  return { grab, offset };
}