# Ice Coast Revival — design analysis (reference for **Last Chair**)

> **Purpose:** Capture how ICR works so **Story Mode** can match **Build the Mountain (Simple) loop feel** (not a literal feature clone). **Plan and gates:** [MASTER_PLAN.md](../MASTER_PLAN.md).  
> **Sources:** Official manual/talents (v1.4.3 core / web 1.4.6), marketing pages, Steam listing, builder notes.  
> **Our product:** *Last Chair* — working title aligned with `cholula-cloud/last-chair` (“Slopes Tycoon”).

---

## 1. Elevator pitch (what we are cloning)

ICR is a **single-player browser ski-resort tycoon** set in **New England**. You buy/reopen a **foreclosed independent mountain**, then over a **28-day winter season** (with real-time day simulation):

- Place **lifts** and **terrain** (runs, glades, park, race, Nordic).
- Run **snowmaking, grooming, and lift operations** overnight.
- Grow a **base village** (lodge tier, F&B, rentals, school, après).
- Manage **fares, operating budgets, debt, and full financial statements**.
- Serve **individually simulated guests** whose mood drives satisfaction, reputation, and career XP.
- Progress a **multi-mountain career** based on **real lost ski areas**, with **70 talents**, **7 talent sets**, and **6 founders**.

Platform: Web-first (also native stores). **3D miniature-mountain presentation** with deep management on pause or live.

---

## 2. Core player loop (one mountain day)

```mermaid
flowchart LR
  A[Morning open] --> B[Guests arrive]
  B --> C[Ride lifts]
  C --> D[Ski terrain / lessons / races / park]
  D --> E[Village: food, shop, après]
  E --> F[Depart / energy out]
  F --> G[Closing recap]
  G --> H[Choose fare + ops budget]
  H --> I[Overnight: snow, groom, lift wear, crew talents]
  I --> A
```

**Design insight:** The loop is not “build bigger forever in one session.” It is **diagnose bottlenecks → change one lever → read tomorrow’s recap**. Named trails are optional; connectivity and snow coverage matter more than signage.

### 2.1 Simple vs Complex

| Mode | Build | Daily ops | Talents |
|------|--------|-----------|---------|
| **Build the Mountain (Simple)** | Player | Player sets fare + **Snow & service** tier; crew runs细节 | Fixed **crew order** (70-step priority list) |
| **Build and Run (Complex)** | Player | Player sets operations + finance views | Player picks tree; **reset credits** at career milestones |

Both share **one career**, buildings, level, and paid venue conversions.

### 2.2 Season & meta

- **28 in-game days** per winter; **winter review** closes books (no separate off-season construction phase).
- **Career** spans multiple mountains; **caretakers** simulate hills you left behind.
- **Talents** (70 points, 3 trees × 3 branches) persist; **effects require facilities** on the current hill.
- **7 themed sets** (6 talents each): e.g. Family Hill, Race Academy, Storm Mountain — bonus from next morning when complete.
- **Quick Play / Sandbox**, **Daily Challenge** (web) / rotating micro-games (newer iOS), **Hill Cup** weekly snapshot voting.
- **Day bank** (free players): capped playtime refilled at local midnight (monetization / Region / Pro uncap).

---

## 3. Simulation pillars (what makes it “deep”)

### 3.1 Guest model

Each guest has a **day script**: Arrive → Ride → Ski → Refuel → Return (loopable).

**Satisfaction** aggregates: arrival mood, ticket value, crowding, queues, snow quality/depth, falls, lessons, venues, activities. **Reputation** is longer-horizon. **Village Character** (variety, decoration, grades, lodge tier) affects arrival mood separately.

**Follow-a-guest** is the primary debug tool in Simple; Complex adds **Guests / Report** breakdowns.

### 3.2 Terrain & lifts

- Lifts need **reachable load + continuous skiable descent** from unload.
- **Draw runs**: trace downhill, difficulty from geometry (mislabeling greens on steep pitch punishes you).
- **Glades** = retained trees; different risk/skill from cleared runs.
- Lift types: surface → chair/quad → gondola → specialized (telemix, funicular); **weather** closes or throttles types (wind holds; talents like Wind Watch).

### 3.3 Snow system

Three axes: **depth** (keeps routes open), **quality** (corduroy, fresh, ice), **coverage**.

- Natural snow + settling + **thaw** (especially low elevations).
- **Guns**: reach from base uphill; intensity vs coverage tradeoff.
- **Grooming capacity** per night — marking everything priority does not grow the fleet.
- Talents: Trail Guns, Night Shift, Half and Half, Across the Mountain (ultimate), etc.

### 3.4 Village & economy

- **Lodge tiers**: Warming Hut → Base → Mountain → Grand ($125k / $225k / $400k steps) — arrival mood, seats, revenue %, demand caps.
- Venues: café, restaurant, chalet, shop, school, rink, bar, lounge, inn, arena, trampoline barn, etc.
- **Concept menus** (Burger Shack, Farm to Table, …) + **grades** (Standard → Well-kept → Beloved) for eligible venues.
- Inspector shows **direct contribution** (revenue − venue staff); shared hill costs separate.
- **Operating net ≠ cash flow** — construction drains cash on profitable days.

