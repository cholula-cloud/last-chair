# Last Chair — master plan

**Version:** 1.0 · **Updated:** 2026-11-16
**Status:** Authority document. When any other doc disagrees with this one, this one wins.

| Doc | Job |
|-----|-----|
| **MASTER_PLAN.md** (this) | What the game is, how it is built, what to build next, how we know it is done |
| [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) | Numbers and formulas, marked spec vs implemented |
| [WORLD.md](./WORLD.md) | Dutch Hill, cast, founders, career mountains, story beats, lore pantry |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Look, palette, current scene layout, asset pipeline |
| [TESTING.md](./TESTING.md) | Automated tests, device playtest scripts, sign-off log |
| [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) | How the inspiration works |

---

## 1. What the game is

**Last Chair** is a cozy 3D ski-hill tycoon that runs in the browser and is designed for iPhone and iPad Safari first. You reopen **Dutch Hill**, a real ski area in Heartwellville, Vermont that operated 1944–1985, and try to run one more winter before the forest takes the meadows back.

### Core loop

```text
Day:   watch the hill (pause any time, build) → guests arrive, queue, ride, ski, refuel → close at 4 PM
Night: read a short recap → set ticket fare → set snow & service tier → (story reply if a beat fired) → sleep
Overnight: crew makes snow, grooms, learns the next talent → morning headline + weather
```

A winter is **28 days** and ends in a **winter review**. Winning moves the career north to other real lost New England hills (Tenney Mountain NH next; full roster in [WORLD.md](./WORLD.md)).

The loop is about **diagnosis**: see a problem on the mountain (long queue, thin snow, empty café), change one lever, read tomorrow. Building bigger is the means, not the goal.

### One sentence

Reopen a lost New England mountain, watch tiny skiers have their day, make two or three choices each night, and grow a regional story without drowning in spreadsheets.

### Design pillars

1. **Fun first, depth optional.** The default path is satisfying in 10 minutes. Ledgers exist for players who want them.
2. **See it, fix it.** Queues, snow and moods are visible on the diorama; follow any guest.
3. **Crew handles the boring stuff.** You build and set fare + snow/service; the overnight crew runs ops and learns talents in a fixed order.
4. **Pause anytime.** Planning is half the game.
5. **Honest simulation.** Every number shown to the player comes from something that happened on the hill. No invented metrics.

### Modes

| | **Story Mode** (the product) | **Sandbox** (later, M6) |
|---|---|---|
| Purpose | Career, Act I beats, SummitLink arc | Build a fantasy hill, test tools |
| Economy | Real pressure | Normal / Comfortable / Unlimited |
| Talents | Crew order | All unlocked, crew order, or manual picker |
| Story | Radio beats on metric gates | Off |
| Save | Local now, cloud later | Local slots |

### Session flow (Story Mode)

**First launch:** Title (Story highlighted) → pick one of six founders → Dutch Hill loading (overgrown lifts, optional heritage card, skippable radio) → goal card: "Get one lift running and one happy descent before the bank calls."

**Typical 20–30 minute session:**

| Step | Player | Game |
|---|---|---|
| 1 | Unpause or stay paused | Day clock runs 6 AM–4 PM |
| 2 | Build / move / inspect | Tap lift, guest, building |
| 3 | Follow a guest (optional) | Guests sheet → Follow; camera tracks the guest |
| 4 | Pause to plan | No penalty |
| 5 | Let the day finish or skip to close | Skip available after 2 PM |
| 6 | Night recap | Crowd, mood, cash Δ, one problem highlight |
| 7 | Choices (max 3) | Fare · Snow & service · story reply if a beat fired |
| 8 | Sleep | Overnight sim + crew talent |
| 9 | Morning headline | Weather + radio line |

Night choices stay at **two** through Act I; Act II may add an occasional third (story branch). The crew's next talent shows as "Tomorrow the crew learns: *Rope Tow*"; no tree UI.

**Season shape (28 days):** days 1–7 learn the loop, first Saturday, first thaw · days 8–21 expand lift/village, school bus beat, talent milestones · days 22–28 peak week, SummitLink offer, winter review → next mountain or story interlude. Beats gate on sim metrics (sellout, low cash, school day), never on timers alone.

