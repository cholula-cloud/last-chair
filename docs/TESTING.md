# Last Chair — testing

**Version:** 1.0 · **Updated:** 2026-11-19
Merged from the former P0 and P1 playtest scripts. PR rules that require these tests: [MASTER_PLAN.md §8](./MASTER_PLAN.md#8-how-we-work).

---

## Test layers

| Layer | Tool | Covers | Runs | Status |
|---|---|---|---|---|
| Unit | Vitest (added in PR 2) | Pure rules in `web/src/game/`: queues, satisfaction, snow, overnight, arrivals, beats, talents | `npm test`, CI on every PR | Set up (PR 2) |
| Characterization | Vitest + seeded RNG (PR 3) | Whole-day and whole-season snapshots, so refactors cannot change behavior silently | CI | Set up (PR 3) |
| Balance harness | Vitest and seeded seasons | Six-seed operating, settlement and story properties. The extended report compares 14 strategies, six founders and paired offer choices over 40 seeds. | Six seeds in `npm test` and CI. From `web/`, run `npm run balance` for the extended report. | Automated |
| Smoke | Replaced by the Vitest headless season test in `sim.test.ts` (PR 2) | Full season of nights through the real sim functions | `npm test`, CI on every PR | Replaced |
| Phone check | Playwright Chromium + WebKit, `npm run phone-check` (viewports 390×844, 844×390, 820×1180, 375×667; waits on `[data-scene-ready="true"]`; screenshots and perf gates to `PLAYTEST_OUT/phone-check/`, default `web/playtest-artifacts/phone-check/`) | Home pan/zoom, Build feet, speed chip, optional `?stats=1` draw-call budget (Chromium) | Local, before merge | Exists |
| Accessibility | Vitest palette contrast and Playwright, `npm run playtest:accessibility` | Eleven text/background pairs in both palettes, labelled controls and dialogs, targets, large text, keyboard story progression and silent captions | Contrast runs in CI. Set `PLAY_URL` to a served game for the browser audit. | Automated |
| Mountain layers | Playwright, `npm run playtest:layers` | Switch all four layers, tap a real trail segment, compare gun service and scrub conditions through tomorrow without changing the save. | Set `PLAY_URL` to a running game. Use `PLAYTEST_ENGINE=webkit` for WebKit. | Automated |
| First-winter coach | Playwright, `npm run playtest:coach` | Walk the ten tips on a prepared afternoon and first night, check control clearance, Sleep and reloading. Uses the same four viewports as the phone check. | Set `PLAY_URL` to the running game. Chromium by default, or `PLAYTEST_ENGINE=webkit`. | Automated |
| Phone viewport (legacy) | `npm run playtest:p0` — superseded for viewport sizing by **Phone check**; keep until phone-check is stable on `main` | Full P0 season click-through in Chromium | Local | Exists |
| Device playtest | Real iPhone / iPad Safari | Feel, readability, touch | Optional M3 follow-up | Scripts below |

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
| 5 | **Build** → **Place on the hill** → tap a blocked spot then a valid top → **Place** (use **Lift placed. Undo for $N.** before resuming) | Placement bar shows reason text; length and vertical in **ft** after a top tap; place only when valid and affordable; undo refunds until the clock moves |
| 6 | **Close hill** (or wait until 4 PM) | Night sheet opens |
| 7 | Change **Fare** and **Snow & service** | Full-width tiles, no pinch to read |
| 8 | **Sleep** | Morning; snow look changes with tier |
| 9 | Reload the tab | Progress restores, including mid-night state |

**Debrief:** Why did you change fare or snow tonight? Was anything buried or too small on the phone?

**M1 adds:** player can point to the cause of tonight's "problem" line (queue, snow, value) on the mountain or in "Why?".

---

## Optional first-winter device playtest

M3 uses automated simulation and browser checks for acceptance. An external session can provide feedback on readability, touch and player understanding. No external sessions have been recorded as of November 19, 2026.

Use a fresh slot in Safari on an iPhone or iPad. Allow up to 90 minutes over two sittings on the same device. Players may change speed or skip to close. For an uncoached session, ask the player to play a winter at Dutch Hill and keep the following prompts for the observer.

| Observe | Evidence to record |
|---|---|
| Choose a founder and open the hill | Founder terms and Day 1 date were readable. The player placed a lift, painted a trail and saw guests ride. Record opening time and any hesitation. |
| Follow a guest and use the build sheet | Guest tracking worked. For a building or chair, the player could find its price, construction terms and the change on the mountain. |
| Close, choose tomorrow's fare or service, then read the next recap | The player could link a choice to a measured problem and distinguish the forecast from the result. |
| Reload once during the night | Day, pending choices, radio and night sheet restored. |
| Observe weather, crew and local events | Record the weather and events actually seen, the relevant morning changes and any unclear text or controls. |
| Respond to Readsboro or Vivian when offered | Record the reply and actual school attendance, lessons or fare cap. The player chooses freely. An offer may never arrive. |
| Reach the review, continue when eligible, then replay | Record completed days, cash, debt, construction, net worth and outcome. Replay starts a fresh winter and keeps the previous settlement. |

After play, ask why the player changed fare or snow on a night they remember, whether anything felt unfair, and which controls were difficult to find or read. Log volunteered feedback with device and OS version.

---

## M2 build gate and brief playtest

**Agent baseline (19 Nov 2026, Atlantic/Bermuda).** `npm run check`, `npm run m2-gate`, and render/build unit tests passed on `main`. Chromium `playtest:m2` completed the scripted opening in 91.2s with tier-2 rentals revenue. `phone-check` FPS thresholds failed in headless cloud VMs (low GPU); use a real device or local GPU for FPS sign-off. Uncoached first-time player sign-off remains open.

Run `npm run m2-gate` from `web/` for the 40-seed numerical comparison. Run `npx playwright install chromium` once before `playtest:m2` on a fresh checkout. Run `npm run playtest:m2` with the local game running to exercise the opening and prepared-save routes at 390×844. Playwright Chromium and WebKit are the default engines. Screenshots and the result summary go to `web/playtest-artifacts/m2/` unless `PLAYTEST_OUT` points elsewhere.

**November 18, 2026.** Scripted Chromium touch input placed a paid lift, painted and cut a trail, and verified both in the save in 106.2 seconds from the playable opening. The starter and new trail corridors rendered without dark shards at this viewport. A prepared-save run completed the Tier 2 lodge upgrade after two Sleeps, placed Rentals, and displayed a $144 Rentals receipt in the closing recap. The next morning, a new trail was cut and the following closing recap rendered with updated queue and satisfaction figures. The two browser days have different rosters, so the paired simulation gate measures causality separately. Testing exposed crowded clock and undo/recenter controls at phone size. The working branch adjusts their layout.

WebKit could not run because its browser download returned HTTP 403. The Chromium phone check also verified scene visibility and four pan gestures. Its pinch and frame-rate checks remain unverified. The opening time is a scripted measurement. First-time player usability remains unverified.

Follow-up review checked the new build cues at 390×844 and 844×390 in Chromium. Lift sites and the finish of the painted trail are marked on the map, and the landscape build card leaves the markers clear. Regression tests cover a brush stroke that would otherwise stall input, construction beside a moved lift terminal, and clearing a lift corridor without moving the camera.

For the first-time check, use a fresh save. Ask the player to add a lift and paint a new trail without explaining the controls. Start the timer at the first playable frame after founder selection. Record the saved builds, elapsed time, and where the player hesitated or asked for help.

The follow-up Chromium touch opening completed in 92.6 seconds with the updated builder controls. This run also used scripted input. GitHub's WebKit portrait check passed for the standalone B1 PR.

The strict 40-seed simulation gate passed. The painted green cut mean wait by 1.08 minutes, improved satisfaction by 7.97 points, and increased distinct beginner chair boardings in all 40 seeds. Moving the developed chair met both mean floors and changed completed-run counts in 39 of 40 seeds. See the [calibration table](./SIMULATION_SPEC.md#m2-acceptance-calibration).

## Performance and replay checks

Run `npm run check:bundle` after the production build. The limits are 450 KiB gzip for initial play-page JavaScript and 350 KiB for the largest individual chunk, with the handoff’s 5% tolerance. The phone check records title load time (5 seconds), frame rate (30 fps), p95 frame time, draw calls (40) and triangles (200,000). Set `PHONE_CHECK_SOAK=1` for ten one-minute samples with the scene open. Software-rendered results identify the browser and renderer. Physical device testing is optional.

The November 19 integrated production export loaded the title in 185 ms at 390×844 in Chromium. Initial play-page JS was 177,496 bytes gzip, with the largest chunk at 337,558 bytes gzip. The scene used 28 draw calls and 182,221 triangles. Those checks passed. Under 4× CPU throttling with Mesa software rendering, the same run measured 1.8 fps and a 717 ms p95 frame. It failed the 30 fps target. Physical iPhone frame time and the device soak remain unmeasured.

In the Office, open **Playtest notes** and export the replay, or use **Send notes** to share the replay and typed feedback together. On browsers without file sharing, the attachment downloads. Reproduce the session from `web/` with `npm run replay -- /path/to/last-chair-replay.json`. The file contains the starting checkpoint, RNG seed and game actions since that checkpoint. Loading a slot starts a fresh recording. Long sessions checkpoint every 30,000 recorded actions. The replay uses the same release’s rules.

## Optional install on iPhone (row Q1)

Run on a real iPhone with Safari, against the deployed Pages site (the manifest only resolves under its real base path).

| Step | Action | Pass if |
|---|---|---|
| 1 | Open the site in Safari, tap Share, then Add to Home Screen | The name field shows "Last Chair" and the icon preview shows the chairlift, not a page screenshot |
| 2 | Add it, then open it from the Home Screen | It opens full screen with no Safari address bar or toolbar, and the status bar is dark with a readable clock |
| 3 | Reach the title screen, then Continue or New winter | The top bar and the bottom bar sit clear of the notch or Dynamic Island and the home indicator in portrait |
| 4 | Turn the phone to landscape | Nothing sits under the notch side or the rounded corners; the app does not lock rotation |
| 5 | Drag, pinch and rotate on the mountain, then pull down from the top of the screen | The camera moves; the page does not bounce, refresh or zoom |
| 6 | Swipe in from the left edge | Note what happens. iOS may treat it as back; record whether it leaves the app or does nothing |
| 7 | Play a day, close the app from the app switcher, reopen it | It reopens to the title screen with Continue available |

The installed app has its own storage. A winter saved in a Safari tab does not appear in it. Record device, iOS version and any step that fails.

## Hill sound and ambient life

From `web/`, run `PLAY_URL=http://localhost:3000 npm run playtest:feel` against a running build. Set `CHROMIUM_EXECUTABLE` to use a system Chromium. At 390×844 the check reads the live skier and chair instances, follows the groomer from its yard onto a trail, and inspects Web Audio as a lodge is built and upgraded. A second browser context starts muted. Both use reduced motion.

## Sign-off log

| Date | Gate | Who / how | Result |
|---|---|---|---|
| 2026-11-16 | P0 (stub sim) | Agent, Chromium iPhone viewport, `playtest-p0.mjs` | Click-through passed; sim later found mostly cosmetic. Re-sign in M1 |
| 2026-11-16 | P1 (stub sim) | Agent, `smoke-winter.mjs`, 14-day season | Click-through passed; external players not run. Re-sign in M3 |
| 2026-11-16 | Smoke after M0 (PRs 1–4) | Sonnet agent, Playwright Chromium: iPhone 390×844 portrait + landscape, iPad 1180×820; stopped at day 6 | No app errors; night reload, run count and day-1 beat confirmed. Found: portrait HUD overlap, ops-strip mood ≠ recap happy %, `$-104` formatting, Sleep disabled with no reason during a radio beat → PR 4b |
| 2026-11-17 | M1 playtest (honest sim, PRs 5–10) | Sonnet agent, Playwright Chromium phone sizes (portrait and 844×390 landscape), 14-day season; real-device and external playtests not run | Passed with findings, all fixed in PR 10b: arrivals started too late, "0.0m Short queue" on an empty hill, losing days unexplained, snow charge hidden in the recap, unlabeled value/snow numbers, previews shifted on "Got it", duplicate Happy label, cramped landscape night sheet, chair placeable on the surface lift's slot |
| 2026-11-19 | Dutch Hill first-winter choices | Scripted portrait Chromium, including prepared school and Day 18 offer saves | School booking and decline, six pupil arrivals, $150 ticket receipt, both Vivian replies, accepted cap, 5/6 lesson memory, solvent review and Tenney transition passed. P0 reached bankruptcy review with zero page errors. Save recovery passed. |
| 2026-11-19 | M2 scripted touch opening | Portrait Chromium, isolated run | Opened in 75.9 seconds. Tier 2 rentals earned $180, the wind hold and forecasts passed, and the script observed zero page errors. |
| 2026-11-19 | Phone renderer | 390×844 headless Chromium, SwiftShader and 4× CPU throttle | Gestures, placement and speed controls passed. 25 draw calls and 182,221 triangles met scene budgets. Measured 2.8 FPS against the 30 FPS target. Device Safari and uncoached human sign-off remain open. |
| 2026-11-19 | First-winter merge, PR #77 | Hosted CI and Playwright WebKit, 390×844 | CI passed lint, typecheck, tests, the 40-seed M2 gate and production build. WebKit passed viewport interactions, save recovery, and the opening and lodge scenarios. The scripted opening took 16.3 seconds. This run collected no FPS measurement. [CI](https://github.com/cholula-cloud/last-chair/actions/runs/44589727395) · [WebKit](https://github.com/cholula-cloud/last-chair/actions/runs/44589726764) |
| 2026-11-19 | M3 first-winter coach | Chromium touch input at 390×844, 844×390, 820×1180 and 375×667 | On a prepared day-one hill, all ten tips appeared in order. The day tips cleared their controls, fare and snow selections advanced the night tips, and speed unlocked after Sleep. Reload kept the coach finished. All four viewports had zero page errors. |
| 2026-11-19 | M3 full winter, PR #80 candidate | Production export, 390×844 Chromium | Opened Dutch Hill, followed a guest, set fare and snow service, reached settlement, reloaded the review and replayed. The settlement agreed with debt and unpaid construction, career history survived replay, and the browser logged zero errors. |
| 2026-11-19 | Q8 accessibility | Chromium at 375×667, emulated touch and reduced motion | All four volume sliders and eight toggles had accessible names and 44 px targets. The 19 px text preference survived reload with no horizontal overflow. A muted opening showed captions and supported keyboard advance through four cards to the named founder dialog. No page errors. Eleven normal-text pairs passed 4.5:1 in both day and night palettes. Physical VoiceOver listening remains an owner device check. |

Log friction as a GitHub issue with device and OS version.

### Smoke check rule

A smoke check between PRs is **≤10 minutes and ≤2 in-game days**: load, one day, one night, one reload, one viewport each for iPhone portrait and iPad. Full-season and feel playtests happen only at milestone gates (M1 = PR 10, M3 = PR 27).

**P1 and Q9, November 19, 2026.** The four-persona weekday, weekend and vacation mixes, school lessons, venue needs, trail choices, finance and characterization tests passed. At 375 × 667, a touch-driven Chromium run on the production build opened Build from a prepared day-two save. The café undo confirmation displayed $480. Confirming restored the deposit, removed the café and canceled both installments in the saved slot. The warming-hut removal confirmation explained Elena’s lock and disabled removal.
