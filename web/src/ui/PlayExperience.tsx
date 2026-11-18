"use client";

import { Canvas } from "@react-three/fiber";
import { NeutralToneMapping } from "three";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/game/format";
import { liveSatisfaction, undoableLiftIndex } from "@/game/rules";
import { DAY_START_MIN, currentWaitMin, isOnHill } from "@/game/sim";
import { readSnow } from "@/game/snow";
import { snowCarriers } from "@/game/trails";
import { useGameStore } from "@/game/store";
import { SNOW_LABELS, SNOW_NIGHT_COST } from "@/game/types";
import { MountainScene } from "@/render/MountainScene";
import { BuildSheet } from "@/ui/BuildSheet";
import { FounderPick } from "@/ui/FounderPick";
import { GuestsSheet } from "@/ui/GuestsSheet";
import { useCameraUi, requestRecenter } from "@/ui/cameraUi";
import {
  ActionBar,
  ConditionsBoard,
  LiftUndoChip,
  MorningNote,
  RecenterButton,
  ResumeFollowChip,
  StartCallout,
  TopBar,
} from "@/ui/Hud";
import { PlacementBar } from "@/ui/PlacementBar";
import { finishPlacement, usePlacementDraft } from "@/ui/placementDraft";
import { tidy } from "@/ui/kit/parts";
import { NightRecapSheet } from "@/ui/NightRecapSheet";
import { useSpeed } from "@/ui/speed";
import { WinterReviewSheet } from "@/ui/WinterReviewSheet";

