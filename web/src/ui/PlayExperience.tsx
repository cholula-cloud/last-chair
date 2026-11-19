"use client";

import { TALENT } from "@/game/talents";

import { closeNightLayer, openNightLayer, useLayers } from "./mapLayerStore";
import { LAYERS, type MapLayer } from "@/game/mapLayers";
import { LayerPanel } from "./MapLayers";
import { Canvas } from "@react-three/fiber";
import { NeutralToneMapping } from "three";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/game/format";
import { isLiftOperational } from "@/game/lifts";
import { liveSatisfaction, openingStep, undoableLiftIndex } from "@/game/rules";
import { DAY_START_MIN, currentWaitMin, isOnHill } from "@/game/sim";
import { readSnow } from "@/game/snow";
import { snowCarriers } from "@/game/trails";
import { flushSave, useGameStore } from "@/game/store";
import { SNOW_LABELS, SNOW_NIGHT_COST } from "@/game/types";
import { isWindHeld, weatherForDay } from "@/game/weather";
import { MountainScene } from "@/render/MountainScene";
import { CoachCard } from "./CoachCard";
import { useCoach } from "./coachStore";
import { useSettings } from "./settingsStore";
import { TIPS } from "@/game/coach";
import { BuildSheet } from "@/ui/BuildSheet";
import { FounderPick } from "@/ui/FounderPick";
import { CoachTip } from "@/ui/CoachTip";
import { GoalStrip } from "@/ui/GoalStrip";
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
  WindHoldCallout,
} from "@/ui/Hud";
import { PlacementBar } from "@/ui/PlacementBar";
import { LayerStrip, SnowLayerControls, LayersButton, OverlayLegend, OverlayStateSync, ReadoutCard } from "@/ui/OverlayControls";
import { finishPlacement, usePlacementDraft } from "@/ui/placementDraft";
import { tidy } from "@/ui/kit/parts";
import { CloseIcon } from "@/ui/kit/icons";
import { NightRecapSheet } from "@/ui/NightRecapSheet";
import { Office, type OfficeTab } from "./Office";
import { WinterReviewSheet } from "@/ui/WinterReviewSheet";