### 3.5 Weather & career geography

- **Thaw**, **storms**, **wind holds** reshape daily plans.
- Career moves toward **higher, colder** hills; warming climate makes low southern hills less reliable (narrative + mechanic).

### 3.6 Narrative frame (underused but strong hooks)

- **Lost New England areas** (historical).
- **Six founders** with different constraints (e.g. Alex Francis: repairs lifts overnight, no loans; Preservationist: clearing is costly).
- **Apex Summit Collective** megapass antagonist (buyouts, poaching) — Steam copy emphasizes this more than early web marketing.
- Builder intent: **business literacy** — income statement, balance sheet, cash flow, valuation.

---

## 4. Progression: talent trees (condensed)

**70 talents**, 1 point each, shared pool. Three trees:

1. **Mountain** — Lifts, Snow, Patrol (+ ultimates: Summit-to-Summit gondola, Across the Mountain guns, Rescue Helicopter).
2. **Village** — Food, Nights, Shops (+ Worth the Drive, Headliners, House Brand).
3. **People** — Race, Park, Backcountry (+ Home of a Champion, The Open, Down the Wall).

**Crew order (Simple)** starts: Two to a Bar → Rope Tow → House Band → … (full list on talents page). Crew **buys talents even if facilities missing** — effects wait until built.

**Resets (Complex):** credits at levels 10–60 (step 10) + first Simple→Complex switch; buildings and career level retained.

---

## 5. What players love (and where friction is)

From manual emphasis + community tone (Reddit thread timed out; Steam reviews pattern):

| Strength | Opportunity for Last Chair |
|----------|----------------------------|
| Cozy **3D diorama** + serious spreadsheets | Push **visual storytelling** without hiding the books |
| “One queue, one guest” teaching | **Guided scenarios** + optional AI ops advisor |
| Real **lost areas** fantasy | Expand with **documented oral histories** (ethical original fiction) |
| Talents as long-term identity | **Synergy UI** — show dormant talents until facility exists |
| Financial depth | **Tutorialized CFO mode** for students / hospitality programs |
| Pause-anytime planning | **Time controls** (0.5×–4×) with mobile-friendly touch targets |

**Friction to fix in our UI:**

- Simple vs Complex feature split across versions (iOS vs web).
- Dense inspector tabs on phone; fare/ops buried in recap.
- Talent prerequisites + facility gates are easy to misunderstand.

---

## 6. ICR full surface (reference over time)