export default function PlayExperience() {
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const dayIndex = useGameStore((s) => s.dayIndex);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const clockMin = useGameStore((s) => s.clockMin);
  const paused = useGameStore((s) => s.paused);
  const cash = useGameStore((s) => s.cash);
  const phase = useGameStore((s) => s.phase);
  const snowQuality = useGameStore((s) => s.snowQuality);
  const snowDepth = useGameStore((s) => s.snowDepth);
  // "tone|label" of the worst trail segment, as a string so the HUD re-renders only when it changes.
  const snowRead = useGameStore((s) => {
    const r = readSnow(snowCarriers(s.trails));
    return `${r.tone}|${r.label}`;
  });
  const avgQueue = useGameStore((s) => currentWaitMin(s));
  const anyOnHill = useGameStore((s) => s.guests.some(isOnHill));
  const weather = useGameStore((s) => s.weather);
  const morningHeadline = useGameStore((s) => s.morningHeadline);
  const snowPreset = useGameStore((s) => s.snow);
  const talentToast = useGameStore((s) => s.talentToast);
  const togglePause = useGameStore((s) => s.togglePause);
  const setFollowId = useGameStore((s) => s.setFollowId);
  const resumeFollowId = useCameraUi((s) => s.resumeFollowId);
  const canResume = useGameStore(
    (s) => !!resumeFollowId && !s.followId && s.guests.some((g) => g.id === resumeFollowId && isOnHill(g)),
  );
  const skipToClose = useGameStore((s) => s.skipToClose);
  const buildMode = useGameStore((s) => s.buildMode);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const lifts = useGameStore((s) => s.lifts);
  const undoLift = useGameStore((s) => s.undoLift);
  const buildTrigger = useRef<HTMLElement | null>(null);
  const placementActive = usePlacementDraft((s) => s.active);
  const undoIndex = undoableLiftIndex({ lifts, dayIndex, clockMin, phase });
  const undoRefund = undoIndex >= 0 ? (lifts[undoIndex]?.paid ?? 0) : 0;

  const mood = useGameStore((s) => Math.round(liveSatisfaction(s)));

  useEffect(() => usePlacementDraft.subscribe((next, prev) => {
    if (next.lodgeRequested !== prev.lodgeRequested && useGameStore.getState().phase === "day") {
      setBuildOpen(true);
    }
  }), []);

  useEffect(() => useGameStore.subscribe((next, prev) => {
    if (prev.phase === "day" && next.phase !== "day") {
      if (usePlacementDraft.getState().active) finishPlacement();
      setBuildOpen(false);
      buildTrigger.current = null;
    }
  }), []);

  useEffect(() => {
    const persist = useGameStore.persist;
    const onReady = () => setHydrated(true);
    const unsub = persist.onFinishHydration(onReady);
    void persist.rehydrate();
    if (persist.hasHydrated()) queueMicrotask(onReady);
    return unsub;
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        useGameStore.setState({ paused: true });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (buildOpen) setBuildMode(true);
  }, [buildOpen, setBuildMode]);

  useEffect(() => {
    if (phase === "night") useSpeed.getState().reset();
  }, [phase]);

  useEffect(() => {
    if (!talentToast) return;
    const t = window.setTimeout(
      () => useGameStore.setState({ talentToast: null }),
      5000,
    );
    return () => window.clearTimeout(t);
  }, [talentToast]);

  const [noteDismissedDay, setNoteDismissedDay] = useState<number | null>(null);
  const [noteExpandedDay, setNoteExpandedDay] = useState<number | null>(null);
  const noteExpanded = noteExpandedDay === dayIndex;
  const [menuConfirmOpen, setMenuConfirmOpen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const actionBarWrapRef = useRef<HTMLDivElement>(null);

  const notStarted =
    phase === "day" && paused && dayIndex === 1 && clockMin <= DAY_START_MIN;
  const showStartHint = hydrated && notStarted;
  const showNote = phase === "day" && noteDismissedDay !== dayIndex;

  // Auto-dismiss only while the hill day clock is running (not paused, not before first play).
  useEffect(() => {
    if (!showNote || paused || notStarted) return;
    const t = window.setTimeout(() => setNoteDismissedDay(dayIndex), 6000);
    return () => window.clearTimeout(t);
  }, [showNote, dayIndex, paused, notStarted]);

  useEffect(() => {
    if (!menuConfirmOpen) return;
    const onPointer = (e: PointerEvent) => {
      const wrap = actionBarWrapRef.current;
      if (wrap && e.target instanceof Node && wrap.contains(e.target)) return;
      setMenuConfirmOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [menuConfirmOpen]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setSceneReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-ink text-ink"
      data-scene-ready={sceneReady ? "true" : undefined}
    >
      <Canvas
        className="block h-full w-full touch-none"
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: [48, 78, 132], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: NeutralToneMapping,
        }}
      >
        <MountainScene />
      </Canvas>

      {/* At night the bar rides above the recap scrim (portrait), so the sheet reads as the next screen under it. */}
      <header data-mood={phase === "night" ? "night" : undefined} className={`pointer-events-none absolute inset-x-0 top-0 ${phase === "night" ? "z-[60] short:z-30" : "z-30"} flex flex-col items-start gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:flex-row sm:items-start sm:gap-3`}>
        <div className="pointer-events-auto w-full sm:w-auto" inert={phase === "night"}>
          <TopBar
            dayIndex={dayIndex}
            seasonLength={seasonLength}
            clockMin={clockMin}
            cash={cash}
            paused={paused}
            notStarted={notStarted}
            onTogglePause={() => {
              setNoteDismissedDay(dayIndex);
              togglePause();
            }}
          />
          {showStartHint && !placementActive && <StartCallout />}
        </div>
        {showNote && !placementActive && (
          <MorningNote
            weather={weather}
            headline={tidy(morningHeadline)}
            crewLine={talentToast ? tidy(talentToast) : null}
            overnightLine={
              dayIndex > 1 && SNOW_NIGHT_COST[snowPreset] > 0
                ? `Overnight: ${SNOW_LABELS[snowPreset]} snow & service, ${formatMoney(-SNOW_NIGHT_COST[snowPreset])}`
                : null
            }
            expanded={noteExpanded}
            onExpand={() => setNoteExpandedDay(dayIndex)}
            onDismiss={() => setNoteDismissedDay(dayIndex)}
          />
        )}
      </header>

      {phase === "day" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:flex-row sm:items-end sm:justify-between">
          {!placementActive && (
            <div className="pointer-events-auto absolute right-[max(0.75rem,env(safe-area-inset-right))] bottom-full mb-2 flex flex-wrap items-center justify-end gap-2">
              {undoIndex >= 0 && (
                <LiftUndoChip refund={undoRefund} onClick={() => undoLift()} />
              )}
              {canResume && (
                <ResumeFollowChip
                  onClick={() => {
                    setFollowId(resumeFollowId);
                    useCameraUi.setState({ resumeFollowId: null });
                  }}
                />
              )}
              <RecenterButton onClick={requestRecenter} />
            </div>
          )}
          {!placementActive && (
          <div className="w-full sm:max-w-[400px]">
            <ConditionsBoard
              avgQueue={avgQueue}
              snowQuality={snowQuality}
              snowDepth={snowDepth}
              snowRead={snowRead}
              mood={mood}
              anyOnHill={anyOnHill}
            />
          </div>
          )}
          {placementActive ? (
            <PlacementBar />
          ) : (
          <div ref={actionBarWrapRef} className="relative w-full sm:max-w-[400px]">
            <ActionBar
              buildActive={buildMode}
              onBuild={() => {
                buildTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                setBuildOpen(true);
              }}
              onGuests={() => setGuestsOpen(true)}
              onCloseHill={skipToClose}
              confirmMenu={menuConfirmOpen}
              onConfirmMenuChange={setMenuConfirmOpen}
            />
          </div>
          )}
        </div>
      )}

      <GuestsSheet open={guestsOpen} onClose={() => setGuestsOpen(false)} />
      <BuildSheet
        open={buildOpen}
        onClose={() => {
          setBuildOpen(false);
          if (!usePlacementDraft.getState().active) setBuildMode(false);
          const trigger = buildTrigger.current;
          buildTrigger.current = null;
          if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        }}
        onStartPlacement={() => {
          buildTrigger.current = null;
          setBuildOpen(false);
        }}
      />
      <NightRecapSheet />
      <FounderPick />
      <WinterReviewSheet />
    </div>
  );
}
