import { beforeEach, describe, expect, it } from "vitest";
import { useLayers } from "./mapLayerStore";
import { pickLayer, toggleLayersRail } from "./overlayUi";

const layerDefaults = {
  layer: null as const,
  nightInspection: false,
  stripOpen: false,
  autoOff: false,
  time: "Now" as const,
  preset: "mid" as const,
  gunView: "Last night" as const,
  wear: false,
  point: null,
};

describe("toggleLayersRail", () => {
  beforeEach(() => useLayers.setState(layerDefaults));

  it("closes the dock and clears the overlay when the strip is already open", () => {
    useLayers.setState({ stripOpen: true, layer: "depth", point: { x: 1, z: 2 } });
    toggleLayersRail();
    expect(useLayers.getState()).toMatchObject({
      stripOpen: false,
      layer: null,
      autoOff: true,
      point: null,
    });
  });

  it("closes the dock when the strip is open but no layer is shown", () => {
    useLayers.setState({ stripOpen: true, layer: null, autoOff: true });
    toggleLayersRail();
    expect(useLayers.getState().stripOpen).toBe(false);
  });

  it("opens the dock and selects Slope when starting from closed", () => {
    toggleLayersRail();
    expect(useLayers.getState()).toMatchObject({ stripOpen: true, layer: "slope", autoOff: false });
  });

  it("closes after the player toggles the active layer off in the strip", () => {
    useLayers.setState({ stripOpen: true, layer: "slope" });
    pickLayer("slope", true);
    expect(useLayers.getState().layer).toBeNull();
    toggleLayersRail();
    expect(useLayers.getState().stripOpen).toBe(false);
  });
});