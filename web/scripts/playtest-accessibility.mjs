// Browser checks for Q8. A screen reader on a physical device is a separate listening test.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const { createBuiltHill } = await import("../src/game/__fixtures__/built-hill.ts");
const { pickFounder, skipToClose } = await import("../src/game/rules.ts");
const { SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");

const engine = process.env.PLAYTEST_ENGINE ?? "chromium";
const browser = await ({ chromium, webkit })[engine].launch(engine === "chromium" ? {
  executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--enable-unsafe-swiftshader"],
} : {});
const base = (process.env.PLAY_URL ?? "http://localhost:3000").replace(/\/$/, "");
const page = await browser.newPage({ viewport: { width: 375, height: 667 }, hasTouch: true, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const button = name => page.getByRole("button", { name, exact: true });
const press = name => button(name).click();
async function touchTarget(locator) {
  const box = await locator.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, "At least 44 CSS pixels per target");
}
async function fits() {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "No horizontal overflow");
}
async function checkQuietRecap(radioEnabled) {
  const night = skipToClose(pickFounder(createBuiltHill(42), "elena"));
  assert.equal(night.pendingBeat, "first_load");
  const recap = await browser.newPage({ viewport: { width: 375, height: 667 }, hasTouch: true,
    reducedMotion: radioEnabled ? "no-preference" : "reduce" });
  recap.on("pageerror", error => errors.push(error.message));
  try {
    await recap.addInitScript(({ save, radioEnabled }) => {
      localStorage.setItem("last-chair-m3-slot-1", JSON.stringify(save));
      localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: {
        muted: true, radioEnabled, reduceMotion: radioEnabled, tips: true,
      } }));
      window.liveUpdates = [];
      new MutationObserver(records => {
        const touched = new Set();
        for (const record of records) {
          const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
          const status = element?.closest('[role="status"]');
          if (status) touched.add(status);
        }
        for (const status of touched) {
          const source = status.closest('aside[aria-label="Tip"], aside[aria-label="First problem guide"]') ? "coach"
            : status.closest('section[aria-label^="Route 100 Radio:"]') ? "radio" : null;
          if (source && status.textContent) window.liveUpdates.push({ source, text: status.textContent });
        }
      }).observe(document, { childList: true, characterData: true, subtree: true });
    }, { radioEnabled, save: { version: SAVE_VERSION, state: toPersisted(night) } });
    await recap.goto(base + "/play/", { waitUntil: "domcontentloaded" });
    await enterGame(recap);
    const guide = recap.getByRole("complementary", { name: "First problem guide" });
    await guide.getByRole("status").filter({ hasText: /check|inspect|find/i }).waitFor();
    const coach = recap.getByRole("complementary", { name: "Tip", exact: true }).getByRole("status");
    const radio = recap.getByRole("region", { name: /Route 100 Radio: First uphill load/ });
    if (radioEnabled) await radio.getByRole("status").filter({ hasText: /First tickets since 1985/ }).waitFor();
    else assert.equal(await radio.count(), 0);

    const motion = await recap.evaluate(() => [...document.querySelectorAll(
      '.sheet, .scrim, aside[aria-label="Tip"], aside[aria-label="First problem guide"], .arrive, .pop',
    )].flatMap(element => {
      const css = getComputedStyle(element);
      const animated = css.animationName !== "none" || css.transitionDuration.split(",").some(value => parseFloat(value) > 0);
      return animated ? [element.className.toString()] : [];
    }));
    assert.deepEqual(motion, [], "Coach, radio and sheet have no CSS animation or transition");
    // An unrelated recap update must leave the first broadcast alone.
    await guide.getByRole("button", { name: "Dismiss advice" }).click();
    await coach.filter({ hasText: /The night recap tells you/ }).waitFor();
    const updates = await recap.evaluate(() => window.liveUpdates);
    const tips = updates.filter(update => update.source === "coach");
    assert.equal(tips.length, 2);
    assert.match(tips[0].text, /check|inspect|find/i);
    assert.match(tips[1].text, /The night recap tells you/);
    const broadcasts = updates.filter(update => update.source === "radio" && update.text.includes("First uphill load"));
    assert.equal(broadcasts.length, radioEnabled ? 1 : 0);
    if (!radioEnabled) assert.equal(updates.filter(update => update.source === "radio").length, 0);
  } finally {
    await recap.close();
  }
}
try {
  await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
  await press("Settings");
  for (const name of ["Master volume", "Music volume", "Effects volume", "Voice volume"]) {
    const slider = page.getByRole("slider", { name, exact: true });
    await touchTarget(slider);
    await slider.focus();
    await slider.press("Home");
    await slider.press("ArrowRight");
    assert.equal(await slider.inputValue(), "5");
  }
  for (const name of ["Sound", "Voice", "Coach tips", "Captions", "Reduce motion", "Large text", "Low graphics", "Pattern aids"]) {
    await touchTarget(button(name));
    await press(name);
  }
  await fits();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("last-chair-settings")).state);
  assert.equal(saved.masterVolume, 5);
  assert.equal(saved.muted, true);
  assert.equal(saved.patternAids, false);
  assert.equal(saved.graphicsQuality, "low");
  await page.reload({ waitUntil: "domcontentloaded" });
  await press("Settings");
  assert.equal(await button("Large text").getAttribute("aria-pressed"), "true");
  assert.equal(await page.evaluate(() => parseInt(getComputedStyle(document.documentElement).fontSize)), 19);
  await press("Back");
  await press("New winter");
  const story = page.getByRole("dialog", { name: "Dutch Hill story" });
  await story.waitFor();
  await story.getByRole("status").waitFor();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await press("Choose a founder");
  const founders = page.getByRole("dialog", { name: "Dutch Hill, winter 1" });
  await founders.waitFor();
  await touchTarget(founders.getByRole("button", { name: /Elena Vargas/ }));
  await fits();
  await checkQuietRecap(false);
  await checkQuietRecap(true);
  assert.deepEqual(errors, []);
  console.log(engine + ": 4 named sliders, 8 toggles, 44px targets, saved large text, silent captions, named dialogs and keyboard story progression, motion-free recaps, and single coach/radio announcements passed at 375×667.");
} finally {
  await browser.close();
}
