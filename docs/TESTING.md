# Last Chair — testing

**Version:** 1.0 · **Updated:** 2026-11-16
Merged from the former P0 and P1 playtest scripts. PR rules that require these tests: [MASTER_PLAN.md §5](./MASTER_PLAN.md#5-how-we-work).

---

## Test layers

| Layer | Tool | Covers | Runs | Status |
|---|---|---|---|---|
| Unit | Vitest (added in PR 2) | Pure rules in `web/src/game/`: queues, satisfaction, snow, overnight, arrivals, beats, talents | `npm test`, CI on every PR | Set up (PR 2) |
| Characterization | Vitest + seeded RNG (PR 3) | Whole-day and whole-season snapshots, so refactors cannot change behavior silently | CI | Set up (PR 3) |
| Balance harness | Vitest (PR 10): `web/src/game/balance.ts` plays whole seasons through the real rules; `balance.test.ts` asserts the balance properties on 6 seeds (about 4 s, always on); `balance.report.test.ts` prints the 12-strategy table over 40 seeds | `cd web && npm run balance` (`BALANCE_SEEDS=N` changes the seed count). The property test runs in `npm test` and CI | Set up (PR 10) |
| Smoke | Replaced by the Vitest headless season test in `sim.test.ts` (PR 2) | Full season of nights through the real sim functions | `npm test`, CI on every PR | Replaced |
| Phone viewport | Playwright iPhone viewport, `npm run playtest:p0` (Chromium from `npx playwright install chromium`; screenshots to `PLAYTEST_OUT`, default `web/playtest-artifacts/`) | P0 script steps in Chromium at iPhone size | Local, before merge | Exists |
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
| 5 | **Build** → pick a blocked top (Ridge, Creek) → pick a valid top (Mid) → **Place lift** (then **Undo last lift** before resuming) | Reason text names why a top is blocked; place only when valid and affordable; undo refunds the price until the clock moves |
| 6 | **Close hill** (or wait until 4 PM) | Night sheet opens |
| 7 | Change **Fare** and **Snow & service** | Full-width tiles, no pinch to read |
| 8 | **Sleep** | Morning; snow look changes with tier |
| 9 | Reload the tab | Progress restores, including mid-night state |

**Debrief:** Why did you change fare or snow tonight? Was anything buried or too small on the phone?

**M1 adds:** player can point to the cause of tonight's "problem" line (queue, snow, value) on the mountain or in "Why?".

---

## P1 device playtest (~45–60 min) — gate for M3 (product MVP)

**Devices:** iPhone or iPad Safari (required for sign-off). Clear site data once if an old save is incompatible.

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
