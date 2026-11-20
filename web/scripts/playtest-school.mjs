import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";
import { enterGame } from "./playtest-m2.mjs";

const { createBuiltHill } = await import("../src/game/__fixtures__/built-hill.ts");
const { pickFounder, skipToClose } = await import("../src/game/rules.ts");
const { SAVE_VERSION, toPersisted } = await import("../src/game/state.ts");
const { playReplay } = await import("../src/game/replay.ts");
const { ASSET_CATALOG } = await import("../src/game/base.ts");

const day = pickFounder(createBuiltHill(), "elena");
// Simulate an ordinary day at an established school. The rules must produce the offer.
const offer = skipToClose({
  ...day, dayIndex: 2, weather: day.weatherDays[1].kind, lodgeTier: 2,
  assets: [...day.assets, { id: "ski_school", at: { x: 1, z: 1 }, styleId: ASSET_CATALOG.ski_school.styleId }],
  completedBeats: ["first_load"],
});
assert.equal(offer.pendingBeat, "school_bus");
const save = JSON.stringify({ version: SAVE_VERSION, state: toPersisted(offer) });
const slotKey = "last-chair-m3-slot-1";
const engine = process.env.PLAYTEST_ENGINE ?? "chromium";
const [width, height] = (process.env.PLAYTEST_VIEWPORT ?? "390x844").split("x").map(Number);
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const browser = await ({ chromium, webkit })[engine].launch(engine === "chromium" ? {
  executablePath: process.env.CHROMIUM_EXECUTABLE, args: ["--enable-unsafe-swiftshader"],
} : {});

try {
  for (const accept of [true, false]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
    page.setDefaultTimeout(60_000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript(({ slotKey, save }) => {
      if (localStorage.getItem(slotKey)) return;
      localStorage.setItem(slotKey, save);
      localStorage.setItem("last-chair-settings", JSON.stringify({ version: 1, state: { radioEnabled: false } }));
    }, { slotKey, save });
    await page.goto(base + "/play/", { waitUntil: "domcontentloaded" });
    await enterGame(page);
    const button = name => page.getByRole("button", { name, exact: true });
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).state, slotKey);
    const card = page.getByRole("region", { name: /School bus offer/ });
    await card.waitFor();
    // The live region fills in after two animation frames, so wait for the body before reading it.
    await card.getByText(/6 pupils/).waitFor();
    assert.match(await card.innerText(), /6 pupils.*\$25/s);
    assert.equal(await button("Sleep until morning").isDisabled(), true);
    const reply = card.getByRole("button", { name: accept ? "Book the bus" : "Decline", exact: true });
    await reply.scrollIntoViewIfNeeded();
    const box = await reply.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44);
    await reply.tap();
    assert.equal((await read()).schoolContract.decision, accept ? "accepted" : "declined");
    if (accept) await page.getByText(/School bus booked for/).waitFor();
    await button("Sleep until morning").tap();
    await button("Office").tap();
    await button("Close hill").tap();
    await page.getByRole("heading", { name: "Closing recap" }).waitFor();
    const state = await read();
    assert.equal(state.dayIndex, 3);
    const receipt = page.getByRole("region", { name: /The Readsboro school bus/ });
    if (accept) {
      const bus = state.nightRecap.facts.schoolBus;
      assert.equal(bus.arrived, 6);
      assert.equal(bus.ticketRevenue, 150);
      assert.ok(bus.taught > 0 && bus.taught <= 6);
      await receipt.waitFor();
      assert.ok((await receipt.innerText()).includes(`${bus.taught} of 6 Readsboro kids got a lesson. Bus tickets brought in $150.`));
      await button("Sleep until morning").tap();
      await button("Resume day").tap();
      await button("Office").tap();
      const office = page.getByRole("dialog", { name: "Dutch Hill Office" });
      await office.getByRole("heading", { name: "Needs attention" }).waitFor();
      assert.equal((await read()).paused, true);
      await office.locator("summary").filter({ hasText: "Playtest notes" }).tap();
      await office.getByLabel("What happened?").fill("Booked the Readsboro visit and checked its receipts.");
      const downloadReady = Promise.race([
        page.waitForEvent("download"),
        page.waitForEvent("pageerror").then(error => { throw error; }),
      ]);
      const [download] = await Promise.all([downloadReady, office.getByRole("button", { name: "Export replay" }).tap()]);
      assert.equal(download.suggestedFilename(), "last-chair-replay.json");
      const replay = JSON.parse(await readFile(await download.path(), "utf8"));
      assert.equal(replay.notes, "Booked the Readsboro visit and checked its receipts.");
      assert.ok(replay.actions.some(action => action.rule === "decideSchoolContract"));
      assert.deepEqual(JSON.parse(JSON.stringify(toPersisted(playReplay(replay)))), await read());
      await office.getByRole("tab", { name: "Money", exact: true }).tap();
      await office.getByText(/School tickets \$150/).waitFor();
      await office.getByRole("tab", { name: "Crew", exact: true }).tap();
      await office.getByRole("heading", { name: "Crew talents" }).waitFor();
      await office.getByRole("tab", { name: "Reports", exact: true }).tap();
      await office.locator("summary").filter({ hasText: /^Day 3,/ }).tap();
      await office.getByText(`School tickets $150. ${bus.taught} of 6 pupils taught.`).waitFor();
      await office.getByRole("button", { name: "Close Office" }).tap();
      await button("Pause day").waitFor();
      assert.equal((await read()).paused, false);
    } else {
      assert.equal(state.nightRecap.facts.schoolBus, undefined);
      assert.equal(await receipt.count(), 0);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("Readsboro booking and decline verified", engine, width, height);
} finally {
  await browser.close();
}
