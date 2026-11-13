# Last Chair — game design bible

**Version:** 0.5 · **Updated:** 2026-11-13  
**Status:** Planning — **Story Mode** is the product; Sandbox supports experimentation.  
**Platform:** Browser-first; **iPhone + iPad Safari primary** — [PLATFORM_MOBILE.md](./PLATFORM_MOBILE.md).

---

## Build order (non-negotiable)

```text
1. Match ICR Simple loop feel (Build the Mountain) — original art/story — gate: FEEL_SCORECARD P0 on mobile
2. Playtest until “one more day” is fun with minimal UI
3. Second pass: 110% improvements (narrative, UI, juice) — see IMPROVEMENTS_PASS.md
```

“99%” in older notes means **same satisfying Simple loop**, not shipping every ICR feature before fun.

Do **not** ship bespoke story systems before the mountain day loop works. Do **not** add simulation depth that ICR hides behind Simple mode.

Full improvement backlog: [LAST_CHAIR_IMPROVEMENT_PLAN.md](./LAST_CHAIR_IMPROVEMENT_PLAN.md) (**post–loop-feel**).

---

## Why Last Chair (not just play ICR)

1. **Mobile-first night flow** — fare + snow/service in a thumb-zone bottom sheet; ops strip visible on phone (ICR buries fare/ops on small screens).
2. **Dutch Hill in the sticks** — real NELSAP/DHASH ghost hill as Act I; dignified fiction, not a generic starter map.
3. **Named crew + Mountain Radio (text v0)** — same Simple crew order as ICR, but Frank/Dana/Elena personality from week one (retention without Complex mode).

Optional P1 wedge: **guest regulars** via list follow; **Ledger** tutorial on tap “Why?”

---

## One sentence

**Last Chair** is a cozy **3D browser ski hill tycoon**: reopen a lost New England mountain, watch tiny skiers have their day, pick **two or three choices each night**, and in **Story Mode** grow a regional tale—without drowning in spreadsheets.

---

## Design pillars (ease + depth)

1. **Fun first, depth optional** — The default path is satisfying in 10 minutes; ledgers are there when you want them.
2. **See it, fix it** — Follow a guest; queues and snow problems are visible on the diorama.
3. **Crew handles the boring stuff** — Story Mode matches ICR *Build the Mountain*: you build and set fare + snow/service; overnight crew runs ops and talents in a sensible order.
4. **Pause anytime** — Planning is half the game.
5. **Loop feel, then elevate** — ICR Simple verbs on mobile, then 110% pass.

---

## Two play modes

| | **Story Mode** (focus) | **Sandbox Mode** |
|---|------------------------|------------------|
| **Purpose** | Career, story beats, megapass arc | Experiment, build fantasy hill |
| **Progression** | Mountains, talents carry forward | No story gates |
| **Economy** | Real pressure (ICR-like) | Configurable: relaxed / normal / off |
| **Ops** | Crew overnight + **2–3 nightly player choices** | Player can enable manual ops later |
| **Save** | Cloud career (P2); local v0 | Local quick-save slots |
| **When to build** | **Phases 1–5 (primary)** | After core build loop works (~Phase 2) |

Story detail: [STORY_AND_WORLD.md](./STORY_AND_WORLD.md) · Flow: [GAMEPLAY_AND_FLOW.md](./GAMEPLAY_AND_FLOW.md).

---

## Player fantasy (Story Mode)

You reopen [**Dutch Hill**](https://www.nelsap.org/vt/dutch1.html)—a **shut-down Vermont hill in the sticks** (Heartwellville, Readsboro). One rusty lift, no guns at first, the forest creeping back. Earn **one more winter**, then take the career north. [DUTCH_HILL_ACT_I.md](./DUTCH_HILL_ACT_I.md) · [NORTHEAST_MOUNTAINS.md](./NORTHEAST_MOUNTAINS.md) · [NORTHEAST_LORE.md](./NORTHEAST_LORE.md).

---

## Core loop (ICR Simple feel)

Match ICR **Build the Mountain** as the Story Mode default:

```text
Day: watch mountain (pause/build) → guests ski → close
Night: read short recap → set ticket fare → set snow & service tier
       → (story choice if beat ready) → sleep → crew: snow, groom, talents
```

**Deliberately lighter than ICR Complex:** no mandatory talent UI, no full operations panel on night one. Finance = **one summary line + tap for detail**.

28-day season · career across hills · talents (crew order in Story Mode).

Sim detail: [SIMULATION_SPEC.md](./SIMULATION_SPEC.md). Ship gates: [FEEL_SCORECARD.md](./FEEL_SCORECARD.md).

---

## What v1 loop feel includes / excludes

**Include (ICR Simple verbs):**

- Lift place + viable descent rules
- Guest agents + follow + satisfaction drivers (simplified presentation)
- Snow depth/coverage/thaw + guns/groom **as player-facing outcomes**, not micromanagement
- Lodge + key venues (café, shop, school) in phases
- Fare + snow/service presets (Cheap / Balanced / Expensive · Minimal / Mid / High)
- Overnight resolution
- Talent progression via **crew order** in Story Mode
- Winter review, second mountain, caretaker

**Exclude or defer (keeps game simple):**

- Full Director-style ops matrix at launch
- All 70 talents before fun proof
- Full three-statement accounting UI at launch (summary first, statements in optional Ledger)
- Daily challenge / Hill Cup until Story Act I ships

---

## 110% pass (after loop feel on mobile)

Mobile juice, narrative radio depth, guest regulars, ops dashboard, talent planner, art lighting—**after** [FEEL_SCORECARD.md](./FEEL_SCORECARD.md) P0/P1. Checklist: [IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md).

---

## Success metrics (Story Mode)

- **Session 1 (15 min):** completed one full guest loop + one night choice on **phone or tablet**.
- **Day 3:** player changed fare or snow tier for a reason they can articulate (not wiki).
- **Winter 1 end:** wants mountain 2 without tutorial hand-holding.

---

## Doc map

See [README.md](./README.md).
