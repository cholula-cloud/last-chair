# Last Chair game plan and design

**Version:** 2.0 · **Updated:** 2026-11-18
**Status:** Authority document. When any other doc disagrees with this one, this one wins.

This file answers four questions: what the game is, what the player does and why (story and modes), what we build next and in what order, and how we work. Per-PR specifications live in the handoff doc; numbers live in the spec.

| Doc | Job |
|---|---|
| **MASTER_PLAN.md** (this) | Game plan and design: vision, story, modes, build experience, roadmap, how we work |
| [Last Chair Roadmap Handoff M2 to M7.md](./Last%20Chair%20Roadmap%20Handoff%20M2%20to%20M7.md) | Per-PR specs for roadmap rows 13 to 40: design, files, tests, acceptance criteria. Read the row's section before building it |
| [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) | Numbers and formulas, marked spec vs implemented |
| [WORLD.md](./WORLD.md) | Dutch Hill, cast, founders, career mountains, story beats, lore pantry |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Look, palette, scene layout, asset pipeline |
| [TESTING.md](./TESTING.md) | Automated tests, device playtest scripts, sign-off log |
| [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) | How the inspiration works |

The World Scale 2b handoff doc is historical: 2b, 2c, 2d and camera parts 1 to 3 are merged.

---

## 1. What the game is

**Last Chair** is a cozy 3D ski-hill tycoon for the browser, designed for iPhone and iPad Safari first. You reopen **Dutch Hill**, a real ski area in Heartwellville, Vermont that ran from 1944 to 1985, and try to run one more winter before the forest takes the meadows back. Win, and the career moves north to other real lost New England hills while a consolidating megapass, **SummitLink**, tries to buy up the same coast.

**One sentence:** reopen a lost New England mountain, build it with your thumb, watch tiny skiers have their day, make two or three choices each night, and keep the hill independent.

### Core loop

```text
Day:        build on the mountain (pause any time) → guests arrive, queue, ride, ski, refuel → close at 4 PM
Night:      read a short recap → set ticket fare → set snow & service tier → answer a story beat if one fired → sleep
Overnight:  crew makes snow, grooms, learns the next talent → morning headline + weather
```

A winter is **28 days** (14 today; row 19 moves it) and ends in a **winter review**. The loop is about **diagnosis**: see a problem on the mountain (long queue, thin snow, empty café), change one thing, read tomorrow. Building is how you fix problems, and it should feel good on its own.

### Design pillars

1. **Fun first, depth optional.** The default path is satisfying in 10 minutes. Ledgers exist for players who want them.
2. **Build with your hands.** Trails are painted, lifts are dragged, the mountain answers immediately with cost, difficulty and what the change opens up. (New in v2.0, from the ICR review in §4.)
3. **See it, fix it.** Queues, snow and moods are visible on the mountain; follow any guest.
4. **Crew handles the boring stuff.** You build and set fare plus snow & service; the overnight crew runs operations and learns talents in a fixed order.
5. **Pause anytime.** Planning is half the game.
6. **Honest simulation.** Every number shown to the player comes from something that happened on the hill.

### Player success metrics

- **First 3 minutes:** a new player places a lift and paints a trail on a phone without help.
- **Session 1 (15 minutes):** one full day and one night choice.
- **Day 3:** the player changed fare or snow tier for a reason they can explain.
- **End of winter 1:** the player wants mountain 2.

---

## 2. Story Mode: the narrative and what it does to play

Story Mode is the product. It is the career from Dutch Hill onward, played in the Simple ruleset (you build and set two nightly levers; the crew runs operations).

### Premise

The Ice Coast is New England's nickname for its hard, freeze-thaw snow. Hundreds of small hills here closed between the 1970s and 2000s: bad winters, rising insurance, and megaresorts that pulled skiers north. You are the person who takes the note on one of those dead lift lines. The town wants the only lit slope in the valley back on.

Each hill you reopen is real (credited to NELSAP and, for Dutch Hill, DHASH). Saving it is tycoon fiction; the history on the heritage card is not.

### The antagonist

