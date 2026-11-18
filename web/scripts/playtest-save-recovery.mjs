import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { chromium, webkit } from "playwright";

// Start the exported site first. PLAY_URL points at the same site as phone-check.
const base = (process.env.PLAY_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const engines = { chromium, webkit };
const engine = process.env.PLAYTEST_ENGINE ?? "chromium";
assert.ok(engines[engine], `Unknown browser ${engine}`);
const executablePath = engine === "chromium" ? process.env.CHROMIUM_EXECUTABLE : undefined;
const browser = await engines[engine].launch({
  executablePath,
  args: engine === "chromium" ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [],
});
const fixtureDir = new URL("../src/game/__fixtures__/saves/", import.meta.url);
const saveKey = "last-chair-v1";

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const notice = page.getByRole("status").filter({ hasText: "Your last winter couldn’t be loaded on this version. Starting fresh." });
  const dismiss = page.getByRole("button", { name: "Dismiss save notice" });

  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  const inject = async (raw) => {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: raw });
    await page.reload({ waitUntil: "domcontentloaded" });
  };

  const malformed = '{"state":';
  await inject(malformed);
  await notice.waitFor({ timeout: 20000 });
  assert.equal(await page.evaluate((key) => localStorage.getItem(`${key}-backup`), saveKey), malformed);
  const target = await dismiss.boundingBox();
  assert.ok(target && target.height >= 44 && target.width >= 44, "The dismiss button has a 44 px touch target");
  await dismiss.tap();
  await notice.waitFor({ state: "hidden" });

  const names = (await readdir(fixtureDir)).filter((name) => /^v\d+\.json$/.test(name));
  assert.ok(names.length > 0, "Save fixtures exist");
  for (const name of names) {
    const raw = await readFile(new URL(name, fixtureDir), "utf8");
    await inject(raw);
    await page.locator('[data-scene-ready="true"]').waitFor({ timeout: 45000 });
    assert.ok(!await notice.isVisible(), `${name} unexpectedly reset`);
  }
  assert.deepEqual(errors, []);
  console.log(`${engine} phone recovery passed for malformed data and ${names.length} save fixtures.`);
} finally {
  await browser.close();
}
