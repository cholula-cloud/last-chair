# Last Chair game plan and design

**Version:** 2.2 · **Updated:** 2026-11-19
**Status:** Authority document. When any other doc disagrees with this one, this one wins.

This file answers four questions: what the game is, what the player does and why (story, modes and the lodge), what we build next and in what order, and how we work. Per-PR specifications live in the handoff doc; numbers live in the spec. Version 2.2 sets the Dutch Hill first-winter decisions, story choices and review.

| Doc | Job |
|---|---|
| **MASTER_PLAN.md** (this) | Game plan and design: vision, story, the lodge, modes, build experience, roadmap, how we work |
| [Last Chair Roadmap Handoff M2 to M7.md](./Last%20Chair%20Roadmap%20Handoff%20M2%20to%20M7.md) | Per-PR specs for roadmap rows 13 to 40. Read the row's section before building it. Its PR 16 section is superseded by rows 16a to 16d below; rows L1, 16a to 16d, S, A and 41 to 48 have no section yet, so write one before building each |
| [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) | Numbers and formulas, marked spec vs implemented |
| [WORLD.md](./WORLD.md) | Dutch Hill, cast, founders, career mountains, story beats, lore pantry |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Look, palette, scene layout, asset pipeline |
| [TESTING.md](./TESTING.md) | Automated tests, device playtest scripts, sign-off log |
| [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) | How the inspiration works |

The World Scale 2b handoff doc is historical: 2b, 2c, 2d and camera parts 1 to 3 are merged.

---

## Status snapshot