**SummitLink Pass** is a fictional megapass consolidating the coast, in the role Ikon and Epic play in real life. It is not evil; it is amortizing a gondola. Its regional rep, **Vivian Cho**, shows up when your hill starts to matter. Every SummitLink offer is a real trade: cash or guaranteed guests now, in exchange for losing control of fare, reputation with locals, or the hill itself.

### Arc across the career

| Act | Hills | Story question | What changes in play |
|---|---|---|---|
| I | Dutch Hill, VT | Can this hill run one winter? | One limping surface lift, no snow guns, natural snow only. Learn the loop. First SummitLink visit at the end |
| II | Tenney Mountain, NH · Maple Valley, VT | Can you win a hill SummitLink also wants? | Colder, steeper, more capital. SummitLink competes for the same guests; its offers get bigger |
| III | Mount Whittier, NH · Hogback, VT | Can an independent run big lifts and hard terrain? | Lift reliability, wind holds, glades |
| IV | Brodie, MA · Crotched West, NH | Can the independents hold together? | Night skiing, racing, split-area politics. Caretaker income from earlier hills funds the push |
| Ending | | Who owns the Ice Coast? | Branches on your choices: a co-op of independent hills, a sale to SummitLink, or going it alone (proposed) |

Full roster and per-hill hooks: [WORLD.md Part 3](./WORLD.md#part-3-career-mountains).

### How the story changes gameplay

The rule from WORLD.md holds: story exists to teach systems and anchor emotion, and when story and sim disagree, the sim wins.

| Story element | Gameplay effect |
|---|---|
| **Founder pick** (six founders) | One permanent modifier for the career: happier families, softer cash stress, a limping lift that fixes itself overnight, better weather reads, glade reputation, après buzz. Each has a cost. Numbers in SIMULATION_SPEC |
| **Goal card per winter** | The win condition for that hill (Dutch Hill: one lift running and one happy descent before the bank calls, then a winter that ends solvent). Each hill's heritage card names the thing locals miss (school bus program, night skiing, races); restoring it is that hill's goal |
| **Route 100 Radio beats** | Six beats per act, gated on sim metrics (first sellout, low cash, a school day), never on timers. They arrive at night, never mid-day. Some carry a choice with consequences: a school bus contract brings weekday guests at a lower fare; a dry week asks you to wait for cold or close trails |
| **SummitLink offers** | Mid-winter and end-of-winter offers: join the pass (guest boost, fare cap, local reputation drop), sell a hill (cash for the next one), or refuse. Choices carry into later acts |
| **Named crew** (Frank, Dana, Elena) | Their biases explain the fixed talent order, so a talent arriving reads as a person learning, not a menu |
| **Winter review** | Scores the winter, records beats and choices, opens the next hill on the career map |
| **Caretaker** | Hills you leave keep running off-screen and pay a small income that funds the next hill |

---

## 3. Modes

| | **Story Mode** (v1 product) | **Sandbox** (M6) | **Rival Mode** (M8, after v1) |
|---|---|---|---|
| Pitch | Career across real lost hills | Build a fantasy hill, try tools | Head-to-head against SummitLink for the Ice Coast |
| Ruleset | Simple: build + fare + snow & service | Simple, with optional manual ops later | Simple at each hill, plus a company layer |
| Economy | Real pressure | Normal / Comfortable / Unlimited | Real pressure, shared market |
| Story | Radio beats, SummitLink arc | Off | Rival's moves are the story |
| Win | Finish the career | None | Hold the largest share of Ice Coast skier-days after N winters (proposed) |
| Save | Local now, cloud later | Local slots | Local slot |

**Sandbox settings (M6):** mountain (blank, Dutch Hill template, imported layout later), money (Normal / Comfortable / Unlimited), weather (live random, fixed sunny, storm week), story off, talents (all, crew order, manual). New build tools are tried in Sandbox before Story balance.

### Rival Mode (working name; the owner called it "capitalist mode")

You and SummitLink start on the same map of lost hills. SummitLink is an AI company with its own deterministic sim (seeded, like everything else), so every match can be replayed and balanced in the harness.

Proposed mechanics, to be cut down in design before building:

- **Acquire hills.** Bid for closed hills on the career map; SummitLink bids too. Price depends on the hill's state and how many guests it could draw.
- **Pass pricing.** Set a season pass price and a day ticket for your network. SummitLink undercuts with a multi-hill pass; guests choose by price, distance, snow and how crowded each hill felt last visit.
- **Shared guests.** Each region has a pool of skiers. A great day at your hill pulls next weekend's skiers from SummitLink's nearest hill, and the reverse.
- **Moves and counter-moves.** SummitLink poaches a crew member, sponsors a race at its hill, or offers to buy one of yours. You answer at night, as in Story Mode.
- **Win and lose.** Highest share of skier-days after N winters wins; going broke or selling your last hill loses.

Rival Mode reuses the Story sim at each hill and adds a company layer on top. It starts only after Story Mode's MVP (Gate M3) and the career map (M5) exist.

### Out of scope for v1

ICR's 70-talent tree UI · Complex/Director ops matrix · required three-statement accounting · Hill Cup and daily challenge · daily mini-games, teams, leaderboards, seasonal skins · day-bank monetization · terrain park, race gates, moguls, inn, arena.

---

## 4. The build experience (what we take from Ice Coast Revival)

Last Chair takes its loop from **Ice Coast Revival (ICR)**, a New England ski-resort tycoon by Firn LLC (Steam, web, iPhone, iPad). We copy genre mechanics and loop feel. We never copy assets, code, audio, names, or trademarks. Full analysis: [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md).

### What ICR's current store build shows (App Store v1.6.0, reviewed 2026-11-18)

Read from the App Store screenshots and three trailer videos:

| Observation | Detail |
|---|---|
| **The mountain fills the screen** | At default zoom the whole hill, from summit to base village, fills a portrait phone, with thousands of trees. Skiers and buildings are small against it. The hill reads as a big place you are working on |
| **Trails are painted** | You draw a trail through the forest and it is cut as a clearing. Tools: Add, Wider, Narrower, undo/redo, Draw, then Review. The cut is coloured by difficulty (green, blue, black, double black, base area) as you paint |
| **Lifts are dragged and snapped** | A grid of diamond anchor points covers the buildable ground; a lift drops onto them and snaps to a ring that shows where to build next. A ghost line shows the lift before you commit |
| **Every build says what it does first** | Before you confirm: cost, acres opened, vertical gained, and the resort tier it moves you to. Then one big confirm button |
| **A coached first week** | A named mentor walks new owners through their first week and hands them a second hill on day 4 |
| **One night meeting** | All decisions arrive at a nightly Ops Meeting; the day is never interrupted |

### What we change in Last Chair

| Area | Today | Target |
|---|---|---|
| Mountain shape | Dutch Hill read as a valley: the flanks stood higher than the lift line and a trough ran under the lift ("the indent") | A convex mountain: the lift runs up a crest and the ground falls away on both sides. Row 13d |
| Scale on screen | The hill fills part of the screen; the village and road take a lot of it | The mountain fills the portrait screen at default zoom, with room for six to ten trails. Row B1 |
| Trails | Cut by tapping a top point and choosing a route | Painted with a finger through the trees; brush width; live difficulty colour from sustained pitch; cost and acres while painting; Review to confirm. Row B2 |
| Lifts | Two taps (bottom, top) with snapping | Drag the top terminal; snap to anchor points; ghost line; live cost, vertical and capacity. Row B3 |
| Build feedback | Valid or invalid | A "what this changes" card before every confirm: cost, acres, vertical, which guests can now ski it, effect on queues. Row B4 |
| Clearing | Trees are scenery | Trees are the thing you cut; cutting costs money and changes snow (shade, wind). Row B5 |

ICR's lessons from its patches and player reviews still apply: keep the day uninterrupted and route events to one nightly meeting; let guests leave a long line for the village; rate trails by sustained pitch; judge ticket price against what the hill offered; make snow tools visible; coach the first winter; label every control; expect snowboarders; keep the game from going easy once a hill is solved.

---

## 5. Platform and mobile rules

Browser-first, no app store for v1. **iPhone and iPad Safari are the primary target**; desktop Chrome is for development.

| Tier | Devices | When |
|---|---|---|
| Gate | iPhone (notch) Safari, iPad 11" Safari | Every gameplay PR |
| Stress | iPhone SE width, iPad landscape | Milestone gates |
| Secondary | Desktop Chrome/Firefox | Dev only |

**Layout:** respect `env(safe-area-inset-*)`; primary actions in the bottom third; touch targets ≥44 px, night tiles full-width ≥56 px; no hover-only affordances; every control has a visible label. iPhone day view is portrait first; landscape also works. Never force rotation.

**Screen map (Story Mode):**

```
┌─────────────────────────────────────┐  safe area top
│ [Pause]  Day 12 · Sat · 11:42  [$]  │
│  queue · snow · mood (ops strip)    │
│         3D MOUNTAIN (main)          │
│ [Build] [Guests] [Night▸when close] │  thumb zone
└─────────────────────────────────────┘
Build sheet   → Lifts · Trails · Village · Snow
Guests sheet  → list + Follow (no tiny 3D picking on phone)
Night recap   → recap + fare + snow/service tiles + Continue
Career hub    → map · level · talents · story log · Ledger (M5)
```

**Touch:** one-finger pan, pinch zoom, two-finger orbit and tilt, tap select, double-tap focus; recenter button. Build mode is an explicit toggle; inside it, one finger paints or drags and two fingers move the camera.

**Performance budgets:** 20–30 simulated guests on iPhone (40 on iPad); ≤24 drawn guest meshes on iPhone; instanced trees; 30 fps acceptable on a mid iPhone; heightfield ≤2K; GLB <500 KB each. Pause the clock and flush the save when the page is hidden. Never assume 60 Hz. Audio only after a user gesture. No component in `web/src/render/` passes a positive `useFrame` priority unless it calls `gl.render` itself (that bug blanked the scene from #39 to #48).

**Speed:** 1× default, 2× after the tutorial beat. "Skip to close" after 2 PM.

**Difficulty:** every crisis has one visible fix (queue → capacity or trail; thaw → snow tier or guns; empty café → seats). Negative cash triggers a warning and a loan offer before game over.

---

## 6. How it is built

**Stack:** Next.js 16 (App Router, static export) · React 19 · TypeScript · React Three Fiber + drei + three.js · Zustand with localStorage persist · Tailwind 4 · Vitest · Playwright scripts. Hosted on **GitHub Pages**, published by `.github/workflows/pages.yml` on every push to `main`: https://cholula-cloud.github.io/last-chair/play/. There is no server and no Vercel.

```
web/src/app/      routes: / (home), /play (game)
web/src/game/     pure TS simulation: rules, content, store, terrain heightfield, mountains/
web/src/render/   R3F scene: terrain, lifts, trails, village, trees, guests, camera
web/src/ui/       HUD and sheets: build, guests, night recap, founder pick, winter review
web/scripts/      Playwright phone-check and playtest scripts
```

- **`game/` is pure TypeScript with no React** and never imports from `render/` or `ui/`. All state is one serializable `GameState`. Rules are functions `(state, input, rng) → state` with a seeded RNG stored in state, so any day can be replayed and tested.
- **`store.ts` is a thin wrapper** that calls rule functions and persists with a schema version; migrations live in `state.ts`.
- **`render/` reads state and never writes rules.** Positions come from pure helpers over the `game/terrain.ts` heightfield.
- **Content is data:** talents, beats and mountains are tables, so new ones need no new code paths.

---

## 7. How we work

### Roles

- **Opus (main session)** owns direction: picks the next roadmap row, reads its handoff section, writes the brief, and merges.
- **A Sonnet subagent builds**: implements the brief, writes tests, runs `npm run check`.
- **A separate Sonnet subagent reviews** the diff against the brief and this plan. The builder fixes findings.
- **Art and UI design passes** are run by an Opus subagent.
- Opus merges on green CI with a merge commit (`gh pr merge <n> --merge`). Run about three PRs back to back, then stop for the owner to look at screenshots and a summary.

### Rules for every PR

1. **One goal, small.** Under about 400 changed lines of non-test code. If it grows, split it (13a, 13b, 13c is the pattern).
2. **Branch from fresh `main`**, named for the roadmap row (`claude/row14-multi-lift`). No stacked PRs; merge one before starting the next.
3. **Sim changes ship with unit tests.** Bug fixes ship with a regression test. The season characterization snapshot changes only when the PR says why, with the diff read line by line.
4. **`npm run check` is green** (lint + typecheck + test + build), and `npm run phone-check` passes for anything the player sees.
5. **Docs move with code:** mark the row's status in §8 and the SIMULATION_SPEC markers in the same PR.
6. **No new systems on top of a fake one.** If a feature depends on a stubbed number, make the number real first.
7. **File names have no underscores.**

### PR description template

```
Goal: one sentence
Changes: bullets
Out of scope: bullets
Tests: what was added / run
Phone check: device or script, result
Roadmap: row updated
```

### Numbering

A **milestone** (M0 to M8) is a group of small PRs that ends in a **gate**: a test the game has to pass before the next milestone starts. A **row** is one line in a milestone table; big rows split into lettered PRs (13a, 13b). Row numbers are not GitHub PR numbers.

---

## 8. Roadmap

Status: ☐ not started · ◐ in progress · ☑ merged. Per-row specs: the handoff doc, by row number. Rows B1 to B5 and M8 are new in v2.0 and have no handoff section yet; write one before building each.

### What each milestone means

| Milestone | Plain meaning | Gate (how we know it is done) |
|---|---|---|
| **M0** Clean foundation | The code can be tested and known bugs are gone | CI green; the sim runs headless from a test |
| **M1** Real core loop | Every number on the night recap is caused by something visible | 15-minute phone session; player explains a preset change |
| **M2** Build the mountain | Building feels good and where you build matters | Moving a lift or adding a trail measurably changes tomorrow; a new player builds a lift and paints a trail in 3 minutes |
| **M3** One full winter (MVP) | Dutch Hill from founder pick to winter review, with consequences | Three outside players finish winter 1 on a phone without help |
| **M4** Look and feel | Dedicated art and audio pass | Screenshots and device check |
| **M5** Career | Tenney Mountain, the career map, caretaker, ledger | Winter 2 on a second hill plays and is harder |
| **M6** Sandbox | Free-build mode and save slots | Sandbox hill saves and reloads |
| **M7** 110% pass | Polish the best ideas after a side-by-side with ICR | Owner sign-off |
| **M8** Rival Mode | Head-to-head against SummitLink | Rival match plays to a winner in the harness and on a phone |

### M0: Clean foundation ☑

Rows 1 to 4 (docs, tooling + CI, pure sim core, known-bug fixes), 4b (phone HUD), 4c (art pass 1), 4d (UI pass 1), 4e (art pass 2, Blender kit), 10c (UI pass 2). All merged.

### M1: Real core loop ☑

Rows 5 to 10: lift as a server, guest day script, satisfaction from causes, snow per trail segment, levers you can feel, balance harness. All merged. Gate met in browser at phone sizes; real-device and external playtests pending.

### M2: Build the mountain ◐

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 11 | ☑ | Terrain as data | One heightfield for sim and render; portrait framing |
| 12-pre | ☑ | Camera, scale, playability (parts 1 to 3, 2b to 2d) | Free camera, Dutch Hill at 6×/3×, tiered forest, arrival lot |
| 12 | ☑ | Free lift placement (12a to 12c) | Tap bottom and top on terrain; valid/invalid preview; snapping |
| 13 | ☑ | Trail graph (13a to 13c) | Trails from lift top to base; sustained pitch; guests choose by skill; snow by elevation |
| — | ☑ | Render fix (#48), trail ribbon folds (#49) | Scene blank on every browser since #39; restored |
| 13d | ☑ | Hill shape (#50) | Dutch Hill becomes a convex mountain: lift on the crest, flanks fall away, no trough under the lift |
| 13e | ☐ | Trail corridor shards | Fix the jagged dark triangles in cut trail corridors |
| B1 | ☐ | Bigger mountain | The mountain fills the portrait screen at default zoom; room for six to ten trails; forest density to match; camera limits retuned |
| B2 | ☐ | Paint trails | Finger-paint a trail through the trees; brush width; live difficulty colour; cost and acres while painting; undo; Review to confirm. Likely splits: B2a sim (trail from a painted polyline), B2b paint UI |
| B3 | ☐ | Drag lifts | Drag the top terminal with live snapping to anchor points; ghost line; live cost, vertical and capacity |
| B4 | ☐ | Build impact card | Before every confirm: cost, acres, vertical, which skill levels can ski it, expected queue change. Numbers from the sim |
| B5 | ☐ | Trees as a resource | Cutting costs per acre; clearings change snow (shade, wind) |
| 14 | ☐ | Multi-lift choice | Guests pick lift and trail by queue length and skill |
| 15 | ☐ | Lift types matter | Surface vs double chair: capacity, ride time, wind, cost |
| 16 | ☐ | Village venues | Warming hut and lodge seats; café; shop; guests leave a long line for the village |
| 17 | ☐ | Snowmaking + grooming | Placed guns; nightly groom capacity; visible plumes and corduroy |

Order: 13d, 13e, B1, B2, B3, B4, then 14 to 17, B5 last. The builder rows come first because every later row is played through them.

### M3: One full winter (product MVP)

Land row 25 first; every other M3 row adds saved fields.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 25 | ☐ | Save versioning | Schema version + migrations; old saves load or reset cleanly |
| 18 | ☐ | Weather model | Seeded forecast; storms; thaw runs; wind holds |
| 19 | ☐ | 28-day calendar | Weekends, holiday weeks; season length as config |
| 20 | ☐ | Economy + fail-soft | Fixed and lift costs; construction draws cash; loan offer; bankruptcy |
| 21 | ☐ | Crew talents with real effects | 12 → 20 talents in crew order, each with a test |
| 22 | ☐ | Founders complete | All six modifiers live |
| 23 | ☐ | Route 100 Radio + Act I beats | Radio feed; six beats on metric gates, delivered at night; story log; the first SummitLink offer as a choice |
| 24 | ☐ | Winter review | Season score, beats, choices, talents; carry-forward data |
| 26 | ☐ | Coached first winter | The founder walks a new player from first lift and first painted trail to the first night choice; skippable |
| 27 | ☐ | MVP balance + external playtest | Three outside players finish winter 1 without help |

### M4: Look and feel

| # | PR |
|---|---|
| 28 | Guest models: skiers and snowboarders, jacket colour by state |
| 29 | Lift and lodge GLB kit (most of it exists in `web/public/models/`) |
| 30 | Snow shader: coverage patches, groom stripes tied to the overnight preset |
| 31 | Day/night lighting |
| 32 | Audio: ambient bed, UI sounds, radio sting |
| 33 | Mobile juice: sheet motion, build-place feedback; reduced motion respected |

### M5: Career

| # | PR |
|---|---|
| 34 | Mountain definitions as data (terrain, start state, archetype tags, beats) |
| 35 | Career map hub (New England pins, locked hills with one-line history) |
| 36 | Tenney Mountain, NH (Act II): colder, steeper, more capital; SummitLink competes for the same guests |
| 37 | Caretaker income from departed hills |
| 38 | Ledger: income snapshot, then fuller statements |

### M6: Sandbox

| # | PR |
|---|---|
| 39 | Main menu: Story / Sandbox; mountain, money, weather, talent settings |
| 40 | Save slots |

### M7: 110% pass

Play one ICR winter and one Last Chair winter side by side, list friction, tune defaults before adding systems. Candidate list: named regulars with bios, radio serial, SummitLink arc branches and the co-op ending, tomorrow cards on the recap, scenarios (7-day ice storm), shareable season card and trail-map poster, golden-hour light and snowfall. Also: PWA install, performance budget pass, accessibility audit.

### M8: Rival Mode (after v1)

Design first, then build. Every row is proposed and gets a handoff section before work starts.

| # | PR |
|---|---|
| 41 | Rival Mode design doc: cut §3's mechanic list to a first playable version; harness strategies for the AI |
| 42 | Company layer in `game/`: cash across hills, owned hills, a regional guest pool |
| 43 | SummitLink AI: deterministic policy for pricing, bidding and counter-moves, tested in the harness |
| 44 | Hill acquisition on the career map (bids from both sides) |
| 45 | Season pass vs day ticket pricing and guest choice between networks |
| 46 | Night counter-moves and the end-of-match review |

---

## 9. Accessibility

Satisfaction shown as icon plus colour (colour-blind safe). Touch targets ≥44 px. Reduced motion disables follow-camera swings and sheet animation. Radio can be turned off; heritage reading is optional.
