"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { motionPref } from "@/ui/motion";

const POP_MS = 220;
const POP_STAGGER_MS = 40;
const UNDO_MS = 160;

/** Tower pop on place and scale-down on undo. */
export function LiftPlacementMotion({
  liftKey,
  preview,
  undoing,
  children,
}: {
  liftKey: string;
  preview: boolean;
  undoing?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const anim = useRef<"idle" | "pop" | "undo">("idle");
  const start = useRef(0);

  useEffect(() => {
    if (preview) {
      anim.current = "idle";
      if (ref.current) ref.current.scale.y = 1;
      return;
    }
    if (undoing) {
      anim.current = motionPref.get() ? "idle" : "undo";
      start.current = performance.now();
      if (ref.current) ref.current.scale.y = 1;
      return;
    }
    if (motionPref.get()) {
      anim.current = "idle";
      if (ref.current) ref.current.scale.y = 1;
      return;
    }
    anim.current = "pop";
    start.current = performance.now();
    if (ref.current) ref.current.scale.y = 0.001;
  }, [liftKey, preview, undoing]);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const t = performance.now() - start.current;
    if (anim.current === "pop") {
      const u = Math.min(1, Math.max(0, (t - POP_STAGGER_MS * 2) / POP_MS));
      group.scale.y = 0.001 + u * (1 - 0.001);
      if (u >= 1) anim.current = "idle";
    } else if (anim.current === "undo") {
      const u = Math.min(1, t / UNDO_MS);
      group.scale.y = 1 - u;
      if (u >= 1) anim.current = "idle";
    }
  });

  return <group ref={ref}>{children}</group>;
}