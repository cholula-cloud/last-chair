import { describe, expect, it } from "vitest";
import { createAudioEngine } from "./engine";
import { mixGains, type MixInput } from "./mix";
import { SOUND_IDS } from "./synth";

class FakeParam {
  value = 0;
  targets: number[] = [];
  setValueAtTime(v: number) { this.value = v; }
  linearRampToValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  setTargetAtTime(v: number) { this.value = v; this.targets.push(v); }
  cancelScheduledValues() {}
}

class FakeNode {
  kind: string;
  to: FakeNode[] = [];
  started = 0;
  stopped = 0;
  gain = new FakeParam();
  frequency = new FakeParam();
  Q = new FakeParam();
  type = "";
  buffer: unknown = null;
  loop = false;
  constructor(kind: string) { this.kind = kind; }
  connect(node: FakeNode) { this.to.push(node); return node; }
  start() { this.started++; }
  stop() { this.stopped++; }
}

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state: "suspended" | "running" | "interrupted" = "suspended";
  destination = new FakeNode("destination");
  nodes: FakeNode[] = [];
  suspendCalls = 0;
  resumeCalls = 0;
  sources: { el: unknown; node: FakeNode }[] = [];
  private make(kind: string) { const n = new FakeNode(kind); this.nodes.push(n); return n; }
  createGain() { return this.make("gain"); }
  createOscillator() { return this.make("osc"); }
  createBufferSource() { return this.make("source"); }
  createBiquadFilter() { return this.make("filter"); }
  createBuffer(_c: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
  createMediaElementSource(el: unknown) { const node = this.make("media"); this.sources.push({ el, node }); return node; }
  async resume() { this.resumeCalls++; this.state = "running"; }
  async suspend() { this.suspendCalls++; this.state = "suspended"; }
  count(kind: string) { return this.nodes.filter((n) => n.kind === kind).length; }
}

const ON: MixInput = { soundOn: true, masterVolume: 100, effectsVolume: 100, ambienceVolume: 100, voiceOn: true, voiceVolume: 100 };

function setup(mix: MixInput = ON) {
  const ctx = new FakeContext();
  let sessionType = "";
  const engine = createAudioEngine({
    createContext: () => ctx as unknown as AudioContext,
    setSessionType: (t) => { sessionType = t; },
  });
  engine.setMix(mixGains(mix));
  return { ctx, engine, session: () => sessionType };
}

/** Unlock and let the resume promise settle. */
async function start(h: ReturnType<typeof setup>) {
  h.engine.unlock();
  await Promise.resolve();
}

describe("audio engine gesture and mute rules", () => {
  it("creates nothing and plays nothing before the first gesture", () => {
    const { ctx, engine } = setup();
    engine.setBed("day");
    for (const id of SOUND_IDS) engine.play(id);
    expect(engine.state).toBe("none");
    expect(ctx.nodes).toHaveLength(0);
  });

  it("unlock creates the context, resumes it and sets the ambient session", async () => {
    const h = setup();
    await start(h);
    expect(h.ctx.resumeCalls).toBe(1);
    expect(h.engine.running).toBe(true);
    expect(h.session()).toBe("ambient");
  });

  it("does not play while the context is suspended or interrupted", async () => {
    const h = setup();
    await start(h);
    h.ctx.state = "interrupted";
    h.engine.play("thunk");
    expect(h.ctx.count("osc")).toBe(0);
  });

  it("plays a sound into the effects bus once running", async () => {
    const h = setup();
    await start(h);
    h.engine.play("tap");
    expect(h.ctx.count("osc")).toBeGreaterThan(0);
    const effects = h.engine.nodes!.effects as unknown as FakeNode;
    expect(h.ctx.nodes.some((n) => n.kind === "gain" && n.to.includes(effects))).toBe(true);
    for (const id of SOUND_IDS) h.engine.play(id);
    expect(h.ctx.count("osc")).toBeGreaterThan(2);
  });

  it("plays nothing when Sound is off or the effects slider is zero", async () => {
    const h = setup({ ...ON, soundOn: false });
    await start(h);
    h.engine.play("thunk");
    expect(h.ctx.count("osc")).toBe(0);
    h.engine.setMix(mixGains({ ...ON, effectsVolume: 0 }));
    h.engine.play("thunk");
    expect(h.ctx.count("osc")).toBe(0);
    h.engine.setMix(mixGains(ON));
    h.engine.play("thunk");
    expect(h.ctx.count("osc")).toBeGreaterThan(0);
  });

  it("spaces repeats of the same sound", async () => {
    const h = setup();
    await start(h);
    h.engine.play("tap");
    const first = h.ctx.count("osc");
    h.ctx.currentTime += 0.01;
    h.engine.play("tap");
    expect(h.ctx.count("osc")).toBe(first);
    h.ctx.currentTime += 0.1;
    h.engine.play("tap");
    expect(h.ctx.count("osc")).toBe(first * 2);
  });
});

