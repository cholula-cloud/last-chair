# Last Chair — gameplay & flow

**Version:** 0.3 · **Updated:** 2026-11-13  
**Priority:** **Story Mode** first; Sandbox after core loop.

---

## Product shape

**Fun simple game + hidden depth.** Players who never open the Ledger still win winters. Players who love tycoon depth can open statements, follow guests, and optimize queues.

Ice Coast Revival’s **Build the Mountain (Simple)** is the mechanical template for Story Mode nights.

---

## Story Mode — session flow

### First launch

1. **Title** → Story Mode / Sandbox (Story highlighted).
2. **Pick founder** (one of six — modifiers, see [CHARACTERS.md](./CHARACTERS.md)).
3. **Dutch Hill, VT** loading — overgrown lifts, heritage card, radio (skip OK).
4. **In-world goal card:** “Get one lift running and one happy descent before the bank calls.”

### Typical 20–30 minute session

| Step | Player | Game |
|------|--------|------|
| 1 | Unpause or stay paused | Day clock runs 6am–4pm |
| 2 | Build / move / inspect | Tap lift, guest, building |
| 3 | Follow guest (optional) | Camera tracks agent |
| 4 | Pause to plan | No penalty |
| 5 | Let day finish or skip to close | “Skip to close” after 2pm (accessibility) |
| 6 | **Night recap** (1 screen) | Crowd, satisfaction emoji, cash Δ, **one problem highlight** |
| 7 | **Choices (max 3)** | Fare preset · Snow & service · Story reply (if beat) |
| 8 | Sleep | Crew talents + overnight sim |
| 9 | Morning headline | Weather + radio line |

**Night choices stay at two** until Act II introduces an occasional third (story branch).

---

## Story Mode — season flow

```text
Days 1–7   Learn loop, first Saturday, first thaw
Days 8–21  Expand village/lift, school bus beat, talent milestones
Days 22–28 Peak week, SummitLink offer, winter review
→ Map: next mountain OR story interlude
```

**Story beats** gate on sim metrics (sellout, broke cash, school day scheduled)—never on arbitrary timers alone. Log in **Career → Story**.

**Talents:** In Story Mode, **crew learns overnight** in a fixed priority order (ICR-style list to be ported/adapted). Player sees “Tomorrow the crew learns: *Rope Tow*” on Level screen—no tree UI required for v1 parity.

---

## Sandbox Mode — session flow

**Unlock:** After tutorial **or** from main menu immediately (design choice: **immediate** for influencers; **optional** tutorial link inside).

| Setting | Options |
|---------|---------|
| Mountain | Blank / Dutch Hill template / saved layout import (later) |
| Money | Normal · Comfortable · Unlimited |
| Weather | Live random · Fixed sunny · Storm week |
| Story | **Off** |
| Talents | All unlocked **or** crew order **or** manual picker (advanced) |

**No** SummitLink arc, **no** career persistence across mountains unless “Save as sandbox slot.”

Sandbox is where we test **110% build tools** (trail draw, lift types) without balancing Story economy.

---

## Screen map (Story Mode v1 — 99% parity)

Minimal chrome; 3D is home.

```
┌─────────────────────────────────────┐
│ [Pause]  Day 12 · Sat · 11:42  [$]  │
│                                     │
│         3D MOUNTAIN (main)          │
│                                     │
│ [Build] [Guests] [Night▸when close] │
└─────────────────────────────────────┘

Build sheet    → categories: Lifts · Terrain · Village · Snow
Guests sheet   → list + Follow · mood snippet
Night recap    → recap + fare + snow/service + Continue
Career (hub)   → map · level · talents progress · story log · Ledger (optional)
```

**Ledger (optional depth):** Income snapshot only in v1 parity; full IS/BS/CF in parity phase 3 or 110% pass.

---

## Controls & feel

- **Desktop:** click place, wheel zoom, drag pan, Esc menu.
- **Mobile:** one-thumb pan; build mode explicit; large close buttons.
- **Speed:** 1× default; 2× when “day going well”; never force 4× on new players.

---

## Difficulty & fairness

- Story Mode uses **ICR-aligned** pressure: bad weather hurts, but **one visible fix** per crisis (queue → lift/trail; thaw → budget or guns; empty café → seat capacity).
- **Fail soft:** negative cash triggers **warning + loan offer** before hard game over.
- Founders tilt pressure (see characters doc), not hidden cheat codes.

---

## Parity vs our simplifications

| ICR | Last Chair Story v1 |
|-----|---------------------|
| Simple nightly fare + snow/service | Same |
| Crew talent order | Same structure |
| Complex manual ops | **Not in Story v1**; Sandbox toggle later |
| Full finance tabs | Summary + optional Ledger |
| 28-day bank / monetization | Match reference behavior when implementing; don’t design around it in docs yet |

---

## Implementation order (gameplay code)

1. Day clock + pause + close
2. One lift + descent validity + 20 guests
3. Night recap + 2 presets
4. Snow thaw stub + satisfaction
5. Build menu: 2nd lift, warming hut → lodge step 1
6. Crew talent #1–5
7. Story beat hooks (radio text only)
8. **Sandbox** duplicate scene with economy flags
9. Winter review → mountain 2 stub

Roadmap detail: [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md).