**Not** Last Chair v1 acceptance — that is the roadmap in [MASTER_PLAN.md](../MASTER_PLAN.md#6-roadmap). Use this list as a **long-horizon mechanics bibliography** when extending toward ICR depth:

- [ ] Real-time day + overnight resolution
- [ ] Lift build preview (terminals, line, quote)
- [ ] Trail draw + difficulty + sign posting
- [ ] Snow depth/quality/coverage overlays
- [ ] Grooming + snowmaking queues
- [ ] Weather + lift constraints
- [ ] Individual guest AI + follow camera
- [ ] Village venues + lodge upgrades + menu concepts
- [ ] Ticket fare + operating budget (Simple crew / Complex manual)
- [ ] P&L, balance sheet, cash flow screens
- [ ] 28-day season + winter review
- [ ] Career map + second mountain + caretaker earnings
- [ ] 70 talents + sets + resets
- [ ] 6 founders + difficulty modifiers
- [ ] Cloud save + cross-device (account)
- [ ] Hill Cup / daily challenge (phase 2 OK)
- [ ] Desktop + mobile WebGL

---

## 7. Legal / ethics note

We **do not** copy assets, code, audio, or trademarked names. We **do** replicate **genre mechanics** (tycoon + ski ops) and **public game-design documentation**, with original art, mountains, story, and UI.

---

## 8. Technical inference (ICR, not confirmed open source)

- Browser + native: likely **WebGL 3D** (Steam: DirectX 11 class GPU; ~1 GB storage).
- Individually simulated skiers imply **entity component** or agent loop on terrain nav mesh / heightfield.
- Heavy UI + pause suggests **simulation thread** or fixed tick with UI on React/Vue/similar for web.

**Last Chair stack:** see [MASTER_PLAN.md §4](../MASTER_PLAN.md#4-how-it-is-built).

---

## 9. Steam release and patch history (read 2026-11-16)

**Sources:** Steam store page for app 4999040, the four Steam user reviews, and all ten Steam announcements (Sep 6 – Nov 10, 2026) via the Steam news API. Summaries are ours.

### 9.1 Store facts

| Item | Value |
|---|---|
| Developer / publisher | Firn LLC |
| Steam release | 18 Aug 2026, full release (not Early Access) |
| Price | $9.99 |
| Platforms | Windows; macOS (Intel + Apple silicon) since Sep 23. Web and phone builds exist outside Steam; the Sep 6 notes mention phone battery/heat |
| Tags | Management, Skiing, City Builder, Economy, Cozy, Lore-Rich, Relaxing, Story Rich, Stylized, Family Friendly |
| Requirements | Win 10 64-bit, dual-core 2 GHz, 4 GB RAM, DX11 GPU (integrated OK), 1 GB disk |
| AI disclosure | Some shipped text and audio AI-generated and human-reviewed |
| Reviews | 4 total, 3 positive (75%); too few for a Steam score |

Store copy adds features not covered above: trails are drawn, **named and rated**; terrain parks, race courses, Nordic, night skiing; skating rink; staff hiring; a **demand analyst**; company **valuation**; Daily Challenge and weekly cups; founder stories; original soundtrack. The rival conglomerate is **Apex Summit Collective** (staff poaching, rumors, buyout offers).

### 9.2 Patch timeline (what changed)

| Date | Changes |
|---|---|
| Sep 6 | 70 career levels granting talent points; **delegation** (hand nightly decisions to crew or run them yourself); skiers path around buildings and leave on time; cooler on phones |
| Sep 14 | Inn with nightly room rate in the books; paths between buildings; **trail rating by sustained pitch, not steepest point**; trail board showing terrain-mix value; 57 achievements; **Ops Meeting: every event that used to pause the day now arrives at one nightly meeting**; reworked career start; rewritten Apex letters |
| Sep 22 | Guests choose destinations, re-climb for laps, **go to the village when a lift line is long**; lifts can close at night; Park and Race are per-run switches with a gate tool; Daily Challenge plays day by day and names the costliest dial; **ticket price judged at day's end against hill value**; idle fee removed; departed hills keep earning a share; shareable trail-map poster |
| Sep 23 | macOS release |
| ~Sep 29 (1.1.0) | Patrol snowmobile + rescue helicopter; moguls on ungroomed blacks + mogul contest; GS / Super G formats; big air; expert drop-in feature; Bandstand building with band days; college ski teams; hills no longer gated by stars or hill count; **Playbook**: 70-point tree, 3 groups (Mountain, Village, People), 9 branches, 7 sets |
| Oct 16 | Halloween seasonal look (toggleable) |
| Oct 20 | Seasonal looks switch; Veterans Day look (10th Mountain statue); **shareable season card at winter's end**; end-of-winter page (Complex adds best day, past-winter chart, three statements); biathlon mat; turned-away skiers counted in the daily report; radio "next song"; busy hills faster |
| Oct 28 | Daily mini-games (Liftie: fill chair seats; Cat Track: groom a dark trail); **Main Street village layout per hill, buildings snap to lots**; paved paths and footbridge; ski school and road fixes |
| Nov 2 | **Intro film and a coached first winter** (first J-bar to first chairlift); Daily Arcade with retries; founder profiles; temperature on the weather chip |
| Nov 10 | Teams by code, weekly team cup, friends, Daily Arcade scoreboards; redesigned profile; coach walk-through of first days; pick a home hill from real US/Canada/international locations |

No post names a roadmap. Cadence is weekly to biweekly.

### 9.3 What the patches tell us

1. **Night consolidation works.** ICR moved every interrupting event into one nightly Ops Meeting. That is the same shape as our night recap sheet; it confirms keeping the day uninterrupted and the night as the single decision point.
2. **Guests react to bottlenecks.** Long line → guest goes to the village. Lines and venues are linked, which makes "see it, fix it" work.
3. **Trail difficulty uses sustained pitch.** A single rollover should not reclassify a run. Adopt this rule in PR 13.
4. **Ticket price is judged against hill value**, not a fixed expectation per preset. Our `ticketMismatch` constant is the weaker model; PR 9 should judge fare against what the hill offered that day.
5. **Onboarding came late and is now a priority** (intro film, coach for the first winter). We should build a coached first winter into the MVP, not after it.
6. **The live-service layer is growing fast**: dailies, arcade, teams, leaderboards, seasonal skins. This is ICR's direction, not ours.
7. **Gating was loosened.** Stars and hill counts no longer lock career hills.

### 9.4 What players say (4 reviews, 0.3–31.6 h playtime)

| Praise | Complaint |
|---|---|
| Finance depth (EBITDA-multiple valuation, expense management) | Only lift tickets are a meaningful price; food, rentals, shop, lessons are not |
| Hard to stop playing ("one more day") | Snow guns and grooming have little visible effect |
| Long-awaited niche (ski tycoon) | Clunky UI, many buttons without descriptions, rushed-feeling skill tree, missing keybinds |
| Humor in Apex and villager writing; original music | Easy once the hill is figured out, even in Complex |
| Good value at $10 | Feels ~70% finished; visual bugs; rough performance on a good PC; one launch failure |
| | No snowboarders despite store copy; wants staff wages, training, firing |

The sample is small; treat each complaint as a hypothesis, not a finding.
