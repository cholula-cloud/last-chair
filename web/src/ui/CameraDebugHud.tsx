"use client";

import { useEffect, useSyncExternalStore } from "react";
import { cameraDebug, cameraDebugEnabled, type CameraLockReason } from "@/render/cameraDebug";

const REASON_LABEL: Record<CameraLockReason, string> = {
  guestFollow: "Guest follow — pan fights target lerp",
  returningHome: "Return home — target easing to lodge view",
  glide: "Glide — scripted camera move",
  tilt: "Tilt — paint camera angle",
  buildNoPan: "Build — pan disabled",
  none: "None",
};

export function CameraDebugHud() {
  const enabled = cameraDebugEnabled();
  const snap = useSyncExternalStore(
    (fn) => (enabled ? cameraDebug.subscribe(fn) : () => () => {}),
    () => (enabled ? cameraDebug.getSnapshot() : null),
    () => null,
  );

  useEffect(() => {
    if (!enabled) return;
    cameraDebug.push("camera debug on");
    return () => cameraDebug.reset();
  }, [enabled]);

  if (!enabled || !snap) return null;

  const reason = REASON_LABEL[snap.lockReason];
  const hot = snap.lockReason !== "none";

  return (
    <aside
      data-camera-debug
      className="pointer-events-auto absolute right-2 top-16 z-[80] max-w-[min(20rem,90vw)] rounded-md border border-amber-500/50 bg-black/85 p-2 font-mono text-[10px] leading-snug text-amber-100 shadow-lg"
      aria-live="polite"
    >
      <div className="mb-1 font-semibold text-amber-300">Camera debug</div>
      <div className={hot ? "text-amber-400" : "text-emerald-300"}>
        lock: {snap.lockReason} — {reason}
      </div>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-neutral-300">
        <dt>followId</dt>
        <dd>{snap.followId ?? "—"}</dd>
        <dt>returning</dt>
        <dd>{String(snap.returning)}</dd>
        <dt>interacting</dt>
        <dd>{String(snap.interacting)}</dd>
        <dt>glide</dt>
        <dd>{String(snap.glide)}</dd>
        <dt>tilt</dt>
        <dd>{String(snap.tilt)}</dd>
        <dt>build</dt>
        <dd>
          {String(snap.building)} / moveCam {String(snap.moveCamera)}
        </dd>
        <dt>dist home</dt>
        <dd>{snap.targetDistFromHome.toFixed(2)}</dd>
        <dt>orbit state</dt>
        <dd>{snap.orbitState ?? "—"}</dd>
      </dl>
      {snap.eventLog.length > 0 && (
        <ul className="mt-2 max-h-28 overflow-y-auto border-t border-white/10 pt-1 text-neutral-400">
          {[...snap.eventLog].reverse().map((e, i) => (
            <li key={`${e.t}-${i}`}>
              {e.t}ms {e.msg}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}