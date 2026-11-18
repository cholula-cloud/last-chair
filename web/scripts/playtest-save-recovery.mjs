import assert from "node:assert/strict";
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
const saveKey = "last-chair-m3-slot-1";

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const notice = page.getByRole("status").filter({ hasText: "Your last winter couldn’t be loaded on this version. Starting fresh." });
  const dismiss = page.getByRole("button", { name: "Dismiss save notice" });

  await page.goto(`${base}/play/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("last-chair-v1", "Old winter");
    localStorage.setItem("last-chair-v1-backup", "Old backup");
    localStorage.setItem("unrelated-preference", "kept");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const newWinter = page.getByRole("button", { name: "New winter", exact: true });
  await newWinter.waitFor({ timeout: 20000 });
  await newWinter.tap();
  const founder = page.getByRole("button", { name: /Elena Vargas/ });
  await founder.waitFor({ timeout: 20000 });
  assert.deepEqual(await page.evaluate(() => ["last-chair-v1", "last-chair-v1-backup", "unrelated-preference"]
    .map((key) => localStorage.getItem(key))), [null, null, "kept"]);
  await founder.tap();
  const before = await page.evaluate((key) => localStorage.getItem(key), saveKey);
  assert.ok(before, "Picking a founder starts an M3 save");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Continue/ }).tap();
  await page.getByText("Build your first lift", { exact: true }).waitFor({ timeout: 20000 });
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), saveKey), before);

  const malformed = '{"state":';
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: saveKey, value: malformed });
  await page.reload({ waitUntil: "domcontentloaded" });
  await notice.waitFor({ timeout: 20000 });
  assert.equal(await page.evaluate((key) => localStorage.getItem(`${key}-backup`), saveKey), malformed);
  const target = await dismiss.boundingBox();
  assert.ok(target && target.height >= 44 && target.width >= 44, "The dismiss button has a 44 px touch target");
  await dismiss.tap();
  await notice.waitFor({ state: "hidden" });

  assert.deepEqual(errors, []);
  console.log(`${engine} phone check passed for the M3 reset, reload and corrupt save recovery.`);
} finally {
  await browser.close();
}
