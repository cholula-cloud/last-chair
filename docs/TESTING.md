# Last Chair — testing

**Version:** 1.4 · **Updated:** 2026-11-21
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
| First-winter coach | Playwright, `npm run playtest:coach` | Walk the ten tips, review and start the lodge upgrade, use the first measured problem to open its map layer and Office tab, then Sleep and reload. Uses the same four viewports as the phone check. | Set `PLAY_URL` to the running game. Chromium by default, or `PLAYTEST_ENGINE=webkit`. | Automated |
| E2E smoke | Playwright Chromium, `npm run playtest:smoke` | Scene ready, opening build, night recap, mid-night reload at 390×844 | PR workflow when player-visible paths change; local before merge | Automated |
| Full P1 winter | `npm run playtest:p1` → `playtest-p0.mjs` (21 open days on the operating calendar, quiet + standard) | Settlement, replay, school visit script, weekday digest after closed blocks | Nightly / manual | Automated |
| Phone viewport (legacy) | `npm run playtest:p0` — superseded for viewport sizing by **Phone check**; keep until phone-check is stable on `main` | Full P0 season click-through in Chromium | Local | Exists |
| Device playtest | Real iPhone / iPad Safari | Feel, readability, touch | Optional M3 follow-up | Scripts below |

`npm run check` (PR 2) runs lint, typecheck, unit tests and build. Hosted CI in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) splits Vitest into **`test:ci:fast`** (everything except `balance.test.ts` and `m3Determinism.test.ts`) and **`test:ci:slow`**, runs them in parallel jobs, then **`check`** aggregates `fast` + `slow` for branch protection. Turn on branch protection with the **`check` job required** to block merges on red lint, types, tests, balance or build.

### GitHub Actions tiers

| Tier | Workflow | When | Jobs | Merge blocker? |
|---|---|---|---|---|
| 0 | `ci.yml` → `fast` + `slow`, then `check` | Every PR and push to `main` | **fast:** lint, typecheck, quick Vitest. **slow:** balance or determinism sims, m2-gate, build, bundle (uploads `web-out`). **check:** both must pass. | **Yes** (`check`, when branch protection is on) |
| 1 | `ci.yml` → `e2e-smoke` | PRs that touch `web/src`, `web/public`, `web/app`, or `web/scripts` | Chromium 390×844 smoke using the **slow** job build artifact (no second production build) | No (signal only) |
| 2 | `e2e-nightly.yml` | Daily 09:00 UTC and `workflow_dispatch` | Shared build, then full **P1 matrix** (Chromium + WebKit × four viewports) and **WebKit portrait** phone-check / save recovery / M2 opening | No |

Season logic and balance stay in Vitest; browser CI proves WebGL, touch targets, sheets, and save reload. A failed nightly WebKit leg (especially 844×390 landscape) is often a runner flake—rerun the workflow before treating it as a product bug. Artifacts upload on failure only.

**CI queueing:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **one CI workflow at a time** for the whole repo so several cloud agents pushing different branches at once do not stack six heavy Vitest jobs on shared runners (that pattern looks like hung `npm test` for 10–30 minutes). If CI feels stuck, check Actions for a queued run ahead of yours before debugging tests.

### M4 screenshot scripts (Playwright, static export)

Serve a fresh `npm run build` export (`npx serve@latest out -p 3010` from `web/`), set `PLAY_URL=http://127.0.0.1:3010`, then:

| Script | Output (default `/opt/cursor/artifacts/`) |
|---|---|
| `npm run screenshots:juice33` | `390x844-juice-{home-full-motion,home-reduced-motion,night-cash-count}.png` |
| `npm run screenshots:o4` | `390x844-o4-{crowds,revenue,guests-want}.png` |
| `npm run screenshots:o5` | `390x844-o5-trails.png` |

Also: `screenshots:snow30`, `screenshots:p4`, `screenshots:b6`, `screenshots:b7`, and lighting scripts from row 31.

---

## P0 device playtest (~15 min) — gate for M1

**Devices:** iPhone Safari (required), iPad Safari (recommended).

