import { afterEach, expect, it, vi } from "vitest";
import * as manifest from "./manifest";
import { createSampleLibrary } from "./samples";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("loads shipped samples and skips zero-byte placeholders", async () => {
  const clip = new ArrayBuffer(4);
  vi.spyOn(manifest, "manifestEntry").mockImplementation((id) => ({
    id,
    file: `${id}.m4a`,
    bytes: id === manifest.EFFECT_MANIFEST_ID.tap ? clip.byteLength : 0,
    license: "original",
    source: "test recording",
  }));
  const fetchClip = vi.fn().mockResolvedValue(new Response(clip));
  vi.stubGlobal("fetch", fetchClip);
  const decodeAudioData = vi.fn().mockResolvedValue({ duration: 1 });
  const context = { decodeAudioData } as unknown as AudioContext;
  const samples = createSampleLibrary("/last-chair/");

  await samples.loadEffects(context);
  await samples.loadBeds(context);

  expect(fetchClip.mock.calls).toEqual([["/last-chair/audio/ui-tap.m4a"]]);
  expect(decodeAudioData).toHaveBeenCalledOnce();
  expect(samples.hasEffect("tap")).toBe(true);
  expect(samples.hasEffect("thunk")).toBe(false);
  expect(samples.hasBed("day")).toBe(false);
});
