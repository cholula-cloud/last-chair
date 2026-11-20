import { beforeEach, describe, expect, it } from "vitest";
import {
  setHudHidden,
  toggleBottomChromeMinimized,
  toggleConditionsExpanded,
  toggleHudHidden,
  useHudUi,
} from "./hudUi";

describe("useHudUi", () => {
  beforeEach(() => {
    useHudUi.setState({ hudHidden: false, conditionsExpanded: false, bottomChromeMinimized: false });
  });

  it("defaults to visible HUD and collapsed conditions", () => {
    expect(useHudUi.getState()).toEqual({
      hudHidden: false,
      conditionsExpanded: false,
      bottomChromeMinimized: false,
    });
  });

  describe("toggleHudHidden", () => {
    it("toggles hudHidden", () => {
      toggleHudHidden();
      expect(useHudUi.getState().hudHidden).toBe(true);
      toggleHudHidden();
      expect(useHudUi.getState().hudHidden).toBe(false);
    });

    it("clears bottomChromeMinimized when showing HUD again", () => {
      useHudUi.setState({ bottomChromeMinimized: true });
      toggleHudHidden();
      expect(useHudUi.getState().hudHidden).toBe(true);
      toggleHudHidden();
      expect(useHudUi.getState()).toMatchObject({ hudHidden: false, bottomChromeMinimized: false });
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

  describe("toggleBottomChromeMinimized", () => {
    it("toggles bottomChromeMinimized", () => {
      toggleBottomChromeMinimized();
      expect(useHudUi.getState().bottomChromeMinimized).toBe(true);
      toggleBottomChromeMinimized();
      expect(useHudUi.getState().bottomChromeMinimized).toBe(false);
    });
  });

});