**Setup:** open `/play` (production or `cd web && npm run dev`). Add to Home Screen is an optional smoke; v1 stays a browser tab.

| Step | Action | Pass if |
|---|---|---|
| 1 | Tap **▶** to unpause | Clock advances; guests move on the mountain |
| 2 | Read top HUD | Day, time, cash visible without zoom |
| 3 | Read the ops strip | Queue, snow %, mood hint visible in the compact strip; tap to expand full status chips if needed |
| 4 | **Guests** → **Follow** one guest | List works; camera follows |
| 5 | **Build** → **Place on the hill** → tap a blocked spot then a valid top → **Place** (use **Lift’s in. Undo for $N.** before resuming) | Placement bar shows reason text; length and vertical in **ft** after a top tap; place only when valid and affordable; undo refunds until the clock moves. Two fingers pan the map at all times (no **Move map** toggle). **Minimize** on the placement bar should leave a slim Tools summary with **Cancel** and **Review** |
| 6 | **Office → Close hill** on Desk (or wait until 4 PM) | Night sheet opens |
| 7 | Change **Fare** and **Snow & service** | Full-width tiles, no pinch to read |
| 8 | **Sleep** | Morning; snow look changes with tier |
| 9 | Reload the tab | Progress restores, including mid-night state |

**Debrief:** Why did you change fare or snow tonight? Was anything buried or too small on the phone?

**M1 adds:** player can point to the cause of tonight's "problem" line (queue, snow, value) on the mountain or in "Why?".

---

## Optional first-winter device playtest (operating calendar)

After **CAL-1**, a full Dutch Hill winter is **seven Fri–Sun sittings** (21 playable days) with Mon–Thu advancing in the background. Expect a **weekday digest** on each return to an open morning. Legacy 28-day saves still play day-by-day until the player starts a new winter.

## Optional first-winter device playtest (legacy)

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

Run `npm run check:bundle` after the production build. The limits are 450 KiB gzip for initial play-page JavaScript and 350 KiB for the largest individual chunk, with the handoff’s 5% tolerance. The phone check records title load time (5 seconds), frame rate (30 fps), p95 frame time, draw calls (40) and triangles (200,000). Set `PHONE_CHECK_SOAK=1` for ten one-minute samples with the scene open. Software-rendered results identify the browser and renderer. Physical device testing is optional. The WebKit portrait workflow (`.github/workflows/phone-viewport.yml`) sets `PHONE_CHECK_SKIP_FPS=1` so CI does not fail the FPS floor under headless software rendering; still measure FPS on a GPU-backed run when signing off performance.

The November 19 integrated production export loaded the title in 185 ms at 390×844 in Chromium. Initial play-page JS was 177,496 bytes gzip, with the largest chunk at 337,558 bytes gzip. The scene used 28 draw calls and 182,221 triangles. Those checks passed. Under 4× CPU throttling with Mesa software rendering, the same run measured 1.8 fps and a 717 ms p95 frame. It failed the 30 fps target. Physical iPhone frame time and the device soak remain unmeasured.

PR #88 repeated the production benchmark under the same 4× CPU throttle using Chromium and Mesa software rendering. The canvas uses a lighter terrain and pine mesh on this renderer. UI text stays at native resolution. Pan, pinch, double tap, placement and speed controls passed at every size.

| CSS viewport | Mean FPS | p95 frame time |
|---|---:|---:|
| 390×844 | 47.1 | 33.4 ms |
| 844×390 | 34.7 | 66.6 ms |
| 820×1180 | 43.4 | 33.4 ms |
| 375×667 | 44.6 | 33.4 ms |

