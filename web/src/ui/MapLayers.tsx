"use client";

import {
  LAYERS,
  LEGENDS,
  MARKS,
  readPoint,
  type MarkId,
  type GunView,
  type MapLayer,
  type MapTime,
} from "@/game/mapLayers";
import { useGameStore } from "@/game/store";
import { useLayers, useLayerSnapshot } from "./mapLayerStore";

const control = "key press min-h-11 shrink-0 px-2 text-xs font-bold";
export function LayerLegend({
  layer,
  wear = false,
  gunView = "Last night",
}: {
  layer: MapLayer;
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

function LayerPanel({ layer }: { layer: MapLayer }) {
  const { time, preset, point, wear, gunView } = useLayers();
  const { state, model } = useLayerSnapshot(layer);
  const read = point && readPoint(state, model, layer, point, wear, gunView);
  return (
    <section
      aria-label="Map layers"
      className="panel absolute bottom-full right-0 mb-2 max-h-[37dvh] w-[min(92vw,25rem)] space-y-2 overflow-y-auto overscroll-contain p-2"
    >
      <div className="flex gap-1 overflow-x-auto" aria-label="Choose a layer">
        {(Object.keys(LAYERS) as MapLayer[]).map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={id === layer}
            className={control}
            onClick={() => useLayers.setState({ layer: id, point: null })}
          >
            {LAYERS[id]}
          </button>
        ))}
      </div>
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
                <p className="text-xs">
                  Forecast chances:{" "}
                  {Object.entries(model.forecast)
                    .map(([kind, odds]) => `${kind} ${Math.round(odds * 100)}%`)
                    .join(" · ")}
                  .
                </p>
              )}
            </>
          )}
        </>
      )}
      <LayerLegend
        layer={layer}
        gunView={gunView}
        wear={layer === "conditions" && wear}
      />
      <p className="text-xs font-bold">
        {layer === "slope"
          ? "Contour lines mark 50 ft of elevation."
          : layer === "depth"
            ? "Dashed lines mark the 0.15 depth boundary."
            : layer === "guns"
              ? "Pipe lines connect guns to the base. Rings show their reach."
              : time === "Close"
                ? "Close projects the rest of today’s skiing."
                : time === "Tomorrow"
                  ? "Tomorrow combines overnight service with the weather forecast."
                  : ""}{" "}
        Tap or hold the hill to inspect a point.
      </p>
      {read && (
        <div role="status" className="border-t border-ink pt-1 text-xs">
          <strong>{read.title}</strong>
          <p>{read.detail}</p>
          <div className="flex flex-wrap gap-1">
            {read.personas.map((p) => (
              <span key={p} className="chip px-1">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
export function MapLayers() {
  const layer = useLayers((s) => s.layer);
  return (
    <div>
      <button
        type="button"
        className="key press min-h-11 px-3 text-sm font-extrabold"
        aria-expanded={!!layer}
        onClick={() =>
          useLayers.setState({
            layer: layer ? null : "slope",
            point: null,
            time: "Now",
            wear: false,
            preset: useGameStore.getState().pendingSnow,
          })
        }
      >
        Layers
      </button>
      {layer && <LayerPanel layer={layer} />}
    </div>
  );
}