M2 code is complete. Its uncoached first-time-player opening still needs a sign-off. Dutch Hill now runs a 28-day winter from the founder pick to settlement. Players can remain independent, take Vivian’s cash in return for a fare cap, and host the optional Readsboro visit. Three outside players still need to finish the winter without help on Safari. Record their results in [the P1 sign-off log](./TESTING.md#external-sign-off-m3-gate).

**Built and merged**

| Area | What exists |
|---|---|
| Foundation | Pure TypeScript sim over one serializable `GameState`, seeded RNG, CI, GitHub Pages deploy, versioned M3 saves with validation and recovery |
| Core loop | Lifts as FIFO servers (surface and double chair), guest day script with arrival curve, energy and laps, two personas, satisfaction from five terms, the "Why?" breakdown and yesterday deltas, three fare presets with elasticity, snow per trail segment with thaw by elevation, overnight presets, balance harness |
| Build | Free camera, Dutch Hill at 6×/3× scale, tiered forest, car park with parked cars and walking paths, touch lift dragging and snapping, brush-painted trails, shared build review, guests choose trails by skill, convex hill (#50), trail ribbon fix (#49), render fix (#48) |
| Buildings | Fixed lodge with three tiers, placed venues, lodge attachment pads, and per-venue receipts |
| Economy | Operating costs and upkeep, staged construction, a winter loan, and bankruptcy in the winter review |
| Story | Six founders and a picker, six beats gated on sim metrics and shown as a radio card in the night recap, a basic winter review sheet |
| Title and saves | `/play` opens on a title screen (Continue, New winter, Load, Settings, Credits). Three save slots with export and import. The game saves on build actions, phase changes and when the tab hides, and at most every 10 seconds during the day (L-D) |
| Art and UI | Toy-box UI, phone HUD, Blender GLB kit (lodge, hut, café, shop, lifts, skiers, pines, snowcat, guns), `phone-check` script |

The first-winter decisions, operating tradeoffs, local surprises, Readsboro visit, Vivian’s offer and settlement shipped in [#77](https://github.com/cholula-cloud/last-chair/pull/77). [#78](https://github.com/cholula-cloud/last-chair/pull/78) records automated balance, CI and WebKit evidence. The M3 roadmap below tracks the remaining acceptance work. Career effects on later mountains belong to M5.


---

## 1. What the game is

**Last Chair** is a cozy 3D ski-hill tycoon for the browser, designed for iPhone and iPad Safari first. You reopen **Dutch Hill**, a real ski area in Heartwellville, Vermont that ran from 1944 to 1985, and try to run one more winter before the forest takes the meadows back. Win, and the career moves north to other real lost New England hills while a consolidating megapass, **Abominable Snowglomerate**, tries to buy up the same coast.

**One sentence:** reopen a lost New England mountain, build it with your thumb, grow your lodge, watch tiny skiers have their day, make two or three choices each night, and keep the hill running.

### Core loop

```text
Day:        build on the mountain (pause any time) → guests arrive, queue, ride, ski, refuel → close at 4 PM
Night:      read a short recap → set ticket fare → set snow & service tier → answer a story beat if one fired → sleep
Overnight:  crew makes snow, grooms, learns the next talent → morning headline + weather
Growth:     the recap shows what held the hill back (a long line, an empty café, a missing venue); build to fix it, or upgrade the lodge to open what you need
```

A winter is **28 days** and ends in a **winter review**. The loop is about **diagnosis**: see a problem on the mountain, change one thing, read tomorrow. Building is how you fix problems, and it should feel good on its own.

### Design pillars

1. **Fun first, depth optional.** The default path is satisfying in 10 minutes. Ledgers exist for players who want them.
2. **Build with your hands, make it yours.** Trails are painted, lifts are dragged, and the mountain answers immediately with cost, difficulty and what the change opens up. Every building comes in cosmetic styles, so your hill looks like yours.
3. **See it, fix it.** Queues, snow and moods are visible on the mountain; follow any guest.
4. **The lodge is your HQ.** It is always there, and growing it is how the game opens: new things to build and new ways to earn (§3).
5. **Crew handles the boring stuff.** You build and set fare plus snow & service; the overnight crew runs operations and learns talents in a fixed order. Hiring belongs to Capitalist Mode (§4).
6. **Pause anytime.** Planning is half the game.
7. **Honest simulation.** Show what happened on the hill with measured results. Label a forecast as a forecast and describe its expected direction only where the rules support it.
8. **Every operating choice has a tradeoff.** Show the benefit and cost where the player decides, then report the measured result once it can be observed. Choosing a cheaper fare, paying for service or taking outside money each changes how the hill can operate.
9. **Surprise comes from the hill.** A local event starts with a recorded condition or result. Give the player an operating response when one is available and show its outcome through the same rules as an ordinary day.

### Player success metrics

- **First 3 minutes:** a new player places a lift and paints a trail on a phone without help.
- **Session 1 (15 minutes):** one full day and one night choice.
- **Day 3:** the player changed fare or snow tier for a reason they can explain.
- **First upgrade:** the player upgrades the lodge because the recap told them why.
- **End of winter 1:** the player wants mountain 2.

---

## 2. Story Mode: the narrative and what it does to play

Story Mode is the product. It is the career from Dutch Hill onward, played in the Simple ruleset (you build and set two nightly levers; the crew runs operations).

### Premise

The Ice Coast is New England's nickname for its hard, freeze-thaw snow. Hundreds of small hills here closed between the 1970s and 2000s: bad winters, rising insurance, and megaresorts that pulled skiers north. You are the person who takes the note on one of those dead lift lines. The town wants the only lit slope in the valley back on.

Each hill you reopen is real (credited to NELSAP and, for Dutch Hill, DHASH). Saving it is tycoon fiction; the history on the heritage card is not.

### The antagonist

**Abominable Snowglomerate Pass** is a fictional megapass consolidating the coast, in the role Ikon and Epic play in real life. It is amortizing a gondola. Its regional rep, **Vivian Cho**, shows up when your hill starts to matter. Every Abominable Snowglomerate offer is a real trade: cash or guaranteed guests now, in exchange for losing control of fare, reputation with locals, or the hill itself.

### Arc across the career

| Act | Hills | Story question | What changes in play |
|---|---|---|---|
| I | Dutch Hill, VT | Can this hill run one winter? | Start with a Tier 1 lodge. Build the first lift and trail. Tier 2 unlocks snowmaking. Vivian can make one offer in the last third of winter |
| II | Tenney Mountain, NH · Maple Valley, VT | Can you win a hill Abominable Snowglomerate also wants? | Colder, steeper, more capital. Abominable Snowglomerate competes for the same guests; its offers get bigger |
| III | Mount Whittier, NH · Hogback, VT | Can an independent run big lifts and hard terrain? | Lift reliability, wind holds, glades |
| IV | Brodie, MA · Crotched West, NH | Can the independents hold together? | Night skiing, racing, split-area politics. Caretaker income from earlier hills funds the push |
| Ending | | Who owns the Ice Coast? | Branches on your choices: a co-op of independent hills, a sale to Abominable Snowglomerate, or going it alone (proposed) |

Full roster and per-hill hooks: [WORLD.md Part 3](./WORLD.md#part-3-career-mountains).

### How the story changes gameplay

The rule from WORLD.md holds: story exists to teach systems and anchor emotion, and when story and sim disagree, the sim wins.

| Story element | Gameplay effect |
|---|---|
| **Founder pick** (six founders) | One permanent modifier for the career: happier families, softer cash stress, a limping lift that fixes itself overnight, better weather reads, glade reputation, après buzz. Each has a cost. Numbers in SIMULATION_SPEC |
| **Goal card per winter** | Dutch Hill’s common goal is to finish the 28-day winter with nonnegative liquid net worth after debt and unpaid construction. Show days remaining and use the same formula as the winter review. The Readsboro visit is an optional local goal. Later hills set their own goals |
| **Lodge tier-ups** | Each upgrade fires a radio line and a visible ribbon on the hill. Tier 2 unlocks the ski school, which the optional Readsboro visit needs |
| **Route 100 Radio beats** | Nightly story draws on measured events. The handoff defines the three local surprises and the one-per-night queue. A line about yesterday's hill and an offer awaiting a decision each get distinct controls |
| **Readsboro school visit** | Once Tier 2 and a ski school are available, accept or decline one weekday visit for six pupils at a discounted fare. Track booked, delivered and missed lessons separately. The optional goal is credited only for lessons actually delivered |
| **Abominable Snowglomerate offer** | Vivian offers $6,000 once in Act I for a fare ceiling of Balanced for the remaining winter. Cheap stays available. Riley can decline and sees why accepting is unavailable. The review records the actual reply and effect |
| **Named crew** (Frank, Dana, Elena) | Their biases explain the fixed talent order, so a talent arriving reads as a person learning, not a menu |
| **Winter review** | Records the settlement and common goal outcome, the actual Readsboro and Vivian results when present, and the operator's choices and measured results. Records a career result for later use by the map |
| **Caretaker** | Hills you leave keep running off-screen and pay a small income that funds the next hill |

---

## 3. The lodge: your HQ

The main lodge is the one building the player never places. It is the hub of the base area, and upgrading it is the main way the game opens up.

### Fixed

- The lodge exists on day 1 in every mode and on every mountain, at the end of a short path from the car park. Guests walk lot → lodge → lift line (the paths exist today).
- It cannot be moved or demolished. It leaves the Build menu and gets its own card: tap the lodge, or open it at the top of the Build sheet.
- Each mountain definition sets its lodge position, footprint, path and starting tier (Dutch Hill: Tier 1).

### Tiers

An upgrade does not add seats or a café inside the lodge. It gates what you may build and earn from, and it changes how the lodge and base look. Numbers are placeholders for SIMULATION_SPEC, tuned in the balance harness.

| | Tier 1 Base Lodge | Tier 2 Village Lodge | Tier 3 Grand Lodge |
|---|---|---|---|
| Cost | Free, on day 1 | $3,500 | $9,000 |
| Car park (visual) | 30 stalls | 50 | 80 |
| Attach pads | 2 | 4 | 6 |
| Opens to build | Surface lift, trails, warming hut, café, shop | Double chair, snow guns, rentals, ski school desk, tubing, basic decor | Bar and après, restaurant, ice rink, events, premium decor |
| New revenue | Day tickets, café, shop | Rentals, lessons, tubing | Bar and restaurant, events |
| Look | Small A-frame, plain | Wings, bigger porch, signage | Full timber lodge, lit windows, flags |

Later lift types and Capitalist Mode features (season passes) attach to tiers the same way. Capitalist Mode may add a Tier 4 (design in row 41).

### Upgrading in play

- Upgrading costs cash and takes **two nights**. The lodge shows scaffolding, keeps operating at its old tier, and the new tier takes effect the next morning with a recap line.
- The trigger is something the player wants to build. A locked item shows greyed in the Build sheet and names the tier that opens it, and the lodge card lists what the next tier opens, so the player upgrades to reach a specific thing.
- Upgrades are the biggest capital sink, so cash pacing and the story goal pace each other (row 20).

### Attached venues

The lodge has **attach pads** around its footprint. A venue (café, shop, rentals, ski school desk, bar, restaurant, warming hut) placed on a pad is part of the lodge, drawn as a wing in the lodge's style, and earns **+5%** on its revenue and effect (one constant, `ATTACH_BONUS`). The same venue placed anywhere else valid works at its base value. Lifts, guns, activities and decor cannot attach. The build preview says "+5% attached" before you confirm.

Open question for row 16c: whether distance from the lift base changes how many guests use a free-standing venue. Default for the first build is no.

### Styles

Styles are cosmetic variants of the same asset: same footprint, same numbers, different look. They keep the hill fresh over a long career.

- Every asset, and every lodge tier, has style variants. The catalog carries a `styleId` field and the save stores the chosen style per building from row 16a, so styles slot in later without a migration.
- Each mountain has a default style from its era (Dutch Hill: 1950s timber). More styles arrive through story beats, lodge tier-ups, winter-review rewards and seasonal themes.
- Styles never change a number. If a style ever needs a mechanic, it becomes a different asset.

### The asset catalog

All buildable things (venues, activities, decor, infrastructure) are rows in one data table, so a new asset needs no new code path. A row carries: category, footprint, cost, upkeep, effect, the tier that opens it, placement zone, whether it can attach, and its style variants.

| Category | Examples | Guest reason to exist |
|---|---|---|
| Hospitality | Warming hut, café, bar, restaurant | Refuel, warm up, après |
| Services | Shop, rentals, ski school, lockers | First-Timers need rentals and lessons |
| Activities | Tubing, ice rink, sleigh rides | Families and teens come for them |
| Decor | Fire pit, string lights, signs | Arrival mood, identity |
| Infrastructure | Snow guns, groomer garage | Snow quality and coverage |

Every asset is a revenue line or a mood term in the Ledger, never filler. The Build sheet shows Lifts · Trails · Base · Fun · Decor · Snow, and the same impact card (row B4) confirms every build.

---

## 4. Modes

| | **Story Mode** (v1 product) | **Sandbox** (M6) | **Capitalist Mode** (M8, after v1) |
|---|---|---|---|
| Pitch | Career across real lost hills | Build a fantasy hill, try tools | Build a New England ski company and beat Abominable Snowglomerate |
| Ruleset | Simple: build + fare + snow & service | Simple, with optional manual ops later | Simple at each hill, plus a company layer |
| Economy | Real pressure | Normal / Comfortable / Unlimited | Real pressure, shared market, banks, stock market |
| Story | Radio beats, Abominable Snowglomerate arc | Off | The rival's moves are the story |
| Win | Finish the career | None | Selectable goals (below) |
| Save | Local now, cloud later | Local slots | Local slot |

**Sandbox settings (M6):** mountain (blank, Dutch Hill template, imported layout later), money (Normal / Comfortable / Unlimited), weather (live random, fixed sunny, storm week), story off, talents (all, crew order, manual), lodge tier (any). The lodge is present on a blank mountain too. New build tools are tried in Sandbox before Story balance.

### Capitalist Mode

Capitalist Mode is a sandboxy company game on the same New England map, in the spirit of a business tycoon, with the difference that you keep the detail of running each mountain. It starts after Story Mode's MVP (Gate M3), the career map and the Ledger (M5). Scope is New England only. Everything here is proposed and gets cut down in row 41 before building.

You start with one small hill (a Dutch Hill-style hill: Tier 1 lodge, modest cash) and freedom to grow. Abominable Snowglomerate, our Ikon and Epic stand-in, is a deterministic AI company with its own seeded sim, so every match can be replayed and balanced in the harness.

- **Hills.** Buy hills from the career map's lost hills plus fictional operating hills (no real brands). Each owned hill runs the Story sim with its own lodge, tier and styles. One hill is on screen; the others run in a coarse off-screen sim, shared with the Caretaker (row 37).
- **Hiring.** You cannot set two nightly levers on five hills. Managers do it: a general manager per hill runs the fare and snow levers to a policy you set, within a budget. Company roles add a snow boss (snow quality per dollar), ops chief (lift reliability), food and beverage manager (venue revenue) and marketing lead (arrivals and reputation). Skill and wage vary; Abominable Snowglomerate can poach them. Story Mode keeps the named crew, so pillar 5 holds in both modes.
- **Banks.** Loans priced by cash flow and collateral, where the collateral is a hill. Missing payments costs the hill.
- **Passes and tickets.** Set a season pass and a day ticket for your network (passes open at Tier 3). Guests choose between networks by price, distance, snow and how crowded each hill felt last visit.
- **Moves and counter-moves.** Abominable Snowglomerate undercuts your pass, poaches a manager, sponsors a race, or bids on a hill you want. You answer at night, as in Story Mode.
- **Stock market.** Late game: take the company public. Valuation follows earnings, the raise dilutes your control, and quarterly targets and shareholder pressure follow.
- **Goals (selectable).** Largest share of New England skier-days after N winters; take the company public and survive two more winters; own N hills. Going broke or losing your last hill ends the game.

Capitalist Mode needs rows 20 (economy), 34 and 35 (mountain data, career map), 37 (caretaker and the coarse off-screen sim), 38 (Ledger) and 40 (save slots). Game state must nest under a future `Company`; row 25 keeps hill state self-contained so that is a wrap, not a rewrite.

### Not planned before Capitalist Mode

ICR's 70-talent tree UI · Complex/Director ops matrix · required three-statement accounting · Hill Cup and daily challenge · daily mini-games, teams, leaderboards, seasonal skins sold for money · day-bank monetization · terrain park, race gates, moguls, inn (lodging), arena.

---

## 5. The build experience (what we take from Ice Coast Revival)

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
| **Lodge tiers** | The lodge steps up through four tiers that raise arrival mood, seats, revenue share and demand caps |

### What we change in Last Chair

| Area | Today | Target |
|---|---|---|
| Mountain shape | Fixed in row 13d (#50): a convex hill with the lift on the crest | Keep |
| Scale on screen | The hill fills part of the screen; the village and road take a lot of it | The mountain fills the portrait screen at default zoom, with room for six to ten trails. Row B1 |
| Trails | Cut by tapping a top point and choosing a route | Painted with a finger through the trees; brush width; live difficulty colour from sustained pitch; cost and acres while painting; Review to confirm. Row B2 |
| Lifts | Two taps (bottom, top) with snapping | Drag the top terminal; snap to anchor points; ghost line; live cost, vertical and capacity. Row B3 |
| Build feedback | Valid or invalid | An impact card before every confirm, for every asset: cost, acres, vertical, what it opens, expected effect on queues and tickets. Row B4 |
| The lodge | A buildable item ("Lodge (step 1)", $1,800) with a small satisfaction bonus | A fixed HQ whose tiers gate what you can build and earn from (§3). Rows L1, 16a to 16d |
| Village | One café, one shop, one hut at fixed spots | A catalog of venues placed anywhere, with a +5% bonus on the lodge's attach pads, and cosmetic styles. Rows 16a to 16d, S, A |
| Clearing | Trees are scenery | Trees are the thing you cut; cutting costs money and changes snow (shade, wind). Row B5 |

ICR's lessons from its patches and player reviews still apply: keep the day uninterrupted and route events to one nightly meeting; let guests leave a long line for the village; rate trails by sustained pitch; judge ticket price against what the hill offered; make snow tools visible; coach the first winter; label every control; expect snowboarders; keep the game from going easy once a hill is solved.

### Where, why and what building means

**Where: the lease.** Heartwellville leases you the old ski area. Each mountain defines a lease polygon in its data file. Every placement rule checks it and refuses with "Outside the Dutch Hill lease. Build inside the dashed line." The camera stays over the lease with a margin. In build modes the boundary shows as a thin dashed survey line and the land outside dims a little. Outside the lease the world continues at lower detail: terrain, a far forest and the ridges, so the hill sits in a real valley.

**Why: guests ask.** Every build should answer something the player can see. Long lines call for a lift, crowded beginner terrain for a green trail, a full lodge for a café. In M3 the night recap names the top unmet demand in one sentence ("Guests want"). Map pins can follow in M4.

**What it costs: land.** In M5 a mountain can offer one or two parcels beyond the lease. On Dutch Hill: the North Ridge parcel (about $15,000) opens a longer lift line, and the Meadow parcel belongs to a land trust that Abominable Snowglomerate also bids on. Parcels give late-winter cash a use and tie the land itself to the story.

**The goal is always on screen.** A strip under the date shows the remaining days and progress toward finishing solvent. Show Readsboro as an optional goal once the offer is relevant.

---

## 6. Platform and mobile rules

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
Build sheet   → Lodge card on top · Lifts · Trails · Base · Fun · Decor · Snow
Lodge card    → tier, what the next tier opens, Upgrade (also opens by tapping the lodge)
Guests sheet  → list + Follow (no tiny 3D picking on phone)
Night recap   → recap + fare + snow/service tiles + Continue
Career hub    → map · level · talents · story log · Ledger (M5)
```

**Touch:** one-finger pan, pinch zoom, two-finger orbit and tilt, tap select, double-tap focus; recenter button. Build mode is an explicit toggle; inside it, one finger paints or drags and two fingers move the camera.

**Performance budgets:** 20–30 simulated guests on iPhone (40 on iPad); ≤24 drawn guest meshes on iPhone; instanced trees; 30 fps acceptable on a mid iPhone; heightfield ≤2K; GLB <500 KB each, with styles sharing meshes and swapping palettes where they can. A cap on placed buildings per base area is set in row 16a (proposed 12 on iPhone). Pause the clock and flush the save when the page is hidden. Never assume 60 Hz. Audio only after a user gesture. No component in `web/src/render/` passes a positive `useFrame` priority unless it calls `gl.render` itself (that bug blanked the scene from #39 to #48).

**Speed:** 1× default, 2× after the tutorial beat. "Skip to close" after 2 PM.

**Difficulty:** every crisis has one visible fix (queue → capacity or trail; thaw → snow tier or guns; empty café → seats; wanted item locked → lodge tier). The closing recap offers a one-time winter loan when projected morning cash falls below zero before the final night. Three consecutive negative mornings end the winter and open the winter review.

---

## 7. How it is built

**Stack:** Next.js 16 (App Router, static export) · React 19 · TypeScript · React Three Fiber + drei + three.js · Zustand with localStorage persist · Tailwind 4 · Vitest · Playwright scripts. Hosted on **GitHub Pages**, published by `.github/workflows/pages.yml` on every push to `main`: https://cholula-cloud.github.io/last-chair/play/. There is no server and no Vercel.

```
web/src/app/      routes: / (home), /play (game)
web/src/game/     pure TS simulation: rules, content, store, terrain heightfield, mountains/, asset catalog (row 16a)
web/src/render/   R3F scene: terrain, lifts, trails, lodge and venues, trees, guests, camera
web/src/ui/       HUD and sheets: build, lodge card, guests, night recap, founder pick, winter review
web/scripts/      Playwright phone-check and playtest scripts
```

- **`game/` is pure TypeScript with no React** and never imports from `render/` or `ui/`. All state is one serializable `GameState`. Rules are functions `(state, input, rng) → state` with a seeded RNG stored in state, so any day can be replayed and tested.
- **`store.ts` is a thin wrapper** that calls rule functions and persists with a schema version; migrations live in `state.ts`.
- **`render/` reads state and never writes rules.** Positions come from pure helpers over the `game/terrain.ts` heightfield.
- **Content is data:** talents, beats, mountains and assets are tables, so new ones need no new code paths. The lodge tier is a number in state; what it opens is a column in the asset table.

---

## 8. How we work

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
5. **Docs move with code:** mark the row's status in §9, update the Status snapshot at the top, and update the SIMULATION_SPEC markers in the same PR.
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

A **milestone** (M0 to M8) is a group of small PRs that ends in a **gate**: a test the game has to pass before the next milestone starts. A **row** is one line in a milestone table; big rows split into lettered PRs (13a, 13b). Row numbers are not GitHub PR numbers. Rows with a letter prefix (B, L, S, A) belong to a named track: builder, lodge, styles, activities.

---

## 9. Roadmap

Status: ☐ not started · ◐ in progress · ☑ merged. Per-row specs: the handoff doc, by row number. Rows B1 to B5, L1, 16a to 16d, S, A and 41 to 48 have no handoff section yet; write one before building each.

### What each milestone means

| Milestone | Plain meaning | Gate (how we know it is done) |
|---|---|---|
| **M0** Clean foundation | The code can be tested and known bugs are gone | CI green; the sim runs headless from a test |
| **M1** Real core loop | Every number on the night recap is caused by something visible | 15-minute phone session; player explains a preset change |
| **M2** Build the mountain | Building feels good, the lodge is your HQ, and where and what you build matters | Moving a lift or adding a trail measurably changes tomorrow; upgrading the lodge opens a new build option and a new revenue source; a new player builds a lift and paints a trail in 3 minutes |
| **M3** One full winter (MVP) | Dutch Hill from founder pick to winter review, with consequences | Three outside players finish winter 1 on a phone without help |
| **M4** Look and feel | Dedicated art and audio pass | Screenshots and device check |
| **M4b** Activities and styles | Tubing, rink, bar, decor, events, and the style system | Tier 3 on Dutch Hill opens bar, rink and events; a style switch persists across reload |
| **M5** Career | Tenney Mountain, the career map, caretaker, ledger | Winter 2 on a second hill plays and is harder |
| **M6** Sandbox | Free-build mode and save slots | Sandbox hill saves and reloads |
| **M7** 110% pass | Polish the best ideas after a side-by-side with ICR | Owner sign-off |
| **M8** Capitalist Mode | A company across New England against Abominable Snowglomerate | A match plays to a winner in the harness and on a phone |

### M0: Clean foundation ☑

Rows 1 to 4 (docs, tooling + CI, pure sim core, known-bug fixes), 4b (phone HUD), 4c (art pass 1), 4d (UI pass 1), 4e (art pass 2, Blender kit), 10c (UI pass 2). All merged.

### M1: Real core loop ☑

Rows 5 to 10: lift as a server, guest day script, satisfaction from causes, snow per trail segment, levers you can feel, balance harness. All merged. Gate met in browser at phone sizes; real-device and external playtests pending.

### M2: Build the mountain ☑ (first-time player sign-off pending)

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 11 | ☑ | Terrain as data | One heightfield for sim and render; portrait framing |
| 12-pre | ☑ | Camera, scale, playability (parts 1 to 3, 2b to 2d) | Free camera, Dutch Hill at 6×/3×, tiered forest, arrival lot |
| 12 | ☑ | Free lift placement (12a to 12c) | Tap bottom and top on terrain; valid/invalid preview; snapping |
| 13 | ☑ | Trail graph (13a to 13c) | Trails from lift top to base; sustained pitch; guests choose by skill; snow by elevation |
| — | ☑ | Render fix (#48), trail ribbon folds (#49) | Scene blank on every browser since #39; restored |
| 13d | ☑ | Hill shape (#50) | Dutch Hill becomes a convex mountain: lift on the crest, flanks fall away, no trough under the lift |
| 13e | ☑ | Trail corridor shards | Starter and painted corridors reviewed at 390×844 after #49; documented in PR 55 |
| B1 | ☑ | Bigger mountain | The mountain fills the portrait screen at default zoom; room for six to ten trails; forest density to match; camera limits retuned |
| L1 | ☑ | Fixed lodge | The lodge exists from day 1 on every mountain, cannot be built, moved or demolished, and leaves the Build menu. `lodgeTier` in state (1), save migration (an old save that built the lodge keeps Tier 1), lodge card shell, lot-to-lodge path kept. The $1,800 option is removed |
| B2 | ☑ | Paint trails | Finger-paint a trail through the trees; brush width; live difficulty colour; cost and acres while painting; undo; Review to confirm. B2a geometry and saves, plus touch controls and review |
| B3 | ☑ | Drag lifts | Drag the top terminal with live snapping to anchor points; ghost line; live cost, vertical and capacity |
| B4 | ☑ | Build impact card | Before every confirm, for every asset: cost, acres, vertical, which skill levels can ski it, tier it needs, "+5% attached" where it applies, expected queue change. Numbers from the sim |
| 14 | ☑ | Multi-lift choice | Guests pick lift and trail by queue length and skill |
| 16a | ☑ | Asset catalog | One data table for hut, café, shop and guns (moved out of ad hoc code): category, footprint, cost, upkeep, effect, opening tier, placement zone, attachable flag, `styleId` slot. Build sheet reads it; placed-building cap per base area. Save stores `styleId` per building |
| 16b | ☑ | Lodge tiers | Tier 2 and 3 upgrade: cost, two-night build with scaffolding, car park stalls (visual), attach pad count, tier gates in the catalog (double chair and guns move to Tier 2), greyed items that name their tier, lodge card lists what the next tier opens, tier models kit-bashed from existing GLBs, radio line per tier-up. Re-baselines the characterization snapshot and the balance harness (the chair on day 4 now needs Tier 2) |
| 16c | ☑ | Free venue placement and attach | Place venues anywhere valid; attach pads on the lodge; `ATTACH_BONUS` 5%; attached venues drawn as wings; impact card shows the bonus |
| 16d | ☑ | Venues with guest reasons | Refuel stop, café and shop revenue, rentals and ski school desk (First-Timers need them), guests leave a long lift line for the village; recap shows venue takings |
| 15 | ☑ | Lift types matter | Surface vs double chair: capacity, length, ride time, cost, beginner preference and Tier 2 unlock. Wind holds are part of row 18. |
| 17 | ☑ | Snowmaking + grooming | Placed guns (Tier 2); nightly groom capacity; visible plumes and corduroy |
| B5 | ☑ | Trees as a resource | Cutting costs per acre; clearings change snow (shade, wind) |

Order: 13e, B1, L1, B2, B3, B4, 14, 16a, 16b, 16c, 16d, 15, 17, B5. The builder rows come first because every later row is played through them. L1 sits early so the bigger-mountain framing includes the lodge and path. Tier 2 unlocks the double chair and snow guns. The implemented rows and automated checks are complete. First-time player sign-off is pending.

### M3: One full winter (product MVP)

M3 starts every player with a fresh winter and its own save key. Row 25 provides validation and recovery for M3 saves. The opening and builder refinements land ahead of the season systems.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 25 | ☑ | Save recovery | Validate M3 saves and recover unreadable progress. The M3 opening clears M2 saves and backups. |
| — | ☑ | Lodge-only opening | The player's first paid lift and ski trail open Dutch Hill. |
| — | ☑ | Trail planning and signs | Resume a draft across brush strokes, move the map before finishing, use the downhill grid, and read difficulty at each built trail entrance. |
| — | ☑ | Placement and base polish | Move the camera without losing a placement. Lift carriers follow the clock at skier speed. The winter parking lot follows the ground and still expands with the lodge. |
| 18 | ☑ | Weather and attendance | Seeded forecast, storms, thaw runs, chair wind holds and busier typical days |
| — | ☑ | Buildability and glades | Contextual build grid, tighter lift clearing, tree-preserving glades and walking from remote trail ends (#65). |
| 19 | ☑ | 28-day calendar | Weekends, holiday weeks; season length as config |
| 20 | ☑ | Economy + fail-soft | Daily fixed costs, lift ops and upkeep. Construction paid 40/30/30. One $10,000 winter loan at 8% simple interest. Three consecutive negative mornings end the winter. |
| L-A | ☑ | Lift tool | One drag from the base to the top. A thin cable ghost at true scale follows the finger on a short spring, snaps to anchor dots, and shows length and cost beside the top terminal. No corridor ribbon and no grid in lift mode |
| L-B | ☑ | Trail painting you can see | A brush cursor at true width that shows on hover and touch, an opaque ribbon in the difficulty colour, a top-down tilt and edge auto-pan while painting, a compact panel, and an optional steepness grid |
| L-C | ☑ | The lease and a continuous world | A lease polygon per mountain (`lease` in the terrain def) that lifts, painted trails, base assets and snow guns all check, with "Outside the Dutch Hill lease. Build inside the dashed line." The camera target stays on the lease outline plus 3 units. Build modes show a dashed survey line and dim the land outside. The forest is fixed in world space: full-density pines and birch on the lease, a sparse far forest in one draw call beyond it, tapering across a 14-unit band. The build grid is faint dots on valid lease cells |
| L-D | ◐ | Title screen and save slots (rows 39 and 40, from M6) | Continue, New winter, Load (three slots, export and import), Settings, Credits. Autosave on phase changes and builds instead of every frame |
| L-E | ◐ | Cold open and goal card | Name the common solvency goal, show the optional Readsboro goal once relevant, and make the player's first operating decision legible. See the first-winter sequence below |
| L-F | ☐ | Day length and copy | A day takes about two minutes at 1×; speeds 1×, 2× and 4× persist overnight. Every player-facing string meets the copy style in ART_DIRECTION.md |
| 21 | ◐ | Crew talents with real effects | 12 → 20 talents in crew order, each with a test |
| 22 | ◐ | Founders complete | All six modifiers live |
| 23 | ◐ | Route 100 Radio and Act I choices | Three measured local surprises, one optional Readsboro visit, one Vivian fare-cap offer and a story log |
| 24 | ◐ | Winter review | Common goal outcome, season score, recorded choices and consequences, and carry-forward data |
| 26 | ☐ | Coached first winter | Skippable help from placing the first lift and painting the first trail through the first night choice |
| 27 | ☐ | MVP balance + external playtest | Verify the solvency goal and the optional Readsboro path. Three outside players finish winter 1 without help. |

#### Dutch Hill first-winter sequence

Increments 1–6 shipped together in GitHub PR #77. PR #78 records hosted validation. The three outside-player sessions for increment 6 are pending. The PR numbers below name the six increments in this sequence. The roadmap row numbers still identify the related milestone work.

| PR | Increment | Roadmap rows | Acceptance |
|---|---|---|---|
| 1 | Design decisions | L-E, 22, 23, 24, 26, 27 | Align the plan, handoff and review brief on the goal, choices and measured outcomes. |
| 2 | First operating decision | L-E, 26 | After the opening teaches lift and trail placement, use the first night recap to explain a fare or snow tradeoff based on what the hill measured. Compare the next day with the prior day's actual result when both are available. |
| 3 | Local surprises | 23 | Report local moments in the night recap and retain their dates and observed results for the winter review. |
| 4 | Readsboro visit | 23, L-E | Offer one optional weekday of six discounted pupils. Show the cost and the visit result, with goal credit based on lessons served. |
| 5 | Vivian's offer | 23, 22 | Grant $6,000 once on acceptance, enforce the Balanced fare ceiling for the rest of winter and expose Riley's restriction before a reply. |
| 6 | Winter memory | 24, 27 | End with the measured settlement, the same common goal for all paths and a truthful record of choices and outcomes. Check the balance and playtest the whole arc. |

### M4: Look and feel

| # | PR |
|---|---|
| 28 | Guest models: skiers and snowboarders, jacket colour by state |
| 29 | Lift and lodge GLB kit (most of it exists in `web/public/models/`); polish the three lodge tier looks |
| 30 | Snow shader: coverage patches, groom stripes tied to the overnight preset |
| 31 | Day/night lighting |
| 32 | Audio: ambient bed, UI sounds, radio sting |
| 33 | Mobile juice: sheet motion, build-place and lodge-upgrade feedback; reduced motion respected |

### M4b: Activities and styles

| # | Status | PR | Accomplishes |
|---|---|---|---|
| S1 | ☐ | Style system | Style picker on the building card, default style per mountain, saved per building |
| S2 | ☐ | Style packs | Dutch Hill 1950s timber plus one more style for the lodge tiers and venues |
| S3 | ☐ | Unlockable styles | Story beats, tier-ups and winter-review rewards open styles |
| A1 | ☐ | Tubing hill (Tier 2) | Family draw, ticket revenue |
| A2 | ☐ | Ice rink (Tier 3) | Teen and family draw, upkeep |
| A3 | ☐ | Bar and restaurant (Tier 3) | Après revenue |
| A4 | ☐ | Decor | Fire pits, string lights, signs; small arrival-mood terms |
| A5 | ☐ | Events | Winter carnival hosted at the lodge, an optional night choice that uses the rink and tubing |

### M5: Career

| # | PR |
|---|---|
| 34 | Mountain definitions as data (terrain, start state, lodge position and start tier, archetype tags, beats) |
| 35 | Career map hub (New England pins, locked hills with one-line history) |
| 36 | Tenney Mountain, NH (Act II): colder, steeper, more capital; Abominable Snowglomerate competes for the same guests |
| 37 | Caretaker income from departed hills, built on a coarse off-screen hill sim |
| 38 | Ledger: income snapshot, then fuller statements |

### M6: Sandbox

| # | PR |
|---|---|
| 39 | Sandbox entry on the title screen; mountain, money, weather, talent and lodge-tier settings (the title screen itself moved to M3 row L-D) |
| 40 | Sandbox save slots (Story slots moved to M3 row L-D) |

### M7: 110% pass

Play one ICR winter and one Last Chair winter side by side, list friction, tune defaults before adding systems. Candidate list: named regulars with bios, radio serial, Abominable Snowglomerate arc branches and the co-op ending, tomorrow cards on the recap, scenarios (7-day ice storm), shareable season card and trail-map poster, golden-hour light and snowfall. Also: PWA install, performance budget pass, accessibility audit.

### M8: Capitalist Mode (after v1)

Design first, then build. Every row is proposed and gets a handoff section before work starts.

| # | PR |
|---|---|
| 41 | Capitalist Mode design doc: cut §4's mechanic list to a first playable version; decide Tier 4; harness strategies for the AI |
| 42 | Company layer in `game/`: cash across hills, owned hills, a regional guest pool, hills nested under `Company` |
| 43 | Hiring: managers per hill and company roles, wages, policy-driven nightly levers |
| 44 | Banks: loans, collateral, default |
| 45 | Hill acquisition on the career map (bids from both sides) |
| 46 | Abominable Snowglomerate AI: deterministic policy for pricing, bidding, poaching and counter-moves, tested in the harness |
| 47 | Season pass vs day ticket pricing and guest choice between networks |
| 48 | Stock market and IPO; end-of-match review |

---

## 10. Accessibility

Satisfaction shown as icon plus colour (colour-blind safe). Touch targets ≥44 px. Reduced motion disables follow-camera swings and sheet animation. Radio can be turned off; heritage reading is optional. Styles never carry information that a default style hides.
