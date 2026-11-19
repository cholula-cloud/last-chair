// Browser checks for Q8. A screen reader on a physical device is a separate listening test.
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

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
  assert.deepEqual(errors, []);
  console.log(engine + ": 4 named sliders, 8 toggles, 44px targets, saved large text, silent captions, named dialogs and keyboard story progression passed at 375×667.");
} finally {
  await browser.close();
}
