// Exercise actual Web Audio and instanced guests on an operating hill at phone size.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { enterGame, resolveRadio } from "./playtest-m2.mjs";
const { createBuiltHill } = await import("../src/game/__fixtures__/built-hill.ts");
const { pickFounder, tick } = await import("../src/game/rules.ts");
const { SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");
const { MS_PER_GAME_MINUTE } = await import("../src/game/types.ts");

const opening = pickFounder(createBuiltHill(9), "elena");
let hill = { ...opening, lifts: opening.lifts.map(lift => ({ ...lift, type: "chair" })), cash: 25000, paused: false };
while (hill.phase === "day" && (hill.clockMin < 780 || !hill.guests.some(guest => guest.state === "ride"))) {
  hill = tick(hill, MS_PER_GAME_MINUTE);
}
assert.equal(hill.phase, "day", "Fixture should have an afternoon chair rider");
const save = { state: toPersisted({ ...hill, paused: true }), version: SAVE_VERSION };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--enable-unsafe-swiftshader"] });

async function renderedHill(page) {
  return page.locator("canvas").first().evaluate(canvas => {
    const key = Object.keys(canvas).find(name => name.startsWith("__reactFiber$"));
    for (let fiber = canvas[key]; fiber; fiber = fiber.return) {
      if (fiber.stateNode instanceof Element) continue;
      for (let hook = fiber.memoizedState; hook; hook = hook.next) {
        const state = hook.memoizedState?.current;
        if (state?.gl?.domElement !== canvas) continue;
        const skiers = state.scene.getObjectByName("skiers");
        return { cat: state.scene.getObjectByName("snowcat")?.position.toArray(), skiers: skiers?.count,
          capacity: skiers?.instanceMatrix.count, riders: state.scene.getObjectByName("occupied-chairs")?.count };
      }
    }
    return null;
  });
}

try {
  for (const muted of [false, true]) {
    console.log(`Opening the ${muted ? "muted" : "sound-on"} winter`);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    page.setDefaultTimeout(60000);
    await page.addInitScript(({ save, muted }) => {
      localStorage.setItem("last-chair-m3-slot-1", JSON.stringify(save));
      localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: { muted, reduceMotion: true, tips: false } }));
      const audio = window.audioEvidence = { devices: 0, loops: 0, notes: [] };
      const schedule = AudioParam.prototype.setValueAtTime;
      AudioParam.prototype.setValueAtTime = function(value, at) {
        if (value >= 32) audio.notes.push(value);
        return schedule.call(this, value, at);
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function(...args) {
        if (this.loop) audio.loops++;
        return start.apply(this, args);
      };
      window.AudioContext = class extends AudioContext {
        constructor(...args) { super(...args); audio.devices++; }
      };
    }, { save, muted });
    await page.goto((process.env.PLAY_URL ?? "http://127.0.0.1:3000") + "/play/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Continue/ }).waitFor();
    assert.equal(await page.evaluate(() => window.audioEvidence.devices), 0);
    await enterGame(page);
    // The HUD can open while the GLB models are still suspended.
    let day = await renderedHill(page);
    const deadline = Date.now() + 60000;
    while ((!day?.cat || !day?.skiers) && Date.now() < deadline) {
      await page.waitForTimeout(120);
      day = await renderedHill(page);
    }
    assert(day?.cat && day.skiers > 0 && day.skiers <= 24 && day.capacity === 24 && day.riders > 0);
    console.log(`Rendered ${day.skiers} skiers and ${day.riders} occupied chairs`);
    const tap = name => page.getByRole("button", { name, exact: true }).tap({ force: true });
    if (!muted) {
      await tap("Build");
      await tap("Review Tier 2 upgrade");
      await tap("Start lodge upgrade");
      await tap("Close build sheet");
    }
    await tap("Office");
    await tap("Close hill");
    await page.getByRole("heading", { name: "Closing recap" }).waitFor();
    const night = await renderedHill(page);
    assert.notDeepEqual(night.cat, day.cat, "The groomer should leave its yard");
    if (!muted) {
      for (let i = 0; i < 2; i++) {
        if (i > 0) await tap("Close hill");
        await resolveRadio(page);
        await tap("Sleep until morning");
      }
      await page.getByText("Lodge Tier 2 is open", { exact: true }).waitFor();
    }
    const audio = await page.evaluate(() => window.audioEvidence);
    if (muted) assert.deepEqual(audio, { devices: 0, loops: 0, notes: [] });
    else {
      assert.equal(audio.devices, 1);
      assert.equal(audio.loops, 1);
      for (const hz of [1900, 130, 523.25, 1318.5]) assert(audio.notes.includes(hz), `Missing ${hz} Hz cue`);
    }
    console.log(muted ? "390×844 muted winter: silent device, occupied chairs and grooming passed"
      : "390×844 sound-on winter: wind, taps, construction, radio, tier-up and grooming passed");
    await page.close();
  }
} finally {
  await browser.close();
}