describe("audio engine bus routing", () => {
  it("wires effects, ambience and voice through master to the speakers", async () => {
    const h = setup();
    await start(h);
    const g = h.engine.nodes! as unknown as Record<string, FakeNode>;
    expect(g.master.to).toEqual([h.ctx.destination]);
    for (const bus of ["effects", "ambience", "voice"]) expect(g[bus].to).toEqual([g.master]);
  });

  it("sets each bus gain from the mix and follows later changes", async () => {
    const h = setup({ ...ON, masterVolume: 50, effectsVolume: 70, ambienceVolume: 20, voiceVolume: 90 });
    await start(h);
    const g = h.engine.nodes! as unknown as Record<string, FakeNode>;
    expect(g.master.gain.value).toBeCloseTo(0.25);
    expect(g.effects.gain.value).toBeCloseTo(0.49);
    expect(g.ambience.gain.value).toBeCloseTo(0.04);
    expect(g.voice.gain.value).toBeCloseTo(0.81);
    h.engine.setMix(mixGains({ ...ON, soundOn: false }));
    expect(g.master.gain.value).toBe(0);
  });

  it("routes a voice element through the voice bus only when running", async () => {
    const h = setup();
    const el = {} as HTMLMediaElement;
    expect(h.engine.routeVoice(el)).toBe(false);
    await start(h);
    expect(h.engine.routeVoice(el)).toBe(true);
    expect(h.engine.routeVoice(el)).toBe(true);
    expect(h.ctx.sources).toHaveLength(1);
    expect(h.ctx.sources[0].node.to).toEqual([h.engine.nodes!.voice]);
  });

  it("reports whether the voice can be heard and a fallback volume", () => {
    const h = setup({ ...ON, masterVolume: 50, voiceVolume: 50 });
    expect(h.engine.voiceAudible()).toBe(true);
    expect(h.engine.voiceFallbackVolume()).toBeCloseTo(0.0625);
    h.engine.setMix(mixGains({ ...ON, soundOn: false }));
    expect(h.engine.voiceAudible()).toBe(false);
    expect(h.engine.voiceFallbackVolume()).toBe(0);
  });
});

describe("audio engine ambience bed", () => {
  it("starts the bed after unlock and stops it when muted", async () => {
    const h = setup();
    h.engine.setBed("day");
    expect(h.ctx.count("source")).toBe(0);
    await start(h);
    expect(h.ctx.count("source")).toBe(1);
    h.engine.setMix(mixGains({ ...ON, soundOn: false }));
    const bed = h.ctx.nodes.find((n) => n.kind === "source")!;
    expect(bed.stopped).toBe(1);
    h.engine.setMix(mixGains(ON));
    expect(h.ctx.count("source")).toBe(2);
  });

  it("never starts the bed while ambience is silent, and ends it with setBed(null)", async () => {
    const h = setup({ ...ON, ambienceVolume: 0 });
    h.engine.setBed("day");
    await start(h);
    expect(h.ctx.count("source")).toBe(0);
    h.engine.setMix(mixGains(ON));
    expect(h.ctx.count("source")).toBe(1);
    h.engine.setBed(null);
    expect(h.ctx.nodes.find((n) => n.kind === "source")!.stopped).toBe(1);
  });

  it("changes mood without starting a second bed", async () => {
    const h = setup();
    h.engine.setBed("day");
    await start(h);
    h.engine.setBed("night");
    expect(h.ctx.count("source")).toBe(1);
  });
});

describe("audio engine visibility", () => {
  it("suspends when hidden and resumes when visible after a gesture", async () => {
    const h = setup();
    await start(h);
    h.engine.setHidden(true);
    expect(h.ctx.suspendCalls).toBe(1);
    h.engine.play("tap");
    expect(h.ctx.count("osc")).toBe(0);
    h.engine.setHidden(false);
    expect(h.ctx.resumeCalls).toBe(2);
  });

  it("does not resume on visible when no gesture has unlocked it", () => {
    const h = setup();
    h.engine.setHidden(true);
    h.engine.setHidden(false);
    expect(h.ctx.resumeCalls).toBe(0);
    expect(h.engine.state).toBe("none");
  });
});

describe("audio engine recorded clips", () => {
  it("falls back to synth when prepareBeds runs without files", async () => {
    const h = setup();
    await start(h);
    h.engine.prepareBeds();
    await Promise.resolve();
    h.engine.setBed("day");
    expect(h.ctx.count("source")).toBe(1);
    h.engine.play("tap");
    expect(h.ctx.count("osc")).toBeGreaterThan(0);
  });
});
