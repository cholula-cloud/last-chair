"use client";

/**
 * Orbit controls for the mountain view. Uses three.js OrbitControls (not three-stdlib):
 * upstream fixes staying in a one-finger pan when the other touch lifts mid-pinch, which
 * three-stdlib still mishandles and reads as a stuck or jumpy camera on phones.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import type { ThreeElement } from "@react-three/fiber";
import type * as THREE from "three";

type OrbitProps = Omit<ThreeElement<typeof OrbitControlsImpl>, "args" | "object"> & {
  makeDefault?: boolean;
  camera?: THREE.Camera;
  domElement?: HTMLElement;
  regress?: boolean;
  keyEvents?: boolean | HTMLElement;
  onChange?: (e?: Event) => void;
  onStart?: (e?: Event) => void;
  onEnd?: (e?: Event) => void;
};

export function MountainOrbitControls({
  makeDefault,
  camera,
  regress,
  domElement,
  enableDamping = true,
  keyEvents = false,
  onChange,
  onStart,
  onEnd,
  ...restProps
}: OrbitProps) {
  const invalidate = useThree((state) => state.invalidate);
  const defaultCamera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const set = useThree((state) => state.set);
  const get = useThree((state) => state.get);
  const performance = useThree((state) => state.performance);
  const explCamera = camera ?? defaultCamera;
  const explDomElement = domElement ?? gl.domElement;

  const controls = useMemo(
    () => new OrbitControlsImpl(explCamera, explDomElement),
    [explCamera, explDomElement],
  );

  useFrame(() => {
    if (controls.enabled) controls.update();
  }, -1);

  useEffect(() => {
    controls.disconnect();
    controls.connect(explDomElement);
    if (keyEvents) {
      controls.listenToKeyEvents(keyEvents === true ? explDomElement : keyEvents);
    }

    // Prevent iOS Safari native pinch-to-zoom / two-finger gesture hijacking and clear stuck touches on blur.
    const preventSafariGesture = (e: Event) => e.preventDefault();
    const resetStalePointers = () => {
      controls.disconnect();
      controls.connect(explDomElement);
      if (keyEvents) {
        controls.listenToKeyEvents(keyEvents === true ? explDomElement : keyEvents);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") resetStalePointers();
    };

    explDomElement.addEventListener("gesturestart", preventSafariGesture, { passive: false });
    explDomElement.addEventListener("gesturechange", preventSafariGesture, { passive: false });
    explDomElement.addEventListener("gestureend", preventSafariGesture, { passive: false });
    window.addEventListener("blur", resetStalePointers);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      explDomElement.removeEventListener("gesturestart", preventSafariGesture);
      explDomElement.removeEventListener("gesturechange", preventSafariGesture);
      explDomElement.removeEventListener("gestureend", preventSafariGesture);
      window.removeEventListener("blur", resetStalePointers);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controls.dispose();
    };
  }, [keyEvents, explDomElement, controls]);

  useEffect(() => {
    const onCh = () => {
      invalidate();
      if (regress) performance.regress();
      onChange?.();
    };
    const onSt = () => onStart?.();
    const onEn = () => onEnd?.();
    controls.addEventListener("change", onCh);
    controls.addEventListener("start", onSt);
    controls.addEventListener("end", onEn);
    return () => {
      controls.removeEventListener("change", onCh);
      controls.removeEventListener("start", onSt);
      controls.removeEventListener("end", onEn);
    };
  }, [onChange, onStart, onEnd, controls, invalidate, performance, regress]);

  useEffect(() => {
    if (!makeDefault) return;
    const old = get().controls;
    set({ controls });
    return () => set({ controls: old });
  }, [makeDefault, controls, set, get]);

  return <primitive object={controls} enableDamping={enableDamping} {...restProps} />;
}