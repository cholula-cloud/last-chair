"use client";

import { nextTip } from "@/game/coach";
import { TALENT } from "@/game/talents";

import { closeNightLayer, openNightLayer, useLayers } from "./mapLayerStore";
import { LAYERS, type MapLayer } from "@/game/mapLayers";
import { Canvas } from "@react-three/fiber";
import { NeutralToneMapping } from "three";
import { useCallback, useEffect, useRef, useState } from "react";
import { assetIsPresent, type AssetTarget } from "@/game/assetNames";
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
import { ToneMappingSync } from "@/render/ToneMappingSync";
import { audio } from "@/audio/engine";
import { useSettings } from "./settingsStore";
import { AssetInspector } from "./AssetInspector";
import { BuildSheet } from "@/ui/BuildSheet";
import { FounderPick } from "@/ui/FounderPick";
import { CoachTip } from "@/ui/CoachTip";
import { ConfirmPop } from "@/ui/ConfirmPop";
import { GuestsSheet } from "@/ui/GuestsSheet";
import { useCameraUi, requestRecenter } from "@/ui/cameraUi";
import {
  ActionBar,
  BottomChromeRestoreButton,
  ConditionsBoard,
  HudToggleButton,
  LiftUndoChip,
  MorningNote,
  RecenterButton,
  ResumeFollowChip,
  StartCallout,
  TopBar,
  WindHoldCallout,
} from "@/ui/Hud";
import { useMoodPulseTracker } from "@/ui/motion";
import {
  toggleBottomChromeMinimized,
  toggleConditionsExpanded,
  toggleHudHidden,
  useHudUi,
} from "@/ui/hudUi";
import { PlacementBar } from "@/ui/PlacementBar";
import {
  LayerBottomDock,
  NightMapDock,
  LayersButton,
  OverlayLegend,
  OverlayStateSync,
  ReadoutCard,
} from "@/ui/OverlayControls";
import { finishPlacement, usePlacementDraft } from "@/ui/placementDraft";
import { tidy } from "@/ui/kit/parts";
import { CloseIcon, GridIcon } from "@/ui/kit/icons";
import { NightRecapSheet } from "@/ui/NightRecapSheet";
import { openOffice as enterOffice, useOffice, type OfficeTabId } from "@/ui/officeStore";
import { OfficeSheet } from "@/ui/OfficeSheet";
import { WinterReviewSheet } from "@/ui/WinterReviewSheet";