**Sandbox flow (M6):** available from the main menu immediately. Settings: mountain (blank / Dutch Hill template / imported layout later), money (Normal / Comfortable / Unlimited), weather (live random / fixed sunny / storm week), story off, talents (all / crew order / manual). No SummitLink arc, no career persistence unless saved as a sandbox slot. Sandbox is where new build tools (trail draw, lift types) get tried before Story balance.

### Player success metrics

- **Session 1 (15 min):** one full day and one night choice on a phone.
- **Day 3:** player changed fare or snow tier for a reason they can explain without a wiki.
- **End of winter 1:** player wants mountain 2 without hand-holding.

---

## 2. Inspiration: Ice Coast Revival

Last Chair takes its loop from **Ice Coast Revival (ICR)**, a browser ski-resort tycoon set in New England, specifically its **Build the Mountain (Simple)** mode: the player builds and sets fare plus a snow & service tier; a crew handles operations and learns talents in a fixed order. Full analysis: [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md).

We copy **genre mechanics and loop feel**. We never copy assets, code, audio, names, or trademarks.

### ICR today (Nov 2026)

ICR is a full release on Steam (18 Aug 2026, $9.99, Windows + macOS) by Firn LLC, with web and phone builds outside Steam. It ships patches weekly to biweekly. Since launch it has added a 70-point talent tree (the "Playbook"), an inn, parks, races, moguls, patrol, a nightly Ops Meeting, a Main Street village layout, a coached first winter, and a growing social layer: daily mini-games, leaderboards, teams, seasonal skins. Steam has only four user reviews (75% positive): players praise the finance depth and the "one more day" pull, and complain about clunky unlabeled UI, snow tools with little visible effect, ticket price as the only meaningful price, and the game turning easy once the hill is solved. Full timeline and review notes: [reference §9](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md#9-steam-release-and-patch-history-read-2026-11-16).

### What we keep from ICR

- Real-time day plus overnight resolution; 28-day winter; winter review.
- Lift placement that requires a skiable descent from the unload.
- Individually simulated guests with a follow camera.
- Snow as depth, quality, coverage; thaw; guns and grooming as outcomes.
- Two nightly levers (fare preset, snow & service preset).
- Crew talent order; six founders with different rules; multi-mountain career on real lost hills.

### What is different in Last Chair

| Area | ICR | Last Chair |
|---|---|---|
| Platform | Desktop-shaped UI that shrinks to phone | Phone-first: bottom sheets, thumb zone, recap + both levers on one sheet, ≤90 s night |
| Act I | Generic foreclosed starter hill | Dutch Hill VT, a documented ghost hill (credited to NELSAP and DHASH) |
| Crew | Anonymous priority list | Named crew (Frank, Dana, Elena) whose biases explain the talent order |
| Story | Light framing; megapass antagonist mostly in store copy | Route 100 Radio text beats gated on sim metrics; fictional **SummitLink** pass as the pressure |
| Finance | Full statements always present | One summary line, tap "Why?" for the breakdown; Ledger is optional (M5) |
| Complexity | Simple and Complex modes; player can delegate nights to the crew or run them | Story Mode is Simple only; manual ops only ever arrive as an optional Sandbox/Director setting |
| Feedback | Snow tools have little visible effect (player reviews) | Every overnight choice must change something you can see on the mountain next morning |
| Explanations | Many buttons have no description (player reviews) | Every control has a label; every recap number has a "Why?" |
| Direction | Growing social/live-service layer: dailies, arcade, teams, leaderboards, seasonal skins | Single-player story and career; no live-service layer in v1 |

### Lessons from ICR's patches and reviews

| Lesson | Source | Where it lands |
|---|---|---|
| Keep the day uninterrupted; all events arrive at one nightly meeting | ICR moved every pause into a nightly Ops Meeting (Sep 14) | Night recap already does this; PR 23 routes radio beats there too |
| Guests leave a long line for the village | Sep 22 patch | PR 16 |
| Rate trails by sustained pitch, not the steepest point | Sep 14 patch | PR 13 |
| Judge ticket price against what the hill offered that day | Sep 22 patch | PR 9 |
| Snow tools must be visible | Player review | PR 8, 17, 30 "done when" |
| New players need a coached first winter | Added Nov 2 and Nov 10 | PR 26 (MVP, not post-MVP) |
| The game gets easy once solved | Player review | PR 10 balance harness; harder hills in M5 |
| Label every control | Player review | §3 layout rules |
| Pricing only tickets feels shallow | Player review | Story keeps one fare; per-venue pricing is a Ledger option in M7 |
| Snowboarders are expected | Player review | PR 28 guest models |

### Planned improvements over ICR (110% pass, M7)

Only after one full winter is fun on a phone.

- **Narrative:** named regulars with bios after N visits; expanded radio serial ("Ledger & Cocoa"); heritage card per mountain; SummitLink arc branches; co-op ending.
- **UI:** tomorrow cards on the night recap; talent synergy view that shows dormant talents until their facility exists; one-glance ops dashboard; swipe sheets.
- **Gameplay:** scenarios (7-day ice storm); optional Director manual ops; Hill Cup / weekly snapshot; deeper finance always available; per-venue pricing in the Ledger; light staff management (wages, hiring) if playtests ask for it.
- **Sharing:** shareable season card and trail-map poster at winter's end.
- **Art:** golden-hour light, snowfall shader, queue heat shimmer, build-place juice, lodge tier visuals.

Positioning line: *every guest has a story, every dollar has a receipt (when you open the Ledger), every lost hill deserves one more winter.*

### Explicitly out of scope for v1

70-talent tree UI · Complex/Director ops matrix · required three-statement accounting · Hill Cup and daily challenge · daily mini-games, teams, leaderboards, seasonal skins · ICR-style day-bank monetization · trail-draw parity with ICR, terrain park, race gates, moguls, inn, arena.

---

## 3. Platform and mobile rules

Browser-first, no app store for v1. **iPhone + iPad Safari is the primary target**; desktop Chrome is for development.

| Tier | Devices | When |
|---|---|---|
| Gate | iPhone (notch) Safari, iPad 11" Safari | Every gameplay PR |
| Stress | iPhone SE width, iPad landscape | Milestone gates |
| Secondary | Desktop Chrome/Firefox | Dev only |

**Layout:** respect `env(safe-area-inset-*)`; primary actions in the bottom third; touch targets ≥44 px, night tiles full-width ≥56 px; no hover-only affordances; every control has a visible label or one-line description (no bare icons). iPhone day view is landscape; night recap and career sheets work in portrait. Never force rotation.

**Screen map (Story Mode):**

```
┌─────────────────────────────────────┐  safe area top
│ [Pause]  Day 12 · Sat · 11:42  [$]  │
│  queue · snow · mood (ops strip)    │
│         3D MOUNTAIN (main)          │
│ [Build] [Guests] [Night▸when close] │  thumb zone
└─────────────────────────────────────┘
Build sheet   → Lifts · Terrain · Village · Snow
Guests sheet  → list + Follow (no tiny 3D picking on phone)
Night recap   → recap + fare + snow/service tiles + Continue
Career hub    → map · level · talents · story log · Ledger (M5)
```

**Touch:** one-finger pan, pinch zoom, tap select. Build mode is an explicit toggle; two-finger gestures are disabled while placing.

**Performance budgets:** 20–30 simulated guests on iPhone (40 on iPad); ≤24 drawn guest meshes on iPhone; instanced trees; 30 fps acceptable on mid iPhone, 60 stretch; heightfield ≤2K; GLB <500 KB each. Pause the day clock and flush the save when `document.visibilityState` is hidden. Use `requestAnimationFrame`; never assume 60 Hz. Audio only after a user gesture.

**Speed:** 1× default, 2× after the tutorial beat, never force 4× on new players. "Skip to close" after 2 PM.

**Difficulty:** every crisis has one visible fix (queue → capacity or trail; thaw → snow tier or guns; empty café → seats). Negative cash triggers a warning and a loan offer before game over.

---

## 4. How it is built

### Stack

Next.js 16 (App Router) · React 19 · TypeScript · React Three Fiber + drei + three.js · Zustand with localStorage persist · Tailwind 4 · Playwright scripts · static export hosted on GitHub Pages.

```
web/src/app/      routes: / (home), /play (game)
web/src/game/     simulation rules, content tables, store, terrain heightfield (terrain.ts, mountains/)
web/src/render/   R3F diorama: terrain, lift, trail, lodge, trees, guests
web/src/ui/       HUD and bottom sheets: build, guests, night recap, founder pick, winter review
web/scripts/      Playwright smoke + playtest scripts
```

### Target architecture (reached by PR 3, kept thereafter)

- **`game/` is pure TypeScript with no React.** All state is one serializable `GameState`. Rules are functions `(state, input, rng) → state`. Randomness comes from a seeded RNG stored in state, so any day can be replayed and tested.
- **`store.ts` is a thin wrapper**: holds `GameState`, calls rule functions, persists with a schema version.
- **`render/` reads state, never writes rules.** Positions for drawing come from pure helpers (`guestPlacement.ts`, `liftLine.ts`, `trail.ts`) over the `game/terrain.ts` heightfield.
- **Content is data** (`content.ts`; later per-mountain definitions), so new talents, beats and mountains do not need new code paths.
- Main-thread tick is fine at current guest counts; a Web Worker is considered only if a profile shows the sim costing frames.

### Honest state of the code (audit, 2026-11-16)

The loop is clickable end to end and deployed, but most of the simulation is cosmetic. These are the facts M0 and M1 fix:

| Issue | Where |
|---|---|
| 8 of 12 crew talents and 3 of 6 founder modifiers do nothing | `content.ts`, `sim.ts` |
| Weather is `(day*17+3) % 10` (fixed in PR 18). Other randomness comes from an injected seeded RNG whose state lives in `GameState` | `sim.ts` |
| Season is 14 days (spec 28) | `types.ts` |

Earlier docs marked P0 and P1 gates as passed. They passed as **click-through stubs**. Gates are re-earned against the honest sim in M1 and M3.

### Deploy

GitHub Pages, published by `.github/workflows/pages.yml` on every push to `main`: https://cholula-cloud.github.io/last-chair/play/. Details in the root [README](../README.md).

---

## 5. How we work

### Rules for every PR

1. **One goal.** Aim for under ~400 changed lines. If it grows, split it.
2. **Sim changes ship with unit tests** (from PR 2 onward). Bug fixes ship with a regression test.
3. **Build → test → refactor → debug.** Each PR ends with a cleanup pass on what it touched: remove dead code, fix names, update the spec.
4. **`npm run check` is green** (lint + typecheck + test + build).
5. **Manual check on a phone viewport** (iPhone Safari or the Playwright iPhone script) for anything the player sees.
6. **Docs move with code.** Update this file's roadmap status and [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) "implemented" markers in the same PR.
7. **No new systems on top of a fake one.** If a feature depends on a stubbed number, make the number real first.

### PR description template

```
Goal: one sentence
Changes: bullets
Out of scope: bullets
Tests: what was added / run
Phone check: device or script, result
Roadmap: PR # row updated
```

---

## 6. Roadmap

Sequential. Each milestone ends with a gate; do not start the next milestone until the gate passes. Status: ☐ not started · ◐ in progress · ☑ merged.

### M0 — Clean foundation

Goal: a codebase where rules are testable and known bugs are gone.

| # | Status | PR | Accomplishes | Done when |
|---|---|---|---|---|
| 1 | ☑ | Docs consolidation + master plan | 22 docs → 6; this file | No dead links; every fact from removed docs lives somewhere |
| 2 | ☑ | Tooling + CI | Vitest; `typecheck`, `test`, `check` scripts; GitHub Actions running lint, typecheck, test, build on PRs; remove stock SVGs | CI green on a PR; one sample sim test passes |
| 3 | ☑ | Pure sim core | Move rules out of `store.ts` into `game/` over a serializable `GameState`; seeded RNG; store becomes thin | Characterization tests pass before and after; zero behavior change; store < 200 lines |
| 4 | ☑ | Known-bug fixes | Night-reload cash skip; real `completedRuns`; one queue formula; new-season arrivals; one lap-or-leave draw per skier (not per tick); dead code and the 3 render lint warnings; save key + `version` field; `playtest-p0.mjs` runs on any machine | One regression test per bug |

| 4b | ☑ | Phone HUD fixes from the M0 smoke check | Portrait ops strip no longer overlapped by Home / Close hill; one mood number (ops strip and recap show the same satisfaction); money formats as −$104; Sleep explains why it is disabled while a radio beat waits | Playwright screenshot at 390×844 shows no overlap; unit test for money format |
| 4c | ☑ | Art pass 1 (procedural diorama) | Readable cozy diorama: real hill shape, light and shadows, trail, lift towers and cable, lodge, skier figures, per-aspect camera | Screenshots at phone sizes read at a glance |
| 4d | ☑ | UI pass 1 (lodge paperwork) | Paper-card sheets, ticket-strip HUD, conditions board with SVG icons, serif type, Route 100 Radio rename, title screen | Screenshots at phone sizes; no overlaps; targets ≥44 px |
| 4e | ☑ | Art pass 2 (Blender kit) | Modelled lodge, village, lift, skiers, pines in-game; forest triangles cut; trail readability | Screenshots; triangles < 150k |
| 10c | ☑ | UI pass 2 (toy box + Route 100 signs) | Replaces lodge paperwork: Lilita One + Nunito, navy-outlined toy keys on sky, road-sign colour roles (green results, yellow radio, brown Sleep, gold cash), press-down motion; mountainous day surfaces, cozy night recap | Screenshots at 390×844 and 844×390; no overlaps; targets ≥44 px; no old tokens left |

**Gate M0:** `npm run check` green in CI; sim runs headless from a test.

### M1 — Real core loop (nothing else until this is fun)

Goal: every number on the recap is caused by something visible on the hill.

| # | Status | PR | Accomplishes | Done when |
|---|---|---|---|---|
| 5 | ☑ | Lift as a server | Capacity per hour, ride time, FIFO queue; wait measured in game minutes | Test: doubling arrivals at fixed capacity raises average wait |
| 6 | ☑ | Guest day script | Arrival curve 08:00–14:00 (smoke check: today everyone arrives at 6 AM, giving a 4.6 min opening queue); energy; laps; departure; real run count; First-Timer + Saturday Regular personas | Test: guest count, runs per guest, all depart by close |
| 7 | ☑ | Satisfaction from causes | Per-guest terms (queue, snow, value, arrival mood) → day score; recap "problem" = largest negative term | Test: each term moves the score in the right direction |
| 8 | ☑ | Snow per trail segment | Depth / quality / coverage per segment; thaw hits low elevation first; overnight presets per spec; terrain tint reads real values | Test: High beats Mid beats Minimal on quality after one night; a phone tester can see the difference next morning |
| 9 | ☑ | Levers you can feel | Fare judged against what the hill offered that day (snow, queues, venues), with elasticity by persona; "Why?" breakdown on the recap; today-vs-yesterday deltas | Player can see what fare did to arrivals and mood |
| 10 | ☑ | Balance harness + P0 re-sign | Headless season runner over N seeds × fixed strategies (always cheap, always expensive, adaptive); P0 device playtest | No single fixed strategy dominates; P0 script passes on iPhone |

**Gate M1 (P0):** 15-minute phone session; player explains why they changed a preset; numbers trace to causes. Status: met in browser at phone sizes (PR 10b fixed the M1 playtest findings); real-device and external playtests pending.

### M2 — Build the mountain

Goal: where you put things matters.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 11 | ☑ | Terrain as data | One heightfield used by sim and render; Dutch Hill silhouette; portrait camera framing so lift line and trail read on iPhone |
| 12 | ☐ | Free lift placement | Tap bottom and top on terrain; valid/invalid preview; replaces three fixed slots |
| 13 | ☐ | Trail graph | Trails from lift top to base; difficulty from **sustained** pitch (one steep rollover does not make a green black); guests choose by skill |
| 14 | ☐ | Multi-lift choice | Guests pick lift and trail by queue length and skill |
| 15 | ☐ | Lift types matter | Surface vs double chair: capacity, ride time, wind sensitivity, cost |
| 16 | ☐ | Village venues | Warming hut/lodge seats; café refuel stop; shop revenue; lodge tier 1; guests leave a long lift line for the village |
| 17 | ☐ | Snowmaking + grooming | Placed guns with reach uphill from base; nightly groom capacity; visible gun plumes and fresh corduroy where the crew worked |

**Gate M2:** moving a lift or adding a trail measurably changes queues and satisfaction next day.

### M3 — One full winter (product MVP)

Goal: Dutch Hill Act I from founder pick to winter review, with consequences.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 18 | ☐ | Weather model | Seeded forecast; storms; thaw runs; wind holds |
| 19 | ☐ | 28-day calendar | Weekends and holiday weeks; season length as config |
| 20 | ☐ | Economy + fail-soft | Fixed and lift ops costs; construction draws cash; loan offer; bankruptcy. PR 10 harness: no strategy can go broke in 14 days — with 28 days (PR 19) at least one careless strategy must risk it |
| 21 | ☐ | Crew talents with real effects | 12 → 20 talents in crew order, each with a test |
| 22 | ☐ | Founders complete | All six modifiers live per [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) |
| 23 | ☐ | Route 100 Radio + Act I beats | Radio feed UI; six beats on metric gates, delivered at night (never mid-day pauses); story log |
| 24 | ☐ | Winter review | Season score, beats, talents; carry-forward data for career |
| 25 | ☐ | Save versioning | Schema version + migrations; old saves load or reset cleanly |
| 26 | ☐ | Coached first winter | Elena (or the chosen founder) walks a new player from the first surface lift to the first night choice; skippable; no wall of text |
| 27 | ☐ | MVP balance + external playtest | Three outside players finish winter 1 on phone or tablet without outside help |

**Gate M3 (P1, product MVP):** [TESTING.md](./TESTING.md) P1 script signed by three external players.

### M4 — Look and feel

Readability is gameplay, so each M1–M3 PR adds the minimal visual it needs. M4 is the dedicated art pass.

| # | PR |
|---|---|
| 28 | Guest models: 2–4 low-poly skier silhouettes plus snowboarders, jacket color by state |
| 29 | Lift + lodge GLB kit from Blender (Draco, <500 KB each, manifest in `web/public/assets/`) |
| 30 | Snow shader: coverage patches, groom stripes tied to overnight preset |
| 31 | Day/night lighting: warm day key, cool night recap |
| 32 | Audio: ambient bed, UI sounds, radio sting |
| 33 | Mobile juice: sheet motion, satisfaction pulse; reduced-motion respected |

### M5 — Career

| # | PR |
|---|---|
| 34 | Mountain definitions as data (terrain, start state, archetype tags, beats) |
| 35 | Career map hub (New England pins, locked peaks with one-line history) |
| 36 | Tenney Mountain, NH (Act II): colder, steeper, more capital; harder than Dutch Hill so the game does not go easy once one hill is solved |
| 37 | Caretaker idle income for departed hills |
| 38 | Ledger: income snapshot, then fuller statements |

### M6 — Sandbox

| # | PR |
|---|---|
| 39 | Main menu Story / Sandbox; mountain, money, weather, talent settings |
| 40 | Save slots |

### M7 — 110% pass

Pick the top five from §2 "Planned improvements" after a side-by-side ritual: play one ICR Simple winter and one Last Chair winter, list friction, tune defaults before adding systems. Also: PWA install, performance budget pass, accessibility audit.

---

## 7. Accessibility

Satisfaction shown as icon + color (color-blind safe). Touch targets ≥44 px. Reduced motion disables follow-camera swings and sheet animation. Radio can be turned off; heritage reading is optional.