export default function PlayExperience({ onLeave }: { onLeave: (view?: "main" | "load" | "settings") => void }) {
  const [officeTab, setOfficeTab] = useState<OfficeTab | null>(null);
  const inspectedLayer = useLayers(s => s.nightInspection ? s.layer : null);
  const mapTrigger = useRef<HTMLElement | null>(null);
  const openNightMap = (layer: MapLayer) => {
    mapTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openNightLayer(layer, useGameStore.getState().pendingSnow);
  };
  const closeNightMap = () => {
    closeNightLayer();
    requestAnimationFrame(() => mapTrigger.current?.focus({ preventScroll: true }));
  };
  useEffect(() => {
    if (!inspectedLayer) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeNightMap(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inspectedLayer]);
  useEffect(() => closeNightLayer, []);
  const resumeOfficeDay = useRef(false);
  const officeTrigger = useRef<HTMLElement | null>(null);
  const openOffice = (tab: OfficeTab) => {
    const game = useGameStore.getState();
    officeTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    resumeOfficeDay.current = game.phase === "day" && !game.paused;
    if (resumeOfficeDay.current) game.togglePause();
    setOfficeTab(tab);
  };
  const closeOffice = () => {
    setOfficeTab(null);
    const game = useGameStore.getState();
    if (resumeOfficeDay.current && !document.hidden && game.phase === "day" && game.paused) game.togglePause();
    resumeOfficeDay.current = false;
    requestAnimationFrame(() => officeTrigger.current?.focus({ preventScroll: true }));
  };
  const [guestsOpen, setGuestsOpen] = useState(false);
  const showBuildGrid = usePlacementDraft((s) => s.showBuildGrid);
  const [buildOpen, setBuildOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const lowGraphics = useSettings(s => s.graphicsQuality === "low");
  const tipsEnabled = useSettings(s => s.tips);
  const coachPending = useCoach(s => s.index < TIPS.length);
  const coaching = tipsEnabled && coachPending;
  useEffect(() => {
    if (!hydrated) return;
    const observe = () => useCoach.getState().observe(useGameStore.getState());
    observe();
    return useGameStore.subscribe(observe);
  }, [hydrated]);
  const mountainId = useGameStore((s) => s.mountainId);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const clockMin = useGameStore((s) => s.clockMin);
  const paused = useGameStore((s) => s.paused);
  const cash = useGameStore((s) => s.cash);
  const phase = useGameStore((s) => s.phase);
  const opening = useGameStore(openingStep);
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
  const chairHeld = useGameStore((s) => s.phase === "day" && s.lifts.some((lift, i) =>
    isWindHeld(lift.type, weatherForDay(s).wind, s.clockMin, s.talentsOwned) && isLiftOperational(lift, i, s.trails),
  ));
  const morningHeadline = useGameStore((s) => s.morningHeadline);
  const shortHold = useGameStore((s) => TALENT.windHold.learned(s.talentsOwned));
  const paidForSnow = useGameStore((s) => s.lastDay?.snowNightCost ?? SNOW_NIGHT_COST[s.snow]);
  const snowPreset = useGameStore((s) => s.snow);
  const talentToast = useGameStore((s) => s.talentToast);
  const saveNotice = useGameStore((s) => s.saveNotice);
  const dismissSaveNotice = useGameStore((s) => s.dismissSaveNotice);
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
  const undoIndex = useGameStore(undoableLiftIndex);
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
        resumeOfficeDay.current = false;
        if (!useGameStore.getState().paused) useGameStore.getState().togglePause();
        flushSave();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (buildOpen) setBuildMode(true);
  }, [buildOpen, setBuildMode]);

  const [noteDismissedDay, setNoteDismissedDay] = useState<number | null>(null);
  const [noteExpandedDay, setNoteExpandedDay] = useState<number | null>(null);
  const noteExpanded = noteExpandedDay === dayIndex;
  const [menuConfirmOpen, setMenuConfirmOpen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const actionBarWrapRef = useRef<HTMLDivElement>(null);

  const notStarted =
    phase === "day" && paused && dayIndex === 1 && clockMin <= DAY_START_MIN;
  const showStartHint = hydrated && notStarted;
  const showNote = phase === "day" && !notStarted && noteDismissedDay !== dayIndex;

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
        frameloop={officeTab ? "never" : "always"}
        className="block h-full w-full touch-none"
        shadows={lowGraphics ? false : "percentage"}
        dpr={lowGraphics ? 1 : [1, 2]}
        camera={{ position: [48, 78, 132], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: NeutralToneMapping,
        }}
      >
        <MountainScene coaching={coaching && dayIndex === 1} />
      </Canvas>

      {/* At night the bar rides above the recap scrim (portrait), so the sheet reads as the next screen under it. */}
      <header data-mood={phase === "night" ? "night" : undefined} className={`pointer-events-none absolute inset-x-0 top-0 ${phase === "night" ? "z-[60] short:z-30" : "z-30"} flex flex-col items-start gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:flex-row sm:items-start sm:gap-3`}>
        <div className="pointer-events-auto w-full sm:w-auto" inert={phase === "night"}>
          <TopBar
            mountainId={mountainId}
            dayIndex={dayIndex}
            seasonLength={seasonLength}
            clockMin={clockMin}
            cash={cash}
            paused={paused}
            notStarted={notStarted}
            speedUnlocked={!coaching || dayIndex > 1}
            openingBlocked={opening !== null}
            onTogglePause={() => {
              setNoteDismissedDay(dayIndex);
              togglePause();
            }}
          />
          {showStartHint && !placementActive && <StartCallout step={opening} />}
          {hydrated && phase === "day" && !placementActive && !buildOpen && !guestsOpen && !officeTab && <CoachCard slot="day" />}
          {phase === "day" && !showStartHint && !placementActive && <GoalStrip />}
          {chairHeld && <WindHoldCallout shortHold={shortHold} />}
        </div>
        {coaching && dayIndex === 1 && (placementActive || buildOpen) && (
          <CoachTip
            context={{
              phase,
              dayIndex,
              opening,
              running: !notStarted,
              placementActive,
              buildOpen,
              hasGuestsWant: false,
            }}
          />
        )}
        {showNote && !placementActive && (
          <MorningNote
            weather={weather}
            headline={tidy(morningHeadline)}
            crewLine={talentToast ? tidy(talentToast) : null}
            overnightLine={
              dayIndex > 1 && paidForSnow > 0
                ? `Overnight: ${SNOW_LABELS[snowPreset]} snow & service, ${formatMoney(-paidForSnow)}`
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
          <div className="pointer-events-none absolute right-[max(0.75rem,env(safe-area-inset-right))] bottom-full mb-2 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2">
            {!placementActive && <ReadoutCard />}
            <OverlayLegend />
            {!placementActive && <SnowLayerControls />}
            {!placementActive && <LayerStrip />}
            {!placementActive && (
              <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
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
                <LayersButton />
                <button type="button" aria-pressed={showBuildGrid} onClick={() => usePlacementDraft.setState({ showBuildGrid: !showBuildGrid })}
                  className="key press min-h-11 px-3 text-sm font-extrabold">Grid {showBuildGrid ? "on" : "off"}</button>
                <RecenterButton onClick={requestRecenter} />
              </div>
            )}
          </div>
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
              onOffice={() => openOffice("Desk")}
              onStoryLog={() => openOffice("Reports")}
              onGuests={() => setGuestsOpen(true)}
              onCloseHill={skipToClose}
              openingBlocked={opening !== null}
              confirmMenu={menuConfirmOpen}
              onConfirmMenuChange={setMenuConfirmOpen}
              onLeave={() => onLeave()}
            />
          </div>
          )}
        </div>
      )}

      {officeTab && <Office initial={officeTab} onClose={closeOffice} onLeave={onLeave} />}
      <OverlayStateSync />
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
      <div hidden={!!inspectedLayer} inert={!!inspectedLayer || !!officeTab}>
        <NightRecapSheet onOffice={openOffice} onMap={openNightMap} />
      </div>
      {phase === "night" && inspectedLayer && <section aria-label="Inspect nightly map" className="fixed bottom-3 right-3 z-[61]">
        <LayerPanel layer={inspectedLayer} />
        <button type="button" autoFocus className="key min-h-11 px-3 font-bold" onClick={closeNightMap}>Back to recap</button>
        <span className="sr-only" role="status">{LAYERS[inspectedLayer]} map at closing</span>
      </section>}
      <FounderPick />
      <div className="pointer-events-none absolute inset-x-3 top-[max(0.6rem,env(safe-area-inset-top))] z-[70] mx-auto max-w-md">
        <div className={saveNotice ? "key pointer-events-auto flex items-center gap-2 p-1 pl-3" : undefined}>
          <p role="status" className="flex-1 text-sm font-bold">{saveNotice}</p>
          {saveNotice && (
            <button
              type="button"
              onClick={dismissSaveNotice}
              aria-label="Dismiss save notice"
              className="key key-sm press grid size-11 shrink-0 place-items-center"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
      <WinterReviewSheet onOffice={() => openOffice("Reports")} />
    </div>
  );
}
