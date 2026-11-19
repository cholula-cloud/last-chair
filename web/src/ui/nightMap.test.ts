import { expect, it } from "vitest";
import { closeNightLayer, openNightLayer, useLayers } from "./mapLayerStore";

it("restores the operator’s map selections after inspecting a problem at night", () => {
  const original = useLayers.getState();
  try {
    useLayers.setState({ layer: "depth", time: "Close", preset: "high", point: { x: 2, z: 5 }, wear: true });
    const day = useLayers.getState();
    openNightLayer("conditions", "minimal");
    expect(useLayers.getState()).toMatchObject({ layer: "conditions", time: "Now", preset: "minimal", nightInspection: true });
    useLayers.setState({ layer: "slope", point: { x: 0, z: 1 } });
    closeNightLayer();
    expect(useLayers.getState()).toEqual(day);
  } finally {
    closeNightLayer();
    useLayers.setState(original);
  }
});
