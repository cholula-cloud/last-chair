"use client";

import {
  LAYERS,
  LEGENDS,
  MARKS,
  readPoint,
  type MarkId,
  type GunView,
  type SnowLayer,
  type MapTime,
} from "@/game/mapLayers";
import { useLayers, useLayerSnapshot } from "./mapLayerStore";

const control = "key press min-h-11 shrink-0 px-2 text-xs font-bold";
export function LayerLegend({
  layer,
  wear = false,
  gunView = "Last night",
}: {
  layer: SnowLayer;
  wear?: boolean;
  gunView?: GunView;
}) {
  const legend: MarkId[] = wear
    ? ["noWear", "wear", "heavyWear", "neutral"]
    : layer === "guns"
      ? gunView === "Last night"
        ? ["last", "out", "neutral"]
        : ["both", "reach", "groom", "out", "neutral"]
      : LEGENDS[layer];
  return (
    <div
      aria-label={`${LAYERS[layer]} legend`}
      className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-bold"
    >
      {legend.map((id) => (
        <span key={id} className="inline-flex items-center gap-1">
          <b
            aria-hidden="true"
            className="grid size-5 place-items-center rounded border border-ink text-ink"
            style={{ backgroundColor: MARKS[id].color }}
          >
            {MARKS[id].glyph}
          </b>
          {MARKS[id].name}
        </span>
      ))}
    </div>
  );
}

export function LayerPanel({ layer, compact = false }: { layer: SnowLayer; compact?: boolean }) {
  const { time, preset, point, wear, gunView } = useLayers();
  const { state, model } = useLayerSnapshot(layer);
  const read = point && readPoint(state, model, layer, point, wear, gunView);
  return (
    <section
      aria-label="Map layers"
      className={
        compact
          ? "panel pointer-events-auto w-full space-y-2 p-2"
          : "panel pointer-events-auto max-h-[37dvh] w-[min(92vw,25rem)] space-y-2 overflow-y-auto overscroll-contain p-2"
      }
    >
      {layer === "guns" && (
        <div className="flex gap-1" aria-label="Snow-making service">
          {(["Last night", "Mid", "High"] as const).map((view) => (
            <button
              type="button"
              key={view}
              className={control}
              aria-pressed={gunView === view}
              onClick={() => useLayers.setState({ gunView: view })}
            >
              {view}
            </button>
          ))}
        </div>
      )}
      {layer === "conditions" && (
        <>
          <div className="flex flex-wrap gap-1" aria-label="Conditions time">
            {(["Now", "Close", "Tomorrow"] as MapTime[]).map((t) => (
              <button
                type="button"
                key={t}
                className={control}
                aria-pressed={time === t}
                disabled={
                  t === "Tomorrow" && state.dayIndex === state.seasonLength
                }
                onClick={() => useLayers.setState({ time: t })}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              className={control}
              aria-pressed={wear}
              onClick={() => useLayers.setState({ wear: !wear })}
            >
              Yesterday’s wear
            </button>
          </div>
          {time === "Tomorrow" && (
            <>
              <div
                className="flex gap-1"
                aria-label="Preview overnight service"
              >
                {(["minimal", "mid", "high"] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    className={control}
                    aria-pressed={p === preset}
                    onClick={() => useLayers.setState({ preset: p })}
                  >
                    {p === "minimal" ? "Minimal" : p === "mid" ? "Mid" : "High"}
                  </button>
                ))}
              </div>
              {model.forecast && (
                <div className="flex flex-wrap gap-1" aria-label="Forecast chances">
                  {Object.entries(model.forecast).map(([kind, odds]) => (
                    <span key={kind} className="chip px-1.5 py-0.5 text-[0.65rem] font-extrabold">
                      {kind.charAt(0).toUpperCase() + kind.slice(1)} {Math.round(odds * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      {!compact && (
        <LayerLegend
          layer={layer}
          gunView={gunView}
          wear={layer === "conditions" && wear}
        />
      )}
      {!compact && <p className="text-xs font-bold text-ink-soft">Tap or hold the hill.</p>}
      {read && (
        <div role="status" className="border-t border-ink pt-1 text-xs">
          <strong>{read.title}</strong>
          {read.detail && <p>{read.detail}</p>}
          {read.personas.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {read.personas.slice(0, 4).map((p) => (
                <span key={p} className="chip px-1">{p}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
