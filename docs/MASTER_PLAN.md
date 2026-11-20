# Last Chair game plan and design

**Version:** 2.8 · **Updated:** 2026-11-20
**Status:** Authority document. When any other doc disagrees with this one, this one wins.

This file answers four questions: what the game is, what the player does and why (story, modes and the lodge), what we build next and in what order, and how we work. Per-PR specifications live in the handoff doc; numbers live in the spec. v2.1 replaced the v2.0 plans for the lodge, village venues and Rival Mode. v2.2 sets the Dutch Hill first-winter decisions, story choices and review, fixes status contradictions with the code, and adds §11 (quality bar and gaps) and §12 (map overlays and the Office); the owner accepted the new rows into M3 on 2026-11-19. v2.3 splits **M4** (code-only polish: feel, build UX, product pass) from **M4b** (Blender-only: GLBs, styles, activity meshes). v2.4 adds **T1** (realistic trail signage in Blender) and **O5** (Trails map layer in M4) so lift tops are not covered in canvas billboard boxes. v2.5 reframes the **Office** as the hill’s economic command center in M4: **Money** and time-series **Stats** lead; row **F3** ships chart-heavy tabs (and **P4** sweeps that UX); gate language treats the Office like a ski-area CFO dashboard, not a log viewer. v2.6 adds row C1 (voice and copy) to M4 after the owner rejected the terse copy rules. v2.7 records the first M4 batch (C1a, C1b, B6, B7 merged as #91, #92, #93, #95), splits F3 into F3a and F3b, and adds the punch-list items found in that batch to P4. v2.8 records the mobile HUD and placement chrome redesign ([#102](https://github.com/cholula-cloud/last-chair/pull/102)), marks row 31 merged ([#103](https://github.com/cholula-cloud/last-chair/pull/103)), and refreshes §6 for hide/show HUD, the compact conditions strip, the map tool rail, and placement minimize mode.

| Doc | Job |
|---|---|
| **MASTER_PLAN.md** (this) | Game plan and design: vision, story, the lodge, modes, build experience, roadmap, how we work |
| [Last Chair Roadmap Handoff M2 to M7.md](./Last%20Chair%20Roadmap%20Handoff%20M2%20to%20M7.md) | Per-PR specs for roadmap rows 13 to 40 and the M7 pass. Read the row's section before building it. Its PR 16 section is superseded by rows 16a to 16d below. Unbuilt rows with no handoff section yet: O5, T1, S1 to S3, A1 to A5, 41 to 48. Blender rows 28 and 29 are in the handoff Part C; write briefs for O5 and T1 before building them. Rows **P4** and **F3** have stub briefs in Part C. Write one before building each |
| [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) | Numbers and formulas, marked spec vs implemented |
| [WORLD.md](./WORLD.md) | Dutch Hill, cast, founders, career mountains, story beats, lore pantry |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Look, palette, scene layout, asset pipeline |
| [TESTING.md](./TESTING.md) | Automated tests, device playtest scripts, sign-off log |
| [reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md](./reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) | How the inspiration works |

The World Scale 2b handoff doc is historical: 2b, 2c, 2d and camera parts 1 to 3 are merged.

---

## Status snapshot

M2 code is complete. Its uncoached first-time-player opening still needs a sign-off. Dutch Hill now runs a 28-day winter from the founder pick to settlement. Players can remain independent, take Vivian’s cash in return for a fare cap, and host the optional Readsboro visit. The owner will playtest on device when ready. The [P1 protocol](./TESTING.md) is available for that session.

**Built and merged**

| Area | What exists |
|---|---|
| Foundation | Pure TypeScript sim over one serializable `GameState`, seeded RNG, CI, GitHub Pages deploy, M3 save schema v8 with validation and recovery |
| Core loop | Lifts as FIFO servers (surface and double chair), guest day script with arrival curve, energy and laps, four personas, satisfaction from five terms, the "Why?" breakdown and yesterday deltas, three fare presets with elasticity, snow per trail segment with thaw by elevation, overnight presets, balance harness |
| Build | Free camera, Dutch Hill at 6×/3× scale, tiered forest, car park with parked cars and walking paths, touch lift dragging and snapping, brush-painted trails, shared build review, guests choose trails by skill, convex hill (#50), trail ribbon fix (#49), render fix (#48), lift tool with cable ghost (L-A), visible brush and ribbon (L-B), lease boundary with a fixed far forest (L-C), build grid and lift placement guide (B6: faint legal-top dots in lift mode, one shared dot style with faint blocked cells in venue and gun mode), trail paint context and freer endpoints (B7: confirmed trails stay on screen while a draft is painted; a stroke connects to the village only within max(0.4 of the base area, brush half-width + 0.5 unit) of the base and joins another trail only within max(H/20, that trail's half-width + 0.15 unit); otherwise the line stays where it was drawn, the review card says how far guests walk back, and guests walk home from its end) |
| Season | Seeded forecast, storms and thaw runs, chair wind holds, 28-day calendar with weekends and holiday weeks |
| Buildings | Fixed lodge with three tiers, placed venues, lodge attachment pads, and per-venue receipts |
| Economy | Operating costs and upkeep, staged construction, a winter loan, and bankruptcy in the winter review |
| Story | Six founders, a dated story log, optional school and company offers, and a winter review with measured results and a record that survives replay |
| Title and saves | `/play` opens on a title screen (Continue, New winter, Load, Settings, Credits). Three save slots with export and import. The game saves on build actions, phase changes and when the tab hides, and at most every 10 seconds during the day (L-D) |
| Voice | Row C1a installs the wry Vermont local voice guide (ART_DIRECTION Voice) and rewrites HUD, build, map layer, coach, title and setup copy. Row C1b applies it to the Office, night recap, radio, story log, winter review, guests, crew talents and the company and school cards |
| Art and UI | Toy-box UI, phone HUD with hide/show chrome and compact conditions (PR #102), Blender GLB kit (lodge, hut, café, shop, lifts, skiers, pines, snowcat, guns), snow shader and day/night lighting (rows 30–31), `phone-check` and WebKit portrait CI |

The first-winter decisions, operating tradeoffs, local surprises, Readsboro visit, Vivian’s offer and settlement shipped in [#77](https://github.com/cholula-cloud/last-chair/pull/77). [#78](https://github.com/cholula-cloud/last-chair/pull/78) records automated balance, CI and WebKit evidence. PR #80 adds the Office and map layers, new guest types, the twenty crew talents, founder effects, replay exports and the winter score. Career effects on later mountains belong to M5.


The M3 roadmap below includes the November 19 expansion. Device sessions are deferred at the owner’s request.

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
3. **See it, fix it.** Queues, snow and moods are visible on the mountain; follow any guest. Map overlays show slope, snow and conditions so the cause of a problem is on screen (§12).
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
| **Founder pick** (six founders) | One permanent modifier for the career: happier families, cheaper borrowing, lower lift operating costs, better forecasts, extra reputation, higher venue receipts. Each has a cost. Numbers in SIMULATION_SPEC |
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

Decided in row 16c: a free-standing venue has its base effect regardless of its distance from the lift.

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

Capitalist Mode needs rows 20 (economy), 34 and 35 (mountain data, career map), 37 (caretaker and the coarse off-screen sim), 38 (Ledger) and the save slots from L-D. Game state must nest under a future `Company`; row 25 keeps hill state self-contained so that is a wrap, not a rewrite.

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

The Was column is the state before M2. Every row below except Village styles and activities (rows S and A) is built.

| Area | Was | Now or target |
|---|---|---|
| Mountain shape | Fixed in row 13d (#50): a convex hill with the lift on the crest | Keep |
| Scale on screen | The hill fills part of the screen; the village and road take a lot of it | The mountain fills the portrait screen at default zoom, with room for six to ten trails. Row B1 |
| Trails | Cut by tapping a top point and choosing a route | Painted with a finger through the trees; brush width; live difficulty colour from sustained pitch; cost and acres while painting; Review to confirm. Row B2 |
| Lifts | Two taps (bottom, top) with snapping | Drag the top terminal; snap to anchor points; ghost line; live cost, vertical and capacity. Row B3 |
| Build feedback | Valid or invalid | An impact card before every confirm, for every asset: cost, acres, vertical, what it opens, expected effect on queues and tickets. Row B4 |
| The lodge | A buildable item ("Lodge (step 1)", $1,800) with a small satisfaction bonus | A fixed HQ whose tiers gate what you can build and earn from (§3). Rows L1, 16a to 16d |
| Village styles and activities | One café, one shop, one hut at fixed spots | A catalog of venues placed anywhere, with a +5% bonus on the lodge's attach pads (built, rows 16a to 16d). Cosmetic style variants and activity meshes are Blender work in M4b (rows S, A) |
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

**Screen map (Story Mode, day play after PR #102):**

```
┌─────────────────────────────────────┐  safe area top
│ [▶]  Day 12 · Sat · 11:42  [$]      │  iPad: Layers·Grid·◎·Hide (top-right cluster)
│  queue · snow · mood (compact strip; │  iPhone portrait: same tools on a vertical
│   tap chevron for status words)     │  rail at the right edge above the map
│          3D MOUNTAIN (main)         │
│ [Menu][Build][Guests][Office][Close]│  thumb zone; Hide HUD → lone Show HUD pill
└─────────────────────────────────────┘
Build sheet   → Lodge card on top · Lifts · Trails · Base · Fun · Decor · Snow
Placement     → Trail/lift/site bar; **Minimize** to a slim Tools pill + Cancel/Review;
                two-finger pan/zoom always moves the map (no Move map mode button)
Lodge card    → tier, what the next tier opens, Upgrade (also opens by tapping the lodge)
Guests sheet  → list + Follow (no tiny 3D picking on phone)
Night recap   → recap + fare + snow/service tiles + Continue
Layers strip  → Slope · Snow depth · Snow-making · Conditions (§12)
Office        → full-screen, pauses the day: Desk · Money · Stats · Reports · Crew. Money and Stats are the CFO view (ledger plus charts from `dayHistory`); Atlas joins in M5 (§12).
```

**Touch:** one-finger pan on the overview; pinch zoom; two-finger orbit and tilt; tap select; double-tap focus; recenter on the map tool rail. Build mode is an explicit toggle. Inside it, one finger paints or drags lift endpoints and two fingers **always** move the camera (trail painting edge-pans near screen edges). The placement panel can **minimize** so only summary stats and Cancel/Review stay on screen.

**Performance budgets:** 20–30 simulated guests on iPhone (40 on iPad); ≤24 drawn guest meshes on iPhone; instanced trees; 30 fps acceptable on a mid iPhone; heightfield ≤2K; GLB <500 KB each, with styles sharing meshes and swapping palettes where they can. A cap on placed buildings per base area is set in row 16a (proposed 12 on iPhone). Pause the clock and flush the save when the page is hidden. Never assume 60 Hz. Audio only after a user gesture. No component in `web/src/render/` passes a positive `useFrame` priority unless it calls `gl.render` itself (that bug blanked the scene from #39 to #48).

**Speed.** A standard day runs for two minutes at 1×. Players can choose 2× or 4× once the opening tips finish or are skipped. Speed carries overnight.

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

A **milestone** (M0 to M8) is a group of small PRs that ends in a **gate**: a test the game has to pass before the next milestone starts. A **row** is one line in a milestone table; big rows split into lettered PRs (13a, 13b). Row numbers are not GitHub PR numbers. Rows with a letter prefix (B, C, L, S, A, T, P, Q) belong to a named track: builder, copy (voice), lodge, styles, activities, **trail signage (Blender)**, personas, quality. **Milestone M4b** is reserved for Blender output only (rows 28, 29, T1, S1 to S3, A1 to A5); gameplay hooks for activities ship in the same PR as their GLB when a row needs sim or catalog changes. Row **T1** replaces procedural lift-top billboards with kit signage meshes.

---

## 9. Roadmap

Status: ☐ not started · ◐ in progress · ☑ merged. Per-row specs: the handoff doc, by row number. Unbuilt rows with no handoff section yet (O5, T1, S1 to S3, A1 to A5, 41 to 48) need one before building. Stub briefs exist for **P4** and **F3** in Part C. **M4b is Blender-only** (`tools/blender/`, export to `web/public/models/`); do not mix Blender asset work into M4 rows.

### What each milestone means

| Milestone | Plain meaning | Gate (how we know it is done) |
|---|---|---|
| **M0** Clean foundation | The code can be tested and known bugs are gone | CI green; the sim runs headless from a test |
| **M1** Real core loop | Every number on the night recap is caused by something visible | 15-minute phone session; player explains a preset change |
| **M2** Build the mountain | Building feels good, the lodge is your HQ, and where and what you build matters | Moving a lift or adding a trail measurably changes tomorrow; upgrading the lodge opens a new build option and a new revenue source; a new player builds a lift and paints a trail in 3 minutes |
| **M3** One full winter (MVP) | Dutch Hill from founder pick to winter review, with consequences | Automated winter playthrough, save/reload and balance checks pass |
| **M4** Polish and feel (code) | Build UX fixes, shaders, lighting, audio, juice, overlays, Office economics (Money ledger polish plus F3 chart tabs), and a cross-cutting design/engineering/UI pass. **No Blender.** | Owner can place a lift with a readable guide; characters sound like people (C1); trail paint shows other trails and does not over-snap to base; muted vs unmuted and day vs night read clearly; the Office reads like a ski-area CFO dashboard (Money plus Stats/Reports charts from real `dayHistory`, not a text log); phone check green |
| **M4b** Blender assets | Guest silhouettes, lodge/lift kit, **trail signage**, style variants, activity/decoration GLBs plus catalog rows | Every M4b asset is built in Blender, in manifest v2, and wired through the asset table; trail entrances use realistic signs (not stacked billboards at the lift); Tier 3 activity placeholders render on the hill |
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

The 28-day Dutch Hill winter shipped in [PR #80](https://github.com/cholula-cloud/last-chair/pull/80). [PR #88](https://github.com/cholula-cloud/last-chair/pull/88) aligns Office and HUD goals, checks quiet-mode announcements and brings the software-rendered mountain above 30 FPS at all four test sizes. The [handoff](./Last%20Chair%20Roadmap%20Handoff%20M2%20to%20M7.md#m3-follow-up-after-pr-80) records the release checks.

M3 starts every player with a fresh winter and its own save key. Row 25 provides validation and recovery for M3 saves. The opening and builder refinements lead into the season systems. Rows O1 to O3 (overlays) and F1, F2, F4 (the Office) come from §12, and quality rows Q1 to Q9 from §11; the owner accepted all of them into M3 on 2026-11-19. The owner deferred external and device playtests until they are ready.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 25 | ☑ | Save recovery | Validate M3 saves and recover unreadable progress. The M3 opening clears M2 saves and backups. |
| — | ☑ | Lodge-only opening | The player's first paid lift and ski trail open Dutch Hill. |
| — | ☑ | Trail planning and signs | Resume a draft across brush strokes, move the map before finishing, use the downhill grid, and read difficulty at each built trail entrance. |
| — | ☑ | Placement and base polish | Two-finger pan moves the map during every placement (no Move map mode toggle). Lift carriers follow the clock at skier speed. The winter parking lot follows the ground and still expands with the lodge. PR #102 adds placement **Minimize** and the HUD layout in §6. |
| 18 | ☑ | Weather and attendance | Seeded forecast, storms, thaw runs, chair wind holds and busier typical days |
| — | ☑ | Buildability and glades | Contextual build grid, tighter lift clearing, tree-preserving glades and walking from remote trail ends (#65). |
| 19 | ☑ | 28-day calendar | Weekends, holiday weeks; season length as config |
| 20 | ☑ | Economy + fail-soft | Daily fixed costs, lift ops and upkeep. Construction paid 40/30/30. One $10,000 winter loan at 8% simple interest. Three consecutive negative mornings end the winter. |
| L-A | ☑ | Lift tool | One drag from the base to the top. A thin cable ghost at true scale follows the finger on a short spring, snaps to anchor dots, and shows length and cost beside the top terminal. No corridor ribbon and no grid in lift mode |
| L-B | ☑ | Trail painting you can see | A brush cursor at true width that shows on hover and touch, an opaque ribbon in the difficulty colour, a top-down tilt and edge auto-pan while painting, a compact panel, and an optional steepness grid |
| L-C | ☑ | The lease and a continuous world | A lease polygon per mountain (`lease` in the terrain def) that lifts, painted trails, base assets and snow guns all check, with "Outside the Dutch Hill lease. Build inside the dashed line." The camera target stays on the lease outline plus 3 units. Build modes show a dashed survey line and dim the land outside. The forest is fixed in world space: full-density pines and birch on the lease, a sparse far forest in one draw call beyond it, tapering across a 14-unit band. The build grid is faint dots on valid lease cells |
| L-D | ☑ | Title screen and save slots (Story half of rows 39 and 40, from M6; PR #71) | Continue, New winter, Load (three slots, export and import), Settings (voice volume, captions, reduced motion, default speed), Credits. Autosave on build actions and phase changes, on tab hide, and at most every 10 seconds during the day |
| L-E | ☑ | Cold open and goal card | Four still cards with a Maris Shaw voice-over and captions. Name the common solvency goal, show the optional Readsboro goal once relevant, and make the player's first operating decision legible (see the first-winter sequence below). A "Guests want" line in the night recap |
| L-F | ☑ | Day length and copy | A day takes about two minutes at 1×; speeds 1×, 2× and 4× persist overnight. Every player-facing string meets the copy style in ART_DIRECTION.md |
| 21 | ☑ | Crew talents with real effects | 20 talents in crew order, each with a test |
| 22 | ☑ | Founders complete | All six modifiers live |
| 23 | ☑ | Route 100 Radio and Act I choices | Three measured local surprises, one optional Readsboro visit, one Vivian fare-cap offer and a story log. The Office Desk carries the radio feed and tier-up lines. Reports keeps the story log |
| 24 | ☑ | Winter review | Common goal outcome, season score, recorded choices and consequences, lodge tier, talents; carry-forward data |
| P1 | ☑ | Family Pack and Race Kid personas | Two more guest types with the weights already in SIMULATION_SPEC (queue, snow, value), their venue and trail needs, and mixes by weekday, weekend and holiday. The Readsboro school visit and the rink (A2) depend on them. Re-baselines the characterization snapshot and the balance harness. Replaces the "row 9" tag in the spec |
| O1 | ☑ | Overlay framework and slope layer | A Layers button on the mountain view, a layer strip, a legend that pairs every colour with a pattern, a tap or hold readout card, buildings and guests dimmed while a layer is on, reduced motion respected. The slope layer covers the whole lease in the same bands that colour a painted trail, with contour lines; it absorbs the steepness grid from L-B (§12) |
| O2 | ☑ | Snow depth and snow-making layers | Depth shaded from bare to deep with the 0.15 break-up line drawn; gun reach, the pipe network and the segments tonight's Mid and High presets would add depth to. Ground the sim does not model shows a neutral tint (§12) |
| O3 | ☑ | Conditions layer | A named condition for every trail segment drawn as texture and motion on the snow, a tap-to-why sentence, a Now, Close, Tomorrow scrub that repaints the hill for the chosen overnight preset, a wear map, and persona suitability chips. Trail signs show the condition glyph (§12) |
| F1 | ☑ | Office shell and Desk | An Office button in the bottom bar that pauses the day and opens a full-screen sheet with a tab strip. Desk shows the headline, goal detail, tomorrow's forecast, a needs-attention list and the radio card. The winter review and the recap archive move in. No new sim state (§12) |
| F2 | ☑ | Money tab and day history | A compact `dayHistory` record per day in state (schema bump, old saves start empty). Ledger: income by source, costs, construction installments, loan and projected morning cash. Economy: fare against turnout, reputation, hill value against fare. This is the first version of the Ledger in row 38. **F3** may add chart-only fields to each `DayReport` (e.g. closing loan balance, reputation) with another schema bump; numbers still come from the nightly settlement path in `sleep()`, not invented in the UI |
| F4 | ☑ | Crew tab | Lodge tier and what the next tier opens, the goal checklist, talents learned and next, the founder's modifier, the winter score. Rows 21 to 24 build the data; this is where the player sees it |
| 26 | ☑ | Coached first winter | Contextual tips cover the first lift, trail, build controls and night recap. The first problem guide links to a relevant map layer and Office tab. Dismissals are saved with the winter. |
| 27 | ☑ | MVP balance and winter playthrough | Verify the solvency goal and the optional Readsboro path. Verify the winter review and replay. Owner device testing is optional. |

#### Dutch Hill first-winter sequence

Increments 1–6 shipped together in GitHub PR #77. PR #78 records hosted validation. The owner can run the optional device session for increment 6 at any time. The PR numbers below name the six increments in this sequence. The roadmap row numbers still identify the related milestone work.

| PR | Increment | Roadmap rows | Acceptance |
|---|---|---|---|
| 1 | Design decisions | L-E, 22, 23, 24, 26, 27 | Align the plan, handoff and review brief on the goal, choices and measured outcomes. |
| 2 | First operating decision | L-E, 26 | After the opening teaches lift and trail placement, use the first night recap to explain a fare or snow tradeoff based on what the hill measured. Compare the next day with the prior day's actual result when both are available. |
| 3 | Local surprises | 23 | Report local moments in the night recap and retain their dates and observed results for the winter review. |
| 4 | Readsboro visit | 23, L-E | Offer one optional weekday of six discounted pupils. Show the cost and the visit result, with goal credit based on lessons served. |
| 5 | Vivian's offer | 23, 22 | Grant $6,000 once on acceptance, enforce the Balanced fare ceiling for the rest of winter and expose Riley's restriction before a reply. |
| 6 | Winter memory | 24, 27 | End with the measured settlement, the same common goal for all paths and a truthful record of choices and outcomes. Check the balance and playtest the whole arc. |

### M4: Polish and feel (code only)

M4 follows the M3 gate. It does **not** use Blender. Owner pain from playtesting: the build grid vanishes in lift mode and the dot field feels wrong elsewhere; trail paint hides existing trails and snaps runs to the base too aggressively. Ship **B6** and **B7** before the feel rows so building stays trustworthy. **Office economics** land in **F3** (Stats and Reports charts on top of F2’s `dayHistory`); **O4** later paints revenue and crowds on the map. The M4 gate treats the Office as the hill’s CFO dashboard, not a recap log, and treats the day HUD as a viewport for the mountain (map visible while building; thumb zone not buried under chips).

| # | Status | PR | Accomplishes |
|---|---|---|---|
| C1a | ☑ | Voice and copy, part 1 | Voice guide in ART_DIRECTION (wry Vermont local, instructions first, one joke per screen) and a rewrite of HUD, build and placement, map layers, coach, title and setup strings, plus build and placement error messages. Copy only. |
| C1b | ☑ | Voice and copy, part 2 | Same voice applied to the Office, night recap, radio, story log, winter review and the Abominable Snowglomerate and school cards. Radio and cast lines keep their character voices. Maris, Vivian, Dana, Elena, Frank and Riley each speak in the cast-table voice; middle dots and em dashes are gone from player-facing copy. Copy only. |
| B6 | ☑ | Build grid and lift placement guide | A single readable guide during lift placement: anchor ring, snap feedback, and a grid that matches asset/gun placement (cell size, contrast, lease alignment). Lift mode must show useful guidance (L-A intentionally hid the dot grid; replace it with something that does not fight the cable ghost). Overview and venue modes keep a consistent dot field. |
| B7 | ☑ | Trail paint context and freer endpoints | While painting, **all confirmed trails** stay visible (full or high-opacity ribbons; draft on top). Reduce automatic connector logic that pulls the end to `terrain.base` or reuses another trail's suffix when the player did not intend it (`paintedTrail.ts` `atBase`, prefix/suffix merge). Player-authored endpoints win unless the sim requires a lift top or a valid ski path to base. |
| P4 | ☑ | M4 polish pass | Cross-cutting pass on **game design** (flows, coach gaps, copy), **engineering** (layering violations, perf hotspots, test gaps), and **UI** (thumb zone, sheet density, HUD clarity). **Priority:** Office economic UX — Money scanability, Stats chart legibility at 375 px, Reports archive vs season calendar hierarchy, chart table fallback under reduced motion. Outcome: a short punch list closed inside M4 or ticketed explicitly. Owner playtest notes drive priority. **Closed in P4:** scaled remote trail-end threshold, guests walking along trail polylines, unified mood words via `moodLabels`. **Still open:** B6 lift-top guide ~7 ms per settled bottom on desktop; occasional WebKit install flakes in CI (rerun). **HUD clutter** addressed in PR #102 (separate row below). |
| — | ☑ | Mobile HUD and placement chrome ([#102](https://github.com/cholula-cloud/last-chair/pull/102)) | **Hide/Show HUD** clears bottom chrome and map tools, leaving a Show pill. **Conditions** default to a one-line summary with tone dots; tap expands status chips. **Map tool rail:** Layers, Grid, Recenter, Hide on the right edge (portrait) or top cluster (iPad). **Placement:** Minimize collapses trail/lift/site tools to a slim bar with compact Cancel and Review; direct two-finger map pan (removed Move map button). Session state in `web/src/ui/hudUi.ts`. `phone-check` expects updated lift placement copy. |
| 30 | ☑ | Snow shader | GPU coverage patches and groom stripes tied to overnight preset and wear (`snowMaterial.ts`, `snowTexture.ts`) |
| 31 | ☑ | Day/night lighting | Moving sun rig and night recap readability ([#103](https://github.com/cholula-cloud/last-chair/pull/103)) |
| 32 | ☐ | Audio | Ambient bed, UI sounds and radio sting on top of the Q3 synth floor. Owner decision (2026-11-19): recorded effects come from ElevenLabs on the free monthly credits only (estimate first, one take each); the Web Audio synth stays the fallback (handoff PR 32) |
| 33 | ☐ | Mobile juice | Sheet motion, build-place and lodge-upgrade feedback; reduced motion respected (handoff PR 33) |
| O4 | ☐ | Crowd and revenue layers, demand pins | Guest density and queue length, venue takings, and "Guests want" pins on the map (§12) |
| O5 | ☐ | Trails map layer | Named trail centerlines with difficulty colour on the hill; labels readable on phone; lift-top **trail map** readout (UI card or single board) instead of one billboard per run. Pairs with T1: detailed names live on the layer when signs stay compact |
| F3a | ☑ | Stats tab: money charts | Add **Stats** to `OFFICE_TABS`. Pure series selectors over `dayHistory` (`game/officeSeries.ts`). SVG charts with table fallback: revenue vs operating costs, revenue breakdown (tickets, venues, school bus), morning cash trend, construction cash timeline, loan drawdown and repayment. |
| F3b | ☑ | Stats ops charts and Reports | Fare elasticity, arrivals, satisfaction and its five terms, wait, snow service spend, satisfaction vs revenue scatter (`officeOpsCharts.tsx`). Reports gains the 28-day **season calendar** (weather and result; tap opens that day's recap) and a ski-area snow-report style trail report (`officeReports.tsx`). Gate: opening Stats after day 7 feels like a CFO dashboard, not a log list (§12). |

Suggested order: **C1a, C1b**, **B6, B7**, **HUD (#102)**, **F3a** (with the F2 chart-field check), **F3b**, early **P4** sweep on Office economics, **30 to 33**, then **O4**. Rows 31 to 33 finish what Q3 (§11) started so outside players judge a game that sounds and looks alive.

### M4b: Blender assets

Everything in M4b is authored in **`tools/blender/`**, exported Draco to **`web/public/models/`**, and registered in **manifest v2**. Style swaps are palette/mesh variants of catalog assets, not shader tricks. Activity rows (A1 to A5) add catalog entries, placement rules, and render hooks in the **same PR** as their GLB. Batch 1 GLBs (rows 29, T1, S2, A1 to A4; ◐) are in `web/public/models/` per `docs/M4b Asset Spec Batch 1.md`; game wiring is still open.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| 28 | ☐ | Guest models (Blender) | Five skier and snowboarder silhouettes; jacket/helmet tint in render (handoff PR 28) |
| 29 | ◐ | Lift and lodge GLB kit (Blender) | Tier 2/3 lodges, surface terminals, manifest v2 from Blender scripts; most GLBs already in `web/public/models/` (handoff PR 29) |
| T1 | ◐ | Trail signage kit (Blender) | Replace `TrailSign.tsx` canvas **billboards and box posts** (one per trail clustered at the lift top) with Blender props: wooden post, US-style trail sign board, optional **one** lift-unload trail-map kiosk. One sign per **trail entrance** along the corridor, not stacked at the anchor. Name and difficulty on the mesh (decal slots or one shared dynamic texture per sign). Condition glyph stays tied to the Conditions layer logic |
| S1 | ☐ | Style system (Blender) | Style picker on the building card; default style per mountain; saved `styleId` per building; each style is a Blender variant |
| S2 | ◐ | Style packs (Blender) | Dutch Hill 1950s timber plus one alternate style for lodge tiers and venues |
| S3 | ☐ | Unlockable styles (Blender) | Story beats, tier-ups and winter-review rewards ship new Blender style variants |
| A1 | ◐ | Tubing hill (Blender + catalog) | Tier 2; family draw, ticket revenue |
| A2 | ◐ | Ice rink (Blender + catalog) | Tier 3; teen and family draw, upkeep |
| A3 | ◐ | Bar and restaurant (Blender + catalog) | Tier 3; après revenue |
| A4 | ◐ | Decor (Blender + catalog) | Fire pits, string lights, base-area signs (not trail entrance signage; see T1); small arrival-mood terms |
| A5 | ☐ | Events (Blender + catalog) | Winter carnival night choice using rink and tubing assets |

### M5: Career

| # | Status | PR |
|---|---|---|
| 34 | ☐ | Mountain definitions as data (terrain, start state, lodge position and start tier, archetype tags, beats) |
| 35 | ☐ | Atlas tab, also called F5: the career map (New England pins, locked hills with one-line history, heritage cards) and the live trail map of your own hill |
| 36 | ☐ | Tenney Mountain, NH (Act II): colder, steeper, more capital; Abominable Snowglomerate competes for the same guests |
| 37 | ☐ | Caretaker income from departed hills, built on a coarse off-screen hill sim |
| 38 | ☐ | Ledger, fuller statements: income statement, balance and caretaker lines on top of the F2 Money tab |

### M6: Sandbox

| # | Status | PR |
|---|---|---|
| 39 | ☐ | Sandbox entry on the title screen; mountain, money, weather, talent and lodge-tier settings (the title screen itself shipped in M3 row L-D) |
| 40 | ☐ | Sandbox save slots (Story slots shipped in M3 row L-D) |

### M7: 110% pass

Play one ICR winter and one Last Chair winter side by side, list friction, tune defaults before adding systems. Candidate list: named regulars with bios, radio serial, Abominable Snowglomerate arc branches and the co-op ending, tomorrow cards on the recap, scenarios (7-day ice storm), shareable season card and trail-map poster (from the Atlas trail map), a scrapbook of auto-snapped moments, a guest book of named regulars, golden-hour light and snowfall. Also: performance budget pass, accessibility audit.

### M8: Capitalist Mode (after v1)

Design first, then build. Every row is proposed and gets a handoff section before work starts.

| # | Status | PR |
|---|---|---|
| 41 | ☐ | Capitalist Mode design doc: cut §4's mechanic list to a first playable version; decide Tier 4; harness strategies for the AI |
| 42 | ☐ | Company layer in `game/`: cash across hills, owned hills, a regional guest pool, hills nested under `Company` |
| 43 | ☐ | Hiring: managers per hill and company roles, wages, policy-driven nightly levers |
| 44 | ☐ | Banks: loans, collateral, default |
| 45 | ☐ | Hill acquisition on the career map (bids from both sides) |
| 46 | ☐ | Abominable Snowglomerate AI: deterministic policy for pricing, bidding, poaching and counter-moves, tested in the harness |
| 47 | ☐ | Season pass vs day ticket pricing and guest choice between networks |
| 48 | ☐ | Stock market and IPO; end-of-match review |

---

## 10. Accessibility

Settings persist on the device across winter slots. Master volume scales music, effects and voice independently. Sound mutes every channel while preserving the saved levels. Voice and captions have independent switches. The cold open keeps its captions visible whenever the narration cannot play. Radio and coach tips can also be turned off.

Large text changes the root text size from 16 to 19 CSS pixels. Low graphics limits rendering to one device pixel per CSS pixel and disables shadows. Players can select a default speed of 1×, 2× or 4×. Reduced motion follows the device preference or the in-game switch, removes sheet animation and keeps the viewing angle steady when following guests.

Controls need an accessible name and a touch target at least 44 by 44 CSS pixels. Sheets expose a dialog name for VoiceOver. Satisfaction and goal states use words or symbols alongside colour. Map layers use patterns and labels, with a Pattern aids switch for extra contrast. Check normal text against a 4.5:1 contrast threshold in the day and night palettes. The M3 audit runs the palette tests and the small-phone Settings, captions, keyboard and dialog checks in [TESTING.md](./TESTING.md).

---

## 11. Quality bar and gaps (accepted 2026-11-19)

Audit of this plan and the repo on 2026-11-19. Each finding below was checked against the code or the docs.

### Findings before the M3 implementation

These November 19 observations explain why Q1–Q10 were added. The roadmap below and the testing log track what shipped.

1. **Effort is inverted.** §4 spends about 15 lines on Capitalist Mode and M8 has eight rows, all after v1. The feel layer (snow shader, lighting, audio, juice in M4; guest and building GLBs in M4b) sits after the MVP gate. Q3 shipped a thin audio and juice floor before M3; M4 row 32 still adds licensed beds. Outside players at the M3 gate may judge a game that is quieter than the final target.
2. **The biggest unknown is still open.** The M2 gate asks whether a new player builds a lift and paints a trail in three minutes. No person has run it. Every phone check uses Playwright Chromium at phone sizes; no iPhone or iPad Safari run is recorded. Touch painting, edge auto-pan (Safari's left-edge swipe goes back), pinch zoom, the collapsing address bar and WebGL memory limits show up only there.
3. **The coach comes last.** Row 26 follows the story and crew rows, so until it lands a new player meets the whole game cold.
4. **The hill may look empty.** A day has 12 to 48 guests, at most 24 meshes are drawn on iPhone, and the mountain fills the screen (B1). Pillar 3 promises tiny skiers having their day. This has not been checked on a device.
5. **Days 8 to 28 have no designed shape.** The winter has six beats, one Abominable Snowglomerate offer and weather. "Keep the game from going easy once a hill is solved" is a lesson in §5 with no row behind it.
6. **Budgets have no gate.** §6 lists frame, mesh and file budgets and no test measures frame time, load time or bundle size. The performance pass sits in M7. The blank scene from #39 to #48 lasted nine PRs; the phone-check canvas sample now catches that class and does not catch slowness.
7. **Settings and accessibility are thin.** Settings holds voice volume, captions, reduced motion and default speed. It has no sound or music volume, text size, graphics quality or colour-blind aid. The accessibility audit is in M7.
8. **PWA install shipped in row Q2 (PR #81).** Add to Home Screen removes Safari's toolbar and its edge gestures, which matters for a game played by painting and dragging. The manifest, icons and meta tags are in `web/`; the real-device install check sits in Q1.
9. **Playtest feedback.** Office notes can include a replay of the session. The owner can use it for future device testing.
10. **Build forgiveness is unspecified.** Undo covers the last lift and painted trails. The plan has no rule for demolishing, moving or selling a lift, trail or venue, or for refunds, and founder row 22 mentions a "demolition lock" with nothing yet to lock.
11. **Rights are unchecked.** The cold open uses a generated voice from free ElevenLabs credits; check the free plan's terms on commercial use and attribution before a public launch. Dutch Hill heritage text is credited to NELSAP and DHASH; permission to use their material is not recorded.

### The bar

| Quality | What it takes here |
|---|---|
| Usable | A person who has not seen the game finishes the first three minutes on a real iPhone. Every action is one tap from the thumb zone. Every build and every purchase can be undone or explained. No screen has a dead end |
| Fun | Something visible happens every game day: a guest reaction, a number moving, a story card. A change shows its result within one day. Each night holds one real choice with a trade-off. The winter has a shape: pressure rises, a decision lands mid-season, a second goal opens once the first is met |
| Polished | The game sounds and lights like a place. Loading, empty and error states exist. Nothing breaks at 375 px wide. Frame time and load time are measured on every milestone |
| Elegant | Each job has one home: Build builds, Layers explain, Office reads, Night decides. Copy follows one style. Every number answers "Why?" |

### Quality rows

| # | When | PR | Done when |
|---|---|---|---|
| Q1 | Optional owner follow-up | Optional device check: run the phone-check list by hand on an iPhone and an iPad in Safari, and close the M2 sign-off with three observed people who have not seen the game | Findings fixed or ticketed; sign-off logged in TESTING.md |
| Q2 | M3 | ☑ PWA shell (PR #81): manifest, icons, standalone display, theme colour, iOS meta tags, safe-area check | Installs from Safari, opens full screen, gestures do not trigger Safari navigation |
| Q3 | ☑ M3, before row 27 | Feel floor: an ambient bed, UI taps, a build thunk and the radio sting; a day tint; confirm and tier-up juice. A thin version of rows 31 to 33 that those rows later finish | A muted run and an unmuted run feel different; sound starts after the first gesture; reduced motion and mute respected |
| Q4 | ☑ M3 | Ambient life: cheap instanced skiers on trails scaled from the day's guest count, riders on chairs, the snowcat on grooming nights, lodge lights at dusk. Decoration only; no number is drawn from it | The hill looks busy at 24 drawn guests; the sim and the "Why?" numbers are unchanged |
| Q5 | M3 ☑ | Playtest log: export a replay (seed plus action list) and a "Send notes" button that attaches it | A recorded session replays to the point where the player got stuck |
| Q6 | ☑ M3, inside the row 23 and 27 specs | Winter arc: design days 8 to 28 as a pressure curve (storm week, holiday surge, the Abominable Snowglomerate offer, the loan decision) with a second goal once the first is met | The 40-seed harness shows no strategy that has solved the hill by day 14 |
| Q7 | ☑ M3 measurement | Performance gate: Playwright measures load time, bundle size and frame time at phone size; an optional ten-minute device soak | Budgets and pass or fail written in TESTING.md |
| Q8 | M3 ☑ | Settings and accessibility spec: master, music, effects and voice volume, captions, reduced motion, text size, speed, graphics quality, pattern aids; VoiceOver labels on sheets; a contrast check; the audit runs at the M3 gate, not in M7 | Spec merged into §10; audit logged |
| Q9 | M3 ☑ | Venue move, sale, purchase undo, protected structures, lift and trail closure confirmations | Rules in SIMULATION_SPEC and regression coverage in buildForgiveness.test.ts |
| Q10 | Before any public share | Rights check: the voice-over terms, the real names, the credits | A written decision in WORLD.md |

The automated winter playthrough and simulation checks are the M3 release gate. The phone benchmark records a 30 FPS target and the software renderer passed at all four sizes. The owner will test on hardware when ready.

---

## 12. Overlays and the Office (accepted 2026-11-19)

### Map overlays

A **Layers** button on the mountain view opens a layer strip, like the layer switcher in a transit or maps app. One layer shows at a time. A layer recolours the terrain and trails, dims buildings and guests, and keeps a legend on screen. Tapping or holding the map opens a readout card for that point or trail segment. Every colour pairs with a pattern (§10).

**Data rule (pillar 7).** A layer paints only what the sim computes. Slope comes from the heightfield, so it covers the whole lease. Depth, quality and coverage are simulated per trail segment (six per trail) and gun reach per gun, so those layers paint trails and gun reach. Ground the sim does not model shows a neutral tint labelled "not simulated". A coarse snow field for whole-mountain depth is an option if the neutral ground reads badly in play.

| Layer | What it shows | Readout example |
|---|---|---|
| **Slope** | The whole lease in the bands that colour a painted trail (green, blue, black, double black), plus contour lines every set number of feet. Shows automatically while painting a trail | "28% pitch, black" |
| **Snow depth** | Trails shaded from bare to deep, with the 0.15 line drawn as a dashed contour where cover breaks up | "Depth 0.31, holds up 3 more days at this wear" |
| **Snow-making** | Last night's gun reach, the pipe network from the base and between guns, and the segments that tonight's Mid and High presets would add depth to. Segments out of reach are hatched | "Gun 2 reaches 3 of 6 segments; High adds +0.20" |
| **Conditions** | A named state for every segment, drawn as texture and motion on the snow (below) | "Icy: 140 runs, no groom last night, thaw from 11:00" |

**Conditions, the creative layer.** Each segment gets one named state from depth, quality, coverage, weather and wear, all of which the sim holds:

| State | Look | Rule of thumb |
|---|---|---|
| Fresh corduroy | Parallel groom lines, soft sparkle | Quality high, groomed overnight |
| Packed powder | Clean white, no marks | Quality good, light wear |
| Worn | Scuffed dots and scrape marks | Quality falling from runs |
| Slush | Blue-green sheen, slow drips | Thaw on low segments |
| Ice | Cross-hatch with a glint that sweeps across | Quality low |
| Thin | Brown patches showing through | Coverage under 0.3 |
| Bare | Brown with a cross-out, marked "closed" | Coverage near zero |
| Wind hold | A lift glyph with a wind streak | Chairs stopped on gusty days |

Extras on the same layer:
- **Scrub.** Now, Close of day and Tomorrow morning. Tomorrow uses the overnight preview and the forecast odds, so flipping Minimal, Mid and High repaints the hill before the player commits.
- **Wear map.** Which segments yesterday's runs scraped, so the player sees where guests wore the snow out.
- **Tap to why.** One sentence of cause from the sim for any segment.
- **Who can ski it.** Persona chips on a segment (First-Timer, Regular, Family Pack and Race Kid) that combine its difficulty and its condition.
- **In-world trail signs (row T1, M4b).** Realistic post-and-board props at trail entrances (Blender kit), not floating canvas rectangles at the lift top. Today’s implementation (`TrailSign.tsx`) stacks one billboard per open trail near the unload; T1 removes that clutter. Compact signs show difficulty shape; full name and condition detail are available on the **Trails** layer (O5) and on tap readouts.
- **Static fallback.** With reduced motion the textures stay and the movement stops.

| Layer | Row | What it shows |
|---|---|---|
| **Trails** | O5 | Every open trail’s centerline with difficulty colour and name labels; optional lift-top summary card listing runs served by that lift. Used for planning and for players who want a trail map on screen without crowding the 3D scene |

Later layers (row O4): Crowds (guest density and queue length), Revenue (venue takings from the per-venue receipts), and "Guests want" pins from the night recap.

### The Office

An **Office** button joins the bottom bar: Build, Guests, Office, Night. The Office is the player’s **economic command center**: where cash, turnout, costs and trends are read and compared, not where the day is decided. It opens full screen and pauses the day (pillar 6); closing it resumes a day that was running. **Money** and **Stats** are first-class; **Desk** frames today’s problems; **Reports** archives narrative and seasonal context. Fare and snow choices stay at Night, and a loan keeps its card, so the Office never becomes a second place to decide. Settings and save slots get a shortcut here. **M4 gate:** a player who opens the Office mid-winter should feel like a ski-area CFO glancing at dashboards, not scrolling a recap log.

| Tab | Holds | Row |
|---|---|---|
| **Desk** | Today's headline, the goal in detail, tomorrow's forecast, a needs-attention list, the live Route 100 Radio card | F1 |
| **Money** | First-class **ledger**: cash, payables, projected morning cash, operating breakdown (tickets, venues, costs), loan status, fare vs turnout and hill value (sparkline or mini trend optional in F3). Economy what-ifs stay here, not at Night | F2, 38 |
| **Stats** | Chart-heavy **operations and economics**: time series from `dayHistory` for revenue, costs, margin, arrivals, satisfaction (and five terms when present), wait, snow spend, venue/trail revenue stacks; fare-elasticity and satisfaction-vs-revenue views when data exists; construction and loan/cash projections. Every chart supports **yesterday** and **season best** comparison | F3 |
| **Reports** | Narrative and reference: recap archive (complement to Stats, not a substitute for charts), story log, season calendar (28 days with weather and result; tap a day for its report), trail report in the style of a real ski-area snow report, winter review links | F1, F3 |
| **Crew** | Lodge tier and what the next tier opens, goal checklist, talents learned and next, the founder's modifier, winter score | F4 |
| **Atlas** | The career map with heritage cards for lost hills, and the **trail map**: a hand-drawn-style ski-area map of your own hill, generated live from your trails and lifts with names, difficulty colours, lodge and venues | 35 |

Delight pieces, in the order to build them: the trail map (the classic piece of ski-area art, and the base for the M7 shareable poster), the season calendar, and a scrapbook of auto-snapped moments (first sellout, a tier-up, the big storm; each stores a camera pose and a state and renders on demand). A guest book of named regulars waits for M7.

**Data (pillar 7).** The save keeps only yesterday's snapshot, so Stats, the calendar, Reports and the scrapbook need history. Row F2 adds a compact `dayHistory` record per day to state (about 28 small records a winter, schema bump, old saves start empty). F3 charts and the Money ledger read **only** `dayHistory`, `seasonDays`, live state, and existing selectors (`morningCash`, `dailyCosts`, `expectedArrivals`, recap facts). No placeholder or demo numbers. If a chart needs a field F2 did not persist, extend `DayReport` at sleep time in the same PR as F3.

**Phone layout.** The tab strip scrolls horizontally with 44 px targets and keeps the active tab centred. Each tab is one scrolling column. **Stats** leads with one chart per screen width; charts use simple **SVG** (labelled axes, pattern-friendly colours per §10) with a **table fallback** when reduced motion is on or a series is empty (first week: honest empty state, not fake data). Money uses tabular figures and gold for cash (ART_DIRECTION).
