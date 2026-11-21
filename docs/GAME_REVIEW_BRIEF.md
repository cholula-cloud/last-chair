# Last Chair — game review brief

**Purpose:** Planning reference that merges (1) the Nov 2026 phone playtest, (2) pressure-testing against [Game Design Vault — 7 Principles](https://gamedesignvault.top/game-design-principles/), and (3) narrative review using [NYFA — Compelling Game Story in Three Steps](https://www.nyfa.edu/student-resources/how-to-write-a-compelling-game-story-in-three-steps/) (characters, world, main conflict).

**Authority:** Game scope and pillars remain in [MASTER_PLAN.md](./MASTER_PLAN.md). This doc does not override MASTER_PLAN; it scores the current build and proposes backlog themes.

**Playtest basis:** Local dev, 390×844 Chromium touch; `playtest:m2` (opening ~86.8s scripted, lodge Tier 2, rentals, recap deltas); `phone-check` passed. Uncoached human opening and real Safari not sign-off. `playtest:p0` stale (title screen flow).

**Doc refresh (2026-11-21):** Scores in Parts A–D reflect the **Nov 2026 agent playtest**, before row 26 coach tips and M4b Batch 1 landed on `main` ([#144](https://github.com/cholula-cloud/last-chair/pull/144)–[#149](https://github.com/cholula-cloud/last-chair/pull/149)). Re-run human playtest for an updated verdict.

---

## Executive summary

| Lens | Verdict | Headline risk |
|------|---------|----------------|
| GDV goals & learnability | **Mixed** | Opening is a high-skill 3D task before the core loop is legible |
| GDV choices & feedback | **Strong core** | Night recap + “Why?” + on-hill queues deliver diagnosis; fare/snow levers under-fed |
| GDV challenge & progression | **Mixed** | Sim depth and lodge gating work; contextual coach shipped (row 26); story choices still night-only |
| GDV coherence | **Strong** | Cozy tycoon + honest sim + Route 100 tone align |
| NYFA characters | **Partial** | Six founders read well; *player* and recurring cast thin in play |
| NYFA world | **Strong** | Dutch Hill / Ice Coast / heritage hooks land in copy |
| NYFA main conflict | **Weak in play** | Abominable Snowglomerate and “one more winter” are told more than played |

**Planning themes from the playtest**

1. **Onboarding coach (row 26)** — **Shipped** contextual tips + problem guide; still need Q1 human sign-off and optional anchored CoachCard (handoff spec).
2. **Nightly operating decisions** — GDV meaningful choices and feedback for fare and snow.
3. **Story as systems (rows 23–24)** — NYFA conflict + GDV consequences for radio / Abominable Snowglomerate.
4. **Founder legibility** — NYFA characters + GDV rule comprehension.
5. **Opening UX load** — GDV challenge vs friction + mobile checklist.

---

## Part A — Game Design Vault: seven principles pressure test

Source framework: clear goals, learnable rules, meaningful choices, responsive feedback, appropriate challenge, purposeful progression, coherent experience. Each section: **Score** (Strong / Mixed / Weak), **Evidence**, **Failure mode if unaddressed**, **Planning hooks** (MASTER_PLAN / handoff rows where known).

### 1. Goals players can understand and pursue

**Score: Mixed**

| Signal | Evidence |
|--------|----------|
| Macro goal | “Reopen Dutch Hill, survive the winter” is clear in founder sheet and title copy |
| Session goal | Day: operate hill; night: fix what recap named — matches pillar “see it, fix it” |
| Micro goal (opening) | `StartCallout` + build sheet text (“Place surface lift…”, “Paint a trail…”) state objectives; **solution** (drag on canvas, two-finger map pan, Review / **Minimize**) is not fully separated from objective |
| Progress legibility | HUD day/cash/ops strip readable; “open the hill” gated until lift + trail |

**GDV pressure test — “Can players state the current objective in their own words?”**

- After founder pick: likely yes (“get the hill running”).
- During opening: objective yes, **steps** often no without experimentation (matches M2 human gate still open).
- Mid-winter: yes when recap problem line is clear (queues, snow, venues).

**Planning hooks:** Coach L-* / row **26**; consider **optional** first-trail corridor (objective without micro-solution spoil); a visible common solvency goal and an optional Readsboro visit in winter 1.

---

### 2. Rules and mechanics learnable through interaction

**Score: Mixed**

| Mechanic | Learnability |
|----------|----------------|
| Pause / speed / close hill | Strong — labeled controls, phone-check OK |
| Lift place + snap | Medium — placement bar helps; blocked vs valid reasons need reading |
| Trail paint + cut | Low-medium — steepness, two-finger pan (no separate Move map mode), undo; **Minimize** on the placement bar reduces chrome (PR #102) but steepness still loads the phone |
| Fare / snow presets | Medium — tiles clear; **effect** on queue/mood not taught in one interaction |
| Lodge tier / venues | Medium — gating messages (“Requires Lodge Tier 2”) work when player opens Build |
| Founder modifiers | Weak — blurbs thematic; numeric sim effects subtle in HUD |

**GDV consistency test:** Simulation is **consistent** (recap numbers match sim; m2: build trail → wait ↓, satisfaction ↑). UI exceptions: wind hold on day 1 while opening callouts still ask for build; founder “costs” not mirrored in conditions board.

**Planning hooks:** Founder **row 22** completion; tooltips or one-line **sim hints** on founder cards; reduce rule surface during `openingStep` only (defer wind narrative or non-critical callouts).

---

### 3. Choices with meaningful consequences

**Score: Mixed (strong for build, weak for night levers & story)**

| Choice class | Meaningful? | Notes |
|--------------|-------------|-------|
| Build lift / trail / venue | **Yes** | Cash, capacity, revenue, satisfaction deltas observed |
| Fare / snow nightly | **Partial** | Thematic tradeoffs in design; player cannot easily see **which** fixes tonight’s problem line |
| Founder (once per winter) | **Partial** | Different sim curves; weak perceived difference session 1 |
| Radio / Abominable Snowglomerate | **No (yet)** | “Got it” only; choices and carry-forward in MASTER_PLAN not shipped |
| Speed / pause / skip close | **Yes** | Affects time and learning, not pay-to-win |

**GDV tradeoff table (design intent vs playtest):**

| Decision | Advantage | Cost | Playtest |
|----------|-----------|------|----------|
| Cheap fare | Better ticket value and usually more guests | Less ticket revenue per guest and more pressure on lift lines | The recap points to the fare lever. The playtest lacked a clear explanation of which direction would help. |
| High snow tier | Better cover / ops | Nightly cash burn | Obvious tie to snow % |
| Second lift / trail | Capacity | Capital + build skill | Clear in recap after change |
| Lodge Tier 2 | Rentals, school path | Time + cash | m2 path felt purposeful |

For the first-winter work, show supported expected directions on the night controls and reserve numeric comparisons for closed days. Rows 23–24 add story decisions and record their results.

---

### 4. Feedback that explains actions and outcomes

**Score: Strong with gaps**

| Level (GDV hierarchy) | Last Chair |
|-----------------------|------------|
| Input acknowledgment | Press states, placement Review/Place, undo chip |
| Gameplay state | Conditions board, follow guest, lift queue on hill |
| Major accomplishment | Night recap tiles, talent toast, lodge tier completion |

**Strengths:** Problem line with red rail; “Why?” / “Why N% happy?”; venue takings line (e.g. Rentals $180); forecast block sums to ~100%.

**Gaps:** Fare/snow change lacks immediate feedback until next day; radio body can sit below fold; misleading risk low (sim honest) but **beat acknowledgment** can feel like blocking Sleep without emotional payoff if copy skipped.

**Planning hooks:** Scroll/night sheet layout so radio + Sleep hierarchy is obvious; aria already present on radio — keep **visual** hierarchy (GDV: feedback must match state).

---

### 5. Challenge matched to taught skills

**Score: Mixed**

| Challenge | Fair? |
|-----------|-------|
| Queue management via build | Yes — failure diagnosable |
| Cash / bankruptcy arc | Yes — warnings in economy |
| Opening 3D build | **Friction risk** — skill test before loop taught |
| Wind hold day 1 | Thematic but **untimely** vs opening skills |
| Operating calendar (CAL-1) | 21 Fri–Sun play days over ~7 weeks; Mon–Thu background sim + digest; legacy 28-day saves unchanged until new winter |

**GDV:** Increase **decision complexity** (second lift + fare) not just **duration** or opaque failure. Opening duration alone is not depth.

**Planning hooks:** Coach; wind hold after `openingStep === null`; difficulty options later (accessibility ≠ removing queue challenge).

---

### 6. Progression around learning and expanding possibilities

**Score: Strong structure, partial content**

| Layer | Status |
|-------|--------|
| Introduce | Opening: lift → trail → run day |
| Develop | Talents overnight, snow tiers, lodge tiers |
| Recombine | Cut new trail after ops stable (m2 showed satisfaction gain) |

**Gaps:** ~half talents without effects (row **21**); story unlocks not yet tied to visible new verbs; numerical progression (cash) strong, **expressive** progression (new interactions per beat) thin.

**GDV:** Avoid invalidating earlier learning — new venues should complement surface lift, not obsolete it (current design OK).

**Planning hooks:** Rows **21–24**; ensure each talent toast names **what you can do differently tomorrow**.

---

### 7. Coherent player experience (MDA)

**Score: Strong**

**Intended aesthetic:** Cozy, hopeful operator on a dignified real hill; diagnosis not spreadsheet; mobile toy-box UI.

**Mechanics → dynamics → aesthetics check:**

| If we add… | Coherence risk |
|------------|----------------|
| Heavy tutorial text walls | Breaks cozy mobile pacing |
| Real-time narrative mid-day | Breaks pause-and-plan pillar |
| Abominable Snowglomerate without tradeoffs | Breaks antagonist fantasy |
| More HUD widgets | Competes with mountain (already crowded at opening) |

**Contrast used well:** Calm day build vs night recap; storm/wind vs clear mornings.

**Planning hooks:** Every new feature asked: *Does this strengthen diagnosis + build joy on phone, or convenience that dulls tension?*

---

## Part B — GDV playtest seven questions (Nov 2026 session)

Use the seven recorded questions again at the next device sign-off. The last row is a follow-up for the first-winter work.

| Question | Result | Notes |
|----------|--------|-------|
| **Goal clarity** | Partial pass | Winter goal clear; opening steps fuzzy for cold start |
| **Rule comprehension** | Partial pass | Pause/recap strong; paint/build rules need coach |
| **Decision quality** | Pass for build; partial for night | Players can justify trail; fare/snow harder to justify |
| **Feedback accuracy** | Pass | Recap matches play; no trust breaks observed |
| **Challenge diagnosis** | Pass post-opening | “Long lines” → build/fare intelligible in recap |
| **Learning progression** | Pass in m2 | Same paint mechanic reused for second trail |
| **Experience coherence** | Pass | Players would describe “cozy ski tycoon on phone” |
| **Surprise** | To test | What surprised you about the hill or town? Could you tell what happened and what, if anything, it changed about your next decision? |

**Diagnostic rule (GDV):** If opening fails, **do not** only shorten the paint puzzle — check UI overlap, wind callouts, and placement bar occlusion first.

---

## Part C — NYFA story framework: three steps

NYFA emphasizes **characters**, **world**, and **main conflict** as ingredients that make players care. Below: intended design (WORLD / MASTER_PLAN) vs **what play delivers today**.

### Step 1 — Characters

**Design intent**

- **Player role:** Operator who signed the lease — understated; agency through build and nightly levers.
- **Founders:** Six distinct lease-signers with permanent winter modifiers.
- **Recurring cast:** Frank, Dana, Elena (crew); Maris (radio); Vivian Cho (Abominable Snowglomerate); guest personas.
- **NYFA criterion:** Relatable motives, strengths/weaknesses, visible intentions.

**Pressure test**

| Element | On paper | In play (playtest) | Gap |
|---------|----------|-------------------|-----|
| Founders | Strong blurbs + color identity | Readable cards; **quirks feel cosmetic** (Abominable Snowglomerate equity, cash stress) | Tie one HUD/conditions signal per founder |
| Player character | Implied caretaker | Little voice or reflection | Winter review / optional reply lines (row 24) |
| Crew | Talent order personified | Toast names effects; light personality | Named line when talent lands (row 23) |
| Vivian / Abominable Snowglomerate | Antagonist with trades | Radio tease only | Choices with consequences |
| Guests | Personas in sim | Follow guest works; stories anonymous | Optional guest “postcard” in recap |

**Planning hooks:** Row **22–23**; short **player intention** line on founder pick (“You’re here to…”); keep Faulkner-style **show through radio + receipts**, not cutscenes.

---

### Step 2 — The world

**Design intent**

- Real Dutch Hill, fictional rescue winter; Route 100, Ice Coast, NELSAP/DHASH respect.
- Layered world: meadows, gravel lot, lodge tiers, career map north.

**Pressure test**

| Element | Verdict |
|---------|---------|
| Setting legibility | **Strong** — calendar, weather, “Dutch Hill” on recap, mountain readable |
| Culture / tone | **Strong** — “Lights on in the lodge”, Route 100 Radio framing |
| Technologies | **Strong gameplay tie** — lifts, guns, grooming match sim |
| Places beyond ski front | **Latent** — town, DHASH hikers in beats; mostly radio not scene |

**NYFA note:** World-building should feed **events** — dry week beat aligns weather with no-guns start; ensure **dry week** gameplay moment matches beat (close lower third).

**Planning hooks:** Heritage card optional surfacing; lodge tier ribbon (MASTER_PLAN); Act II hills on map when career ships.

---

### Step 3 — Main conflict

**Design intent**

- **Survival conflict:** One more winter before forest reclaims hill; cash, weather, queues.
- **Ideological conflict:** Independents vs Abominable Snowglomerate Pass consolidation.
- **Character conflict:** Boromir-style temptations (sell, join pass, lower fare caps).

**Pressure test**

| Conflict layer | Shipped? | Player cares? |
|----------------|----------|---------------|
| Run a viable day | Yes | Yes — cash and happy % |
| Beat the hill’s physical limits | Yes | Yes — snow, wind, lines |
| Save the valley’s lit slope (emotional) | Partial | Radio helps; needs review beat |
| Resist Abominable Snowglomerate | **No** | Setup only — **main NYFA gap** |

**NYFA criterion:** Without an interesting problem, story fails to captivate. Today the **simulation conflict** carries the game; the **narrative antagonist** does not yet pull weight.

The playtest identified the need for an operating choice with Abominable Snowglomerate, a school visit the hill can actually serve, and a visible winter goal. The approved follow-through is in Part E.

---

## Part D — Consolidated findings (Nov 2026 playtest)

Retained for planning; details in agent playtest report.

### UI (phone-first)

- **Strengths:** HUD, conditions board, night tiles, founder picker.
- **Major:** Opening HUD/callout stack; placement vs bottom nav.
- **Polish:** Founder cryptic lines; radio below fold.

### Gameplay

- **Strengths:** Diagnosis loop, honest sim, lodge → rentals, pause/speed.
- **Major:** Opening skill wall; fare/snow ↔ recap link weak.

### Narrative

- **Strengths:** Beat copy, Route 100 frame, Dutch Hill dignity.
- **Major:** Story night-only; Abominable Snowglomerate no choice; feed/log missing.

### Challenge

- **Major:** Opening skill wall; coach tips help but anchored founder walkthrough and human cold-start sign-off remain open (Q1).

### Cross-cutting

- Update **P0 script** for title → New winter.
- Chromium only until Safari gate.

---

## Part E — First-winter plan and review backlog

**2026-11-19 design response.** The observations above describe the Nov 2026 playtest. The approved first-winter sequence follows the decisions in [MASTER_PLAN.md](./MASTER_PLAN.md#dutch-hill-first-winter-sequence).

| PR | Work | What to verify |
|----|------|----------------|
| 1 | Align the three planning docs | Finish the 28-day winter with nonnegative liquid net worth after debt and unpaid construction. Readsboro is optional. |
| 2 | First operating decision | Use the measured problem in the first recap to explain the fare or snow tradeoff. Show the following day's actual comparison when there are two observations. |
| 3 | Three local surprises | A pie at the lodge stays a social moment. Former regulars sometimes arrive together on weekdays. A frosty road delays some arrivals while preserving their scheduled total. |
| 4 | Readsboro visit | Accept or decline one weekday visit for six discounted pupils. Show how many lessons the hill actually delivered. |
| 5 | Vivian’s offer | Accept $6,000 once with a Balanced fare ceiling for the remaining winter or stay independent. Riley can decline and sees why accepting is unavailable. |
| 6 | Winter memory | Show the settlement and common goal outcome, plus only the choices and results the season recorded. Test the complete winter. |

Two implementation checks put numbers on the tradeoffs. On the same morning, an eight-seat school taught all six Readsboro pupils with its seats open, four with four seats occupied by public guests, and zero with all eight occupied. With a second school, all six received lessons even under that pressure. The bus paid $150 in lift tickets in each case. The town remembers the lessons.

Vivian’s check used seed 3, Elena, a Tier 2 school and an accepted bus visit. An operator keeping fares Cheap ended with $9,974 independent or $15,974 after signing, with the same 1,107 guests. An operator aiming for Expensive ended with $16,840 independent or $22,633 after signing, and served 831 or 892 guests respectively. The cap changed service and pricing freedom while the payment still won on cash in both examples. The size of that inducement remains a question for human playtesting.

The matrix retains other review findings for prioritization. Impact describes the GDV or NYFA gap. Effort is a rough sizing estimate.

| ID | Work item | GDV principles | NYFA | Impact | Effort | Suggested row |
|----|-----------|------------------|------|--------|--------|----------------|
| P1 | Contextual coach (lift → trail → play) | 1, 2, 5 | — | High | M | L-E, 26 — **☑ shipped** ([#149](https://github.com/cholula-cloud/last-chair/pull/149)); verify on device |
| P2 | Measured night recap and fare/snow tradeoffs | 3, 4 | — | High | M | L-E, 26 |
| P3 | Founder effect surfacing (1 metric each) | 2, 3 | Characters | Med | S | 22 |
| P4 | Local surprises and story log | 4, 7 | World, conflict | High | L | 23 |
| P5 | Readsboro, Vivian’s offer and winter review | 3, 6, 7 | Conflict | High | L | 22–24 |
| P6 | Defer wind-hold UI until post-opening | 5, 7 | — | Med | S | — |
| P7 | Goal card with common solvency and optional Readsboro visit | 1, 7 | Conflict | Med | M | L-E, 24 |
| P8 | Talent effects completion (12→20) | 6 | — | Med | L | 21 |
| P9 | Night sheet layout (radio before sleep) | 4 | — | Med | S | — |
| P10 | Fix `playtest:p0` + human M2 sign-off | — | — | High | S | TESTING |

---

## Part F — Suggested planning rituals

1. **Before any PR:** Run one GDV question from §B that the PR claims to improve; record pass/fail in [TESTING.md](./TESTING.md) sign-off log.
2. **Before story PR:** NYFA check — does this change make **character**, **world**, or **conflict** more playable (not just more text)?
3. **Before mobile PR:** Placement bar + opening in 390×844; `phone-check` + one unscripted observer minute.
4. **Feature filter (GDV coherence):** “If we ship X, does the player still describe the game as cozy diagnosis on a real hill?”

---

## Part G — General recommendations

Actionable improvements drawn from the review above. Prefer these over new features until the M2 human gate and P1 winter sign-off are green. When two recommendations conflict, **coherence + phone-first onboarding** win.

### Onboarding and first session

- **Teach the loop before the canvas.** Give players one guided win (place lift → paint → unpause → see guests ride) before exposing optional build depth (steepness, second lift, lodge). A short in-world coach beats a manual.
- **Separate objective from solution** (GDV): keep “Build a lift” / “Paint a trail”; teach drag + two-finger map pan in situ with highlights, not paragraphs.
- **Time-box opening pressure.** If day-1 weather or wind hold fires during `openingStep`, queue those callouts until the hill is open so challenge matches skills taught.
- **Ship a “session 1” path in design docs:** explicit target — title to first Sleep in ~15 minutes on Safari, with one explainable fare or snow change (MASTER_PLAN success metrics).

### Mobile UX and readability

- **Protect the build canvas.** During placement, use **Minimize** on the placement bar and **Hide HUD** when the mountain needs room; keep Cancel/Review and undo reachable without intercepting canvas taps (Playwright/touch regressions still warrant spot checks).
- **One thumb zone for urgency:** play/pause, close hill, and Sleep should stay predictable; avoid moving speed or recenter during opening week.
- **Night sheet information order.** Show the measured problem and fare/snow tradeoffs, followed by any radio item, the forecast and Sleep. Radio should not feel like a gate without narrative payoff.
- **Founder copy:** add one **gameplay sentence** per card (“Families +8% mood at arrival”) alongside flavor; keep blurbs for tone.
- **Landscape:** spot-check 844×390 whenever changing Hud or night sheet (historical overlap issues in TESTING.md).

### Gameplay feel and diagnosis

- **Tie night choices to measured results.** Name the bottleneck (queue, snow, value or venue) using the day’s figures. Show the choice’s cost and label any supported expected direction. Compare actual outcomes when the next day closes.
- **Show a measured improvement.** If wait drops after the next operating day, report the actual difference. Keep other recorded changes visible so the player can interpret it.
- **Follow guest as tutorial affordance.** After opening, one gentle nudge: “Follow a guest to see the line” when queue tone turns watch/bad.
- **Skip-to-close is a feature, not a crutch:** keep it; optionally show one frame of “while you were open” stats so skippers still feel cause and effect.
- **Balance expressive progression:** each lodge tier and talent should unlock a **verb** (place guns, school day, rentals) the recap can name next week — not only +% in the sim.

### Story and emotional retention

- **Give offers consequences.** Readsboro changes one weekday and the school outcome depends on lessons delivered. Vivian exchanges cash now for a real fare ceiling. The pie gives locals a moment on the hill with no change to the operating numbers.
- **Show the town in sim hooks:** bus day, après revenue, heritage sign — tie NYFA **world** to counters players already watch.
- **Give the operator a voice sparingly:** one-line reactions in winter review or after hard nights; no dialogue trees required for Dutch Hill.
- **Career map as long-term goal:** when the first career hill (Mount Tom, see STORY.md) unlocks, frame it as **escape velocity** from Abominable Snowglomerate pressure, not a generic level select.

### Content, scope, and discipline

- **Finish half-shipped rows before expanding cast or mountains.** Talents with no effect, founders without full modifiers, and radio without feed dilute trust (GDV rule comprehension).
- **Avoid feature sprawl that fights cozy diagnosis.** Crafting, deep staffing, or mid-day story pop-ups are high coherence risk (Part A §7).
- **Keep results and forecasts clear.** Use the simulation for expected directions and the closed day for numeric results.
- **Personas:** when Family Pack and Race Kid land, ensure each changes **visible** hill behavior (arrivals, trail choice), not only spreadsheet mix.

### Quality, testing, and team process

- **Human M2 gate is the product gate.** Scripted m2 ~87s does not replace uncoached Safari; schedule three external players for P1 per [TESTING.md](./TESTING.md).
- **Align automation with product flow:** refresh `playtest:p0` for title → New winter → slots; add a “four nights + reload” script for regression on night UX.
- **Sign-off log discipline:** each merge that touches Hud, night sheet, or opening should add one line to TESTING.md with device and pass/fail on a GDV question from Part B.
- **Performance budgets on phone:** keep `phone-check` on PRs that touch render or placement; watch draw-call budget when forest or guest count changes.

### Business and audience (light touch)

- **Browser-first positioning:** emphasize “one winter tonight” in store copy — matches seven-weekend operating arc and mobile session design.
- **Heritage / DHASH:** optional heritage card for players who want lore; default path stays operational, not homework.
- **No pay-to-skip tension** in design; speed control is for convenience, not monetization (protects cozy tone).

### What to defer until core loop sign-off

| Defer | Why |
|-------|-----|
| Rival mode, Capitalist hiring, deep ledgers | Depth optional only after simple path delights in 10 minutes |
| Act II+ mountain content | Career needs winter 1 “want mountain 2” emotion first |
| Cosmetic building styles at scale | Joyful once build is learnable |
| Heavy narrative branching | Start with 2–3 high-quality choices with sim teeth |

### Quick prioritization heuristic

When picking the next PR, ask in order:

1. Does it help a **new phone player** finish day 1 and night 1 without help?
2. Does it make **tonight’s recap** more actionable?
3. Does it make **story conflict** cost or reward something measurable?
4. Does it add depth without adding **HUD noise**?
5. If none of the above, backlog it.

---

## References

- [Game Design Vault — 7 Principles of Game Design](https://gamedesignvault.top/game-design-principles/) (Mela, 2026)
- [NYFA — How To Write A Compelling Game Story In Three Steps](https://www.nyfa.edu/student-resources/how-to-write-a-compelling-game-story-in-three-steps/) (2016)
- [Last Chair MASTER_PLAN.md](./MASTER_PLAN.md)
- [Last Chair WORLD.md](./WORLD.md)
- [Last Chair TESTING.md](./TESTING.md)
- Live play: [last-chair/play](https://cholula-cloud.github.io/last-chair/play/)

---

*Document version: 1.1 · Updated: 2026-11-19 · Game review brief for backlog planning.*