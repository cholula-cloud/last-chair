import { beforeEach, describe, expect, it } from "vitest";
import {
  setHudHidden,
  toggleConditionsExpanded,
  toggleHudHidden,
  useHudUi,
} from "./hudUi";

describe("useHudUi", () => {
  beforeEach(() => {
    useHudUi.setState({ hudHidden: false, conditionsExpanded: false });
  });

  it("defaults to visible HUD and collapsed conditions", () => {
    expect(useHudUi.getState()).toEqual({ hudHidden: false, conditionsExpanded: false });
  });

  describe("toggleHudHidden", () => {
    it("toggles hudHidden", () => {
      toggleHudHidden();
      expect(useHudUi.getState().hudHidden).toBe(true);
      toggleHudHidden();
      expect(useHudUi.getState().hudHidden).toBe(false);
    });
  });

  describe("setHudHidden", () => {
    it("sets hudHidden explicitly", () => {
      setHudHidden(true);
      expect(useHudUi.getState().hudHidden).toBe(true);
      setHudHidden(false);
      expect(useHudUi.getState().hudHidden).toBe(false);
    });
  });

  describe("toggleConditionsExpanded", () => {
    it("toggles conditionsExpanded", () => {
      toggleConditionsExpanded();
      expect(useHudUi.getState().conditionsExpanded).toBe(true);
      toggleConditionsExpanded();
      expect(useHudUi.getState().conditionsExpanded).toBe(false);
    });
  });
});