export default function PlayExperience({ onLeave }: { onLeave: (view?: "main" | "load" | "settings") => void }) {
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
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [selectedAsset, setInspectedAsset] = useState<AssetTarget | null>(null);
  const inspectedAsset = useGameStore((state) => selectedAsset && assetIsPresent(state, selectedAsset) ? selectedAsset : null);
  const closeAsset = useCallback(() => setInspectedAsset(null), []);
  const showBuildGrid = usePlacementDraft((s) => s.showBuildGrid);
  const hudHidden = useHudUi((s) => s.hudHidden);
  const conditionsExpanded = useHudUi((s) => s.conditionsExpanded);
  const bottomChromeMinimized = useHudUi((s) => s.bottomChromeMinimized);
  const [buildOpen, setBuildOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const layerStripOpen = useLayers((s) => s.stripOpen);
  useEffect(() => () => useOffice.setState({ open: false, resumeOnClose: false }), []);
  const officeOpen = useOffice((s) => s.open);

  const officeTrigger = useRef<HTMLElement | null>(null);
  const openOffice = (tab?: OfficeTabId) => {
    officeTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    enterOffice(tab);
  };
  useEffect(() => {
    if (officeOpen || !officeTrigger.current) return;
    const trigger = officeTrigger.current;
    officeTrigger.current = null;
    const target = trigger.isConnected ? trigger : document.querySelector<HTMLElement>('[data-bar="office"]');
    target?.focus({ preventScroll: true });
  }, [officeOpen]);

  const [softwareRenderer, setSoftwareRenderer] = useState(false);
  const [softwareDpr, setSoftwareDpr] = useState(0.75);
  useEffect(() => {
    if (!softwareRenderer) return;
    // Bound software rasterization cost as the canvas grows. HUD text stays at native resolution.
    const resize = () => setSoftwareDpr(Math.min(0.75, Math.sqrt(220_000 / (window.innerWidth * window.innerHeight))));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [softwareRenderer]);
  const preferLowGraphics = useSettings(s => s.graphicsQuality === "low");
  const lowGraphics = preferLowGraphics || softwareRenderer;
  const mountainId = useGameStore((s) => s.mountainId);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const seasonLength = useGameStore((s) => s.seasonLength);
  const operatingDayIndex = useGameStore((s) => s.operatingDayIndex);
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
  const tipsSeen = useGameStore((s) => s.tipsSeen);
  const tipsEnabled = useSettings((s) => s.tips);
  const saveNotice = useGameStore((s) => s.saveNotice);
  const dismissSaveNotice = useGameStore((s) => s.dismissSaveNotice);
  const togglePause = useGameStore((s) => s.togglePause);
  const setFollowId = useGameStore((s) => s.setFollowId);
  const resumeFollowId = useCameraUi((s) => s.resumeFollowId);
  const canResume = useGameStore(
    (s) => !!resumeFollowId && !s.followId && s.guests.some((g) => g.id === resumeFollowId && isOnHill(g)),
  );
  const buildMode = useGameStore((s) => s.buildMode);
  const setBuildMode = useGameStore((s) => s.setBuildMode);
  const lifts = useGameStore((s) => s.lifts);
  const undoLift = useGameStore((s) => s.undoLift);
  const buildTrigger = useRef<HTMLElement | null>(null);
  const placementActive = usePlacementDraft((s) => s.active);
  const undoIndex = useGameStore(undoableLiftIndex);
  const undoRefund = undoIndex >= 0 ? (lifts[undoIndex]?.paid ?? 0) : 0;

  const mood = useGameStore((s) => Math.round(liveSatisfaction(s)));
  const moodPulse = useMoodPulseTracker(mood, clockMin);

  useEffect(() => useGameStore.subscribe((next, prev) => {
    if (prev.phase === "day" && next.phase !== "day") {
      closeAsset();
      if (usePlacementDraft.getState().active) finishPlacement();
      setBuildOpen(false);
      buildTrigger.current = null;
    }
  }), [closeAsset]);

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
        useOffice.setState({ resumeOnClose: false });
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
  const canInspect = phase === "day" && hydrated && !placementActive && !buildOpen && !guestsOpen && !officeOpen && !menuConfirmOpen && !inspectedAsset;
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

  useEffect(() => {
    if (sceneReady) audio.prepareBeds();
  }, [sceneReady]);

  const hudSuppressed = phase === "day" && hudHidden && !placementActive && !buildOpen && !guestsOpen && !officeOpen;
  const activeCoachTip =
    hydrated &&
    phase === "day" &&
    !buildOpen &&
    !guestsOpen &&
    !officeOpen &&
    !placementActive &&
    !hudSuppressed &&
    !inspectedAsset
      ? nextTip(tipsSeen, {
          phase,
          dayIndex,
          opening,
          running: !notStarted,
          placementActive,
          buildOpen: false,
          hasGuestsWant: false,
          enabled: tipsEnabled,
        })
      : null;
  const layerDock =
    phase === "day" &&
    !placementActive &&
    !hudSuppressed &&
    layerStripOpen &&
    !bottomChromeMinimized;

  const mapToolButtons = (
    <>
      <LayersButton compact />
      <button
        type="button"
        aria-pressed={showBuildGrid}
        aria-label={showBuildGrid ? "Grid on" : "Grid off"}
        onClick={() => usePlacementDraft.setState({ showBuildGrid: !showBuildGrid })}
        className="key press pointer-events-auto flex size-11 shrink-0 items-center justify-center gap-1.5 !rounded-full [--lift:3px] md:w-auto md:!rounded-[var(--r-key)] md:px-3 md:text-xs md:font-extrabold"
      >
        <GridIcon size={19} />
        <span className="hidden md:inline">Grid {showBuildGrid ? "on" : "off"}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {showBuildGrid ? "Build grid on" : "Build grid off"}
      </span>
      <RecenterButton compact onClick={requestRecenter} />
      <HudToggleButton hidden={hudHidden} onClick={toggleHudHidden} />
    </>
  );

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-ink text-ink"
      data-scene-ready={sceneReady ? "true" : undefined}
    >
      <Canvas
        frameloop={officeOpen ? "never" : "always"}
        className="block h-full w-full touch-none"
        shadows={lowGraphics ? false : "percentage"}
        dpr={softwareRenderer ? softwareDpr : lowGraphics ? 1 : [1, 2]}
        onCreated={({ gl }) => {
          const context = gl.getContext();
          const info = context.getExtension("WEBGL_debug_renderer_info");
          if (info) setSoftwareRenderer(/swiftshader|llvmpipe|softpipe|software rasterizer/i.test(
            context.getParameter(info.UNMASKED_RENDERER_WEBGL),
          ));
        }}
        camera={{ position: [48, 78, 132], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: window.devicePixelRatio < 2,
          powerPreference: "high-performance",
          toneMapping: NeutralToneMapping,
        }}
      >
        <ToneMappingSync />
        <MountainScene lowDetail={lowGraphics} onInspectAsset={canInspect ? setInspectedAsset : undefined} />
      </Canvas>

      {/* At night the bar rides above the recap scrim (portrait), so the sheet reads as the next screen under it. */}
      <header inert={officeOpen || !!inspectedAsset} data-mood={phase === "night" ? "night" : undefined} className={`pointer-events-none absolute inset-x-0 top-0 ${phase === "night" ? "z-[60] short:z-30" : "z-30"} flex flex-col items-start gap-2 px-3 pt-[max(0.6rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:flex-row sm:items-start sm:justify-between sm:gap-3`}>
        <div className="pointer-events-none flex w-full flex-col items-start gap-2 sm:w-auto">
          <div className="pointer-events-auto w-full sm:w-auto" inert={phase === "night"}>
            <TopBar
              mountainId={mountainId}
              dayIndex={dayIndex}
              seasonLength={seasonLength}
              operatingDayIndex={operatingDayIndex}
              clockMin={clockMin}
              cash={cash}
              paused={paused}
              notStarted={notStarted}
              openingBlocked={opening !== null}
              onTogglePause={() => {
                setNoteDismissedDay(dayIndex);
                togglePause();
              }}
            />
            {showStartHint && !placementActive && !hudSuppressed && <StartCallout step={opening} />}
            {chairHeld && !hudSuppressed && <WindHoldCallout shortHold={shortHold} />}
          </div>
          {hydrated && phase === "day" && !buildOpen && !guestsOpen && !officeOpen && !hudSuppressed && !inspectedAsset && (
            <CoachTip
              context={{
                phase,
                dayIndex,
                opening,
                running: !notStarted,
                placementActive,
                buildOpen: false,
                hasGuestsWant: false,
              }}
            />
          )}
          {showNote && !placementActive && !hudSuppressed && (
            <div className={activeCoachTip ? "hidden w-full sm:block" : "w-full"}>
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
            </div>
          )}
        </div>

        {/* Tablet/landscape horizontal map tools in the top-right corner. */}
        {phase === "day" && !placementActive && !hudSuppressed && (
          <div
            data-map-rail="horizontal"
            className="pointer-events-none hidden shrink-0 items-center gap-1.5 sm:flex"
          >
            {mapToolButtons}
          </div>
        )}
      </header>

      {/* Portrait phone right-edge vertical map rail: keeps the bottom uncluttered. */}
      {phase === "day" && !placementActive && !hudSuppressed && (
        <div
          inert={officeOpen || !!inspectedAsset}
          data-map-rail="vertical"
          className="pointer-events-none absolute right-[max(0.6rem,env(safe-area-inset-right))] top-[calc(max(0.6rem,env(safe-area-inset-top))+3.5rem)] z-20 flex max-w-[min(100%,12rem)] flex-col items-end gap-1.5 sm:hidden"
        >
          {mapToolButtons}
        </div>
      )}

      {/* Restore pill when the player hides the HUD to inspect the mountain. */}
      {hudSuppressed && (
        <div
          inert={officeOpen || !!inspectedAsset}
          data-hud-hidden="true"
          className="arrive pointer-events-none absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-20"
        >
          <HudToggleButton hidden showLabel onClick={toggleHudHidden} />
        </div>
      )}

      {phase === "day" && !hudSuppressed && (
        <div inert={officeOpen || !!inspectedAsset} className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1.5 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] ${placementActive ? "sm:justify-center" : "sm:flex-row sm:items-end sm:justify-between sm:gap-2"}`}>
          <div className="pointer-events-none absolute right-[max(0.75rem,env(safe-area-inset-right))] bottom-full mb-1.5 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-1.5">
            {!placementActive && !layerDock && <ReadoutCard />}
            {!placementActive && !layerDock && (undoIndex >= 0 || canResume) && (
              <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
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
              </div>
            )}
          </div>
          {layerDock && (
            <LayerBottomDock />
          )}
          {!layerDock && !placementActive && !bottomChromeMinimized && (
            <div className="w-full sm:w-auto sm:min-w-[290px] sm:max-w-[380px]">
              <ConditionsBoard
                avgQueue={avgQueue}
                snowQuality={snowQuality}
                snowDepth={snowDepth}
                snowRead={snowRead}
                mood={mood}
                moodDelta={moodPulse.delta}
                moodPulseTick={moodPulse.pulseTick}
                anyOnHill={anyOnHill}
                expanded={conditionsExpanded}
                onToggleExpand={toggleConditionsExpanded}
                onMinimizeBottom={toggleBottomChromeMinimized}
              />
            </div>
          )}
          {placementActive ? (
            <div className="pointer-events-auto flex w-full flex-col items-stretch gap-1.5 sm:max-w-[26rem]">
              <OverlayLegend allowOff={false} docked />
              <PlacementBar />
            </div>
          ) : layerDock ? null : bottomChromeMinimized ? (
            <div className="pointer-events-auto flex w-full justify-center sm:w-auto">
              <BottomChromeRestoreButton onClick={toggleBottomChromeMinimized} />
            </div>
          ) : (
            <div ref={actionBarWrapRef} className="relative w-full sm:w-auto sm:min-w-[330px] sm:max-w-[420px]">
              <ActionBar
                buildActive={buildMode}
                onBuild={() => {
                  buildTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                  setBuildOpen(true);
                }}
                onStoryLog={() => openOffice("Reports")}
                onGuests={() => setGuestsOpen(true)}
                onOffice={() => {
                  setMenuConfirmOpen(false);
                  openOffice();
                }}
                confirmMenu={menuConfirmOpen}
                onConfirmMenuChange={setMenuConfirmOpen}
                onLeave={() => onLeave()}
              />
            </div>
          )}
        </div>
      )}

      <OverlayStateSync />
      {inspectedAsset && <AssetInspector target={inspectedAsset} onClose={closeAsset} />}
      {officeOpen && <OfficeSheet onLeave={() => onLeave("load")} />}
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
      <div hidden={!!inspectedLayer} inert={!!inspectedLayer || !!officeOpen}>
        <NightRecapSheet onOffice={openOffice} onMap={openNightMap} />
      </div>
      {phase === "night" && inspectedLayer && (
        <section
          aria-label="Inspect nightly map"
          className="pointer-events-none fixed inset-x-3 bottom-[max(0.65rem,env(safe-area-inset-bottom))] z-[61] flex justify-center"
        >
          <NightMapDock onBack={closeNightMap} />
          <span className="sr-only" role="status">{LAYERS[inspectedLayer]} map at closing</span>
        </section>
      )}
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
      <ConfirmPop />
      <WinterReviewSheet onOffice={() => openOffice("Reports")} />
    </div>
  );
}
