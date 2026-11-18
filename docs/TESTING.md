# Last Chair — testing

**Version:** 1.0 · **Updated:** 2026-11-18
Merged from the former P0 and P1 playtest scripts. PR rules that require these tests: [MASTER_PLAN.md §8](./MASTER_PLAN.md#8-how-we-work).

---

## Test layers

| Layer | Tool | Covers | Runs | Status |
|---|---|---|---|---|
| Unit | Vitest (added in PR 2) | Pure rules in `web/src/game/`: queues, satisfaction, snow, overnight, arrivals, beats, talents | `npm test`, CI on every PR | Set up (PR 2) |
| Characterization | Vitest + seeded RNG (PR 3) | Whole-day and whole-season snapshots, so refactors cannot change behavior silently | CI | Set up (PR 3) |
| Balance harness | Vitest (PR 10): `web/src/game/balance.ts` plays whole seasons through the real rules; `balance.test.ts` asserts the balance properties on 6 seeds (about 4 s, always on); `balance.report.test.ts` prints the 12-strategy table over 40 seeds | `cd web && npm run balance` (`BALANCE_SEEDS=N` changes the seed count). The property test runs in `npm test` and CI | Set up (PR 10) |
| Smoke | Replaced by the Vitest headless season test in `sim.test.ts` (PR 2) | Full season of nights through the real sim functions | `npm test`, CI on every PR | Replaced |
| Phone check | Playwright Chromium + WebKit, `npm run phone-check` (viewports 390×844, 844×390, 820×1180, 375×667; waits on `[data-scene-ready="true"]`; screenshots and perf gates to `PLAYTEST_OUT/phone-check/`, default `web/playtest-artifacts/phone-check/`) | Home pan/zoom, Build feet, speed chip, optional `?stats=1` draw-call budget (Chromium) | Local, before merge | Exists |
| Phone viewport (legacy) | `npm run playtest:p0` — superseded for viewport sizing by **Phone check**; keep until phone-check is stable on `main` | Full P0 season click-through in Chromium | Local | Exists |
| Device playtest | Real iPhone / iPad Safari | Feel, readability, touch | Milestone gates | Scripts below |

`npm run check` (PR 2) runs lint, typecheck, unit tests and build. GitHub Actions (`.github/workflows/ci.yml`) runs the same steps on every PR and push to `main`. To block merging on a red check, turn on branch protection for `main` with the `check` job required.

---

## P0 device playtest (~15 min) — gate for M1

**Devices:** iPhone Safari (required), iPad Safari (recommended).

**Setup:** open `/play` (production or `cd web && npm run dev`). Add to Home Screen is an optional smoke; v1 stays a browser tab.

| Step | Action | Pass if |
|---|---|---|
| 1 | Tap **▶** to unpause | Clock advances; guests move on the mountain |
| 2 | Read top HUD | Day, time, cash visible without zoom |
| 3 | Read the ops strip | Queue, snow %, mood hint visible |
| 4 | **Guests** → **Follow** one guest | List works; camera follows |
| 5 | **Build** → **Place on the hill** → tap a blocked spot then a valid top → **Place** (use **Placed · Undo** before resuming) | Placement bar shows reason text; length and vertical in **ft** after a top tap; place only when valid and affordable; undo refunds until the clock moves |
| 6 | **Close hill** (or wait until 4 PM) | Night sheet opens |
| 7 | Change **Fare** and **Snow & service** | Full-width tiles, no pinch to read |
| 8 | **Sleep** | Morning; snow look changes with tier |
| 9 | Reload the tab | Progress restores, including mid-night state |

**Debrief:** Why did you change fare or snow tonight? Was anything buried or too small on the phone?

**M1 adds:** player can point to the cause of tonight's "problem" line (queue, snow, value) on the mountain or in "Why?".

---

## P1 device playtest (~45–60 min) — gate for M3 (product MVP)

**Devices:** iPhone or iPad Safari (required for sign-off). If an incompatible save triggers the recovery notice, dismiss it and start a fresh winter. The game keeps a backup of the original save when storage is available.

| Step | Action | Pass if |
|---|---|---|
| 1 | Pick a founder | Modifiers listed; HUD shows Day 1 of the season |
| 2 | Unpause; read morning headline + weather | Clock advances; ops strip readable |
| 3 | Guests → Follow | Camera tracks the guest |
| 4 | Build surface + chair; buy lodge / café / guns | Valid/invalid descent; cash drops; visible change on the mountain |
| 5 | Close hill → fare + snow; read radio beat if shown | Beat must be acknowledged before Sleep |
| 6 | Sleep several mornings | Snow/groom/guns visible after Mid/High; crew talent toast |
| 7 | Reach the last day → Winter review | Cash, reputation, beats, talents summary; Tenney pin |
| 8 | Continue → mountain 2 stub → Replay | New winter starts cleanly |

### External sign-off (M3 gate)

- [ ] Player A (phone/tablet) finished winter 1
- [ ] Player B finished winter 1
- [ ] Player C finished winter 1

---

## M2 build gate and brief playtest

Run `npm run m2-gate` from `web/` for the 40-seed numerical comparison. Run `npm run playtest:m2` with the local game running to exercise the opening and prepared-save routes at 390×844. Playwright Chromium and WebKit are the default engines. Screenshots and the result summary go to `web/playtest-artifacts/m2/` unless `PLAYTEST_OUT` points elsewhere.

**November 18, 2026.** Scripted Chromium touch input placed a paid lift, painted and cut a trail, and verified both in the save in 106.2 seconds from the playable opening. The starter and new trail corridors rendered without dark shards at this viewport. A prepared-save run completed the Tier 2 lodge upgrade after two Sleeps, placed Rentals, and displayed a $144 Rentals receipt in the closing recap. The next morning, a new trail was cut and the following closing recap rendered with updated queue and satisfaction figures. The two browser days have different rosters, so the paired simulation gate measures causality separately. Testing exposed crowded clock and undo/recenter controls at phone size. The working branch adjusts their layout.

WebKit could not run because its browser download returned HTTP 403. The Chromium phone check also verified scene visibility and four pan gestures. Its pinch and frame-rate checks remain unverified. The opening time is a scripted measurement. First-time player usability remains unverified.

Follow-up review checked the new build cues at 390×844 and 844×390 in Chromium. Lift sites and the finish of the painted trail are marked on the map, and the landscape build card leaves the markers clear. Regression tests cover a brush stroke that would otherwise stall input, construction beside a moved lift terminal, and clearing a lift corridor without moving the camera.

For the first-time check, use a fresh save. Ask the player to add a lift and paint a new trail without explaining the controls. Start the timer at the first playable frame after founder selection. Record the saved builds, elapsed time, and where the player hesitated or asked for help.

The follow-up Chromium touch opening completed in 92.6 seconds with the updated builder controls. This run also used scripted input. GitHub's WebKit portrait check passed for the standalone B1 PR.

The strict 40-seed simulation gate passed. The painted green cut mean wait by 1.08 minutes, improved satisfaction by 7.97 points, and increased distinct beginner chair boardings in all 40 seeds. Moving the developed chair met both mean floors and changed completed-run counts in 39 of 40 seeds. See the [calibration table](./SIMULATION_SPEC.md#m2-acceptance-calibration).

## Sign-off log

| Date | Gate | Who / how | Result |
|---|---|---|---|
| 2026-11-16 | P0 (stub sim) | Agent, Chromium iPhone viewport, `playtest-p0.mjs` | Click-through passed; sim later found mostly cosmetic. Re-sign in M1 |
| 2026-11-16 | P1 (stub sim) | Agent, `smoke-winter.mjs`, 14-day season | Click-through passed; external players not run. Re-sign in M3 |
| 2026-11-16 | Smoke after M0 (PRs 1–4) | Sonnet agent, Playwright Chromium: iPhone 390×844 portrait + landscape, iPad 1180×820; stopped at day 6 | No app errors; night reload, run count and day-1 beat confirmed. Found: portrait HUD overlap, ops-strip mood ≠ recap happy %, `$-104` formatting, Sleep disabled with no reason during a radio beat → PR 4b |
| 2026-11-17 | M1 playtest (honest sim, PRs 5–10) | Sonnet agent, Playwright Chromium phone sizes (portrait and 844×390 landscape), 14-day season; real-device and external playtests not run | Passed with findings, all fixed in PR 10b: arrivals started too late, "0.0m Short queue" on an empty hill, losing days unexplained, snow charge hidden in the recap, unlabeled value/snow numbers, previews shifted on "Got it", duplicate Happy label, cramped landscape night sheet, chair placeable on the surface lift's slot |

Log friction as a GitHub issue with device and OS version.

### Smoke check rule

A smoke check between PRs is **≤10 minutes and ≤2 in-game days**: load, one day, one night, one reload, one viewport each for iPhone portrait and iPad. Full-season and feel playtests happen only at milestone gates (M1 = PR 10, M3 = PR 27).