The quiet-recap audit at 375×667 checks both the OS motion preference and the saved game setting. It observes one live-region update per coach tip and per enabled broadcast, zero broadcasts when the radio is off, and no active CSS animation or transition on the tested recap elements. [Release browser matrix](https://github.com/cholula-cloud/last-chair/pull/88/checks)

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
| 2026-11-19 | Office, Readsboro and replay export | Production export, Chromium touch at 390×844 | The Office paused a running day, resumed it on close, and kept a previously paused day paused. Desk, Money, Reports, Crew and the save-slot shortcut opened. The school visit produced six arrivals and $150 on acceptance and no receipt on decline. The exported replay contained the school reply and notes and reproduced the saved state exactly. No page errors. |
| 2026-11-19 | M3 first-winter coach | Chromium touch input at 390×844, 844×390, 820×1180 and 375×667 | On a prepared day-one hill, all ten tips appeared in order. Players could review and start the Tier 2 upgrade, open Slope for a measured lift queue, inspect Money in the Office and return to the same recap. Fare, snow, Sleep, speed unlock and reload passed. All four viewports had zero page errors. |
| 2026-11-19 | M3 phone performance | 390×844 Chromium with software rendering and 4× CPU throttle | Title loaded in 185 ms. The hill used 28 draw calls and 182,221 triangles. At 1.8 FPS it missed the 30 FPS target. A physical-device frame rate and ten-minute soak remain unmeasured. |
| 2026-11-19 | M3 full winter, PR #80 candidate | Production export, 390×844 Chromium | Opened Dutch Hill, followed a guest, set fare and snow service, reached settlement, reloaded the review and replayed. The settlement agreed with debt and unpaid construction, career history survived replay, and the browser logged zero errors. |
| 2026-11-19 | Q8 accessibility | Chromium at 375×667, emulated touch and reduced motion | All four volume sliders and eight toggles had accessible names and 44 px targets. The 19 px text preference survived reload with no horizontal overflow. A muted opening showed captions and supported keyboard advance through four cards to the named founder dialog. No page errors. Eleven normal-text pairs passed 4.5:1 in both day and night palettes. Physical VoiceOver listening remains an owner device check. |
| 2026-11-19 | M3 hill sound and ambient life | Chromium touch, 390×844, reduced motion | Sound-on opened one audio device after Continue and played wind, a tap, the construction thunk, radio notes and the Tier 2 chime. Muted opened zero audio devices. The WebGL scene showed occupied chairs during the day and the snowcat on the grooming route after closing. |
| 2026-11-20 | Mobile HUD and placement chrome (PR #102) | `npm run check` on `main`; unit tests for `hudUi` and `trailPanel`; WebKit portrait job with `PHONE_CHECK_SKIP_FPS=1` | Merged hide/show HUD, compact conditions strip with expand, map tool rail (Layers/Grid/Recenter/Hide), placement **Minimize**, removed **Move map** mode in favor of always-on two-finger pan; `phone-check` lift copy updated to match placement hints. Uncoached device pass on Hide/Minimize still open. |
| 2026-11-20 | M4 stack merge overlap (#97–#111) | `npm run check`, `npm run m2-gate`; Playwright: `playtest-hud-fixes`, `playtest:m2`, `playtest:p0`, `playtest:layers`, `playtest:coach` (Chromium, static export) | Parallel HUD/layer-dock (#106) hid overlay readouts and overlapped morning note vs map rail; playtests updated for bottom layer dock. No leftover conflict markers; #110 slope-legend fix holds. |
| 2026-11-21 | M4b Batch 1 + forest + plan v2.13 | `npm run check` on `main` (967 tests, 66 asset rows); PRs [#144](https://github.com/cholula-cloud/last-chair/pull/144)–[#149](https://github.com/cholula-cloud/last-chair/pull/149) merged | Activities, mood lens, kit forest, coach/`problemGuide` alignment documented in MASTER_PLAN v2.13. Device Q1 sign-off still open. |

Log friction as a GitHub issue with device and OS version.

### Smoke check rule

A smoke check between PRs is **≤10 minutes and ≤2 in-game days**: load, one day, one night, one reload, one viewport each for iPhone portrait and iPad. Full-season and feel playtests happen only at milestone gates (M1 = PR 10, M3 = PR 27).

**P1 and Q9, November 19, 2026.** The four-persona weekday, weekend and vacation mixes, school lessons, venue needs, trail choices, finance and characterization tests passed. At 375 × 667, a touch-driven Chromium run on the production build opened Build from a prepared day-two save. The café undo confirmation displayed $480. Confirming restored the deposit, removed the café and canceled both installments in the saved slot. The warming-hut removal confirmation explained Elena’s lock and disabled removal.
