"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { LiftLine } from "@/game/descent";
import { formatMoney } from "@/game/format";
import { TERRAIN, type XZ } from "@/game/terrain";
import type { LiftType } from "@/game/types";
import type { LiftReadout } from "@/ui/liftGesture";
import { Lift } from "./Lift";
import { LIFT_TERMINAL_H } from "./layout";
import { PALETTE } from "./palette";
import { useReducedMotion } from "./useReducedMotion";

/** Time constant of the follow spring, in seconds. */
export const FOLLOW_TAU = 0.09;
const PULSE_MS = 180;
const PULSE_PEAK = 0.18;
const PAD_RADIUS = 0.35;
const DOT_RADIUS = 0.22;

const lerpXZ = (from: XZ, to: XZ, k: number): XZ => ({
  x: from.x + (to.x - from.x) * k,
  z: from.z + (to.z - from.z) * k,
});
const gap = (a: XZ, b: XZ) => Math.hypot(a.x - b.x, a.z - b.z);

/** A flat ring that sits on the ground at its group's origin. */
function PadRing({ color }: { color: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
      <ringGeometry args={[PAD_RADIUS * 0.78, PAD_RADIUS, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

/** Small flat dot marking a buildable top for the current bottom. */
function AnchorDot({ at }: { at: XZ }) {
  return (
    <mesh position={[at.x, TERRAIN.height(at.x, at.z) + 0.14, at.z]} rotation-x={-Math.PI / 2} renderOrder={3}>
      <circleGeometry args={[DOT_RADIUS, 20]} />
      <meshBasicMaterial color={PALETTE.valid} transparent opacity={0.6} depthTest={false} depthWrite={false} />
    </mesh>
  );
}

/**
 * The lift ghost: a true-scale preview of the draft line, anchor dots, terminal pads and a live
 * length and price label. The pads and the label chase the draft on a short spring by mutating
 * group refs; the cable and towers are built from the draft itself, so nothing re-renders per frame.
 */
export function LiftGhost({ line, bottom, type, readout, snapped, anchors }: {
  line: LiftLine | null;
  bottom: XZ;
  type: LiftType;
  readout: LiftReadout | null;
  snapped: boolean;
  anchors: readonly XZ[];
}) {
  const topGroup = useRef<Group>(null);
  const bottomGroup = useRef<Group>(null);
  const pulse = useRef<Group>(null);
  const shown = useRef<{ top: XZ | null; bottom: XZ | null }>({ top: null, bottom: null });
  const pulseStart = useRef<number | null>(null);
  const target = useRef({ top: line?.top ?? null, bottom });
  const reduced = useReducedMotion();

  useEffect(() => {
    target.current = { top: line?.top ?? null, bottom };
  }, [line, bottom]);

  const snapKey = snapped && line ? `${line.top.x}/${line.top.z}` : null;
  useEffect(() => {
    if (snapKey && !reduced.current) pulseStart.current = performance.now();
  }, [snapKey, reduced]);

  useFrame((_, dt) => {
    const k = reduced.current ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) / FOLLOW_TAU);
    const { top: wantTop, bottom: wantBottom } = target.current;
    const s = shown.current;
    s.bottom = s.bottom ? lerpXZ(s.bottom, wantBottom, k) : wantBottom;
    if (gap(s.bottom, wantBottom) < 0.002) s.bottom = wantBottom;
    if (!wantTop) s.top = null;
    else {
      s.top = s.top ? lerpXZ(s.top, wantTop, k) : wantTop;
      if (gap(s.top, wantTop) < 0.002) s.top = wantTop;
    }

    const place = (group: Group | null, at: XZ | null) => {
      if (!group) return;
      group.visible = !!at;
      if (at) group.position.set(at.x, TERRAIN.height(at.x, at.z) + 0.15, at.z);
    };
    place(bottomGroup.current, s.bottom);
    place(topGroup.current, s.top);

    if (pulse.current) {
      let scale = 1;
      const start = pulseStart.current;
      if (start !== null) {
        const t = (performance.now() - start) / PULSE_MS;
        if (t >= 1) pulseStart.current = null;
        else scale = 1 + PULSE_PEAK * Math.sin(Math.PI * t);
      }
      pulse.current.scale.setScalar(scale);
    }
  });

  const color = readout && !readout.ok ? PALETTE.invalid : PALETTE.valid;
  const dotAnchors = anchors.filter((a) => !line || gap(a, line.top) > DOT_RADIUS * 2);

  return (
    <>
      {dotAnchors.map((at) => <AnchorDot key={`${at.x}/${at.z}`} at={at} />)}
      {line && <Lift line={line} type={type} preview previewInvalid={!!readout && !readout.ok} />}
      <group ref={bottomGroup} visible={false}>
        <PadRing color={color} />
      </group>
      <group ref={topGroup} visible={false}>
        <group ref={pulse}>
          <PadRing color={color} />
        </group>
        {readout && (
          <Html position={[0, LIFT_TERMINAL_H + 0.7, 0]} center zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}>
            <div className="flex gap-1 whitespace-nowrap" style={{ pointerEvents: "none" }}>
              <span className="chip px-2 py-0.5 text-xs font-extrabold tabular-nums">
                {readout.lengthFt.toLocaleString("en-US")} ft
              </span>
              <span className="chip px-2 py-0.5 text-xs font-extrabold tabular-nums"
                style={{ background: "var(--gold)" }}>
                {formatMoney(readout.cost)}
              </span>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
