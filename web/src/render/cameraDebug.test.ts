import { describe, expect, it } from "vitest";
import { inferLockReason } from "./cameraDebug";

describe("inferLockReason", () => {
  it("flags guest follow when the orbit target is tracking a guest", () => {
    expect(
      inferLockReason({
        followId: "g1",
        returning: false,
        glide: false,
        tilt: false,
        building: false,
        moveCamera: false,
        interacting: false,
      }),
    ).toBe("guestFollow");
  });

  it("does not blame follow while the player is dragging the map", () => {
    expect(
      inferLockReason({
        followId: "g1",
        returning: false,
        glide: false,
        tilt: false,
        building: false,
        moveCamera: false,
        interacting: true,
      }),
    ).toBe("none");
  });

  it("flags return home after follow stops", () => {
    expect(
      inferLockReason({
        followId: null,
        returning: true,
        glide: false,
        tilt: false,
        building: false,
        moveCamera: false,
        interacting: false,
      }),
    ).toBe("returningHome");
  });

  it("flags build mode when pan is remapped off", () => {
    expect(
      inferLockReason({
        followId: null,
        returning: false,
        glide: false,
        tilt: false,
        building: true,
        moveCamera: false,
        interacting: false,
      }),
    ).toBe("buildNoPan");
  });
});