# Last Chair Story Mode

**Version:** 2.0 · **Updated:** 2026-11-22 · **Status:** Locked (D1–D6 approved by owner)

**Scope.** This document covers **Story Mode** only: the career from Dutch Hill onward, played in the Simple ruleset (you build and set two nightly levers, fare and snow & service; the crew runs operations). **Sandbox (M6) and Capitalist Mode (M8, head-to-head against Whiterock) are separate modes added later and do not use this story.** Sandbox has story off. Capitalist Mode may reuse the hills and the rival company, and uses none of the characters, beats, surprises or endings written here. §6.4 lists the boundary.

**Authority.** [MASTER_PLAN.md](./MASTER_PLAN.md) wins on product scope. This file wins on Story Mode narrative: who the player is, the cast, beats, surprises, the mountain roster, copy and the endings. [WORLD.md](./WORLD.md) keeps the lore pantry and the legal and respect line. [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) keeps every number. The rule from WORLD.md holds: when story and sim disagree, the sim wins.

---

## 0. Decisions in one screen (all locked)

1. **The player is a person (D2, locked).** You grew up in Readsboro. Your grandmother, Nan, sold tickets at Dutch Hill for thirty winters and kept the last punch card from 1984–85 with one ride left on it. You spent ten winters on a snowmaking crew up north until **Whiterock** (our private-equity megapass) bought the mountain, automated the night guns, and put the crew on a timer. **Vivian Cho** signed that memo and offered you a desk job. You came home instead. The $12,000 in the till is your savings plus Nan's coffee can.
2. **Optional name on the lease (D3, locked).** In the Cold Open, you can sign your name on the town lease (24 characters max, text-only, never voiced) or click *"Just write 'the operator'"*.
3. **The founder is your partner.** The pick reads *"Who's signing the lease with you?"* Each founder has a wry, personal line about how they know you.
4. **"Last Chair" gets a meaning.** Nan's punch card is the title. Every winter ends with the last chair at 3:45 on the final day and the card gets punched. A failed winter leaves the ride on the card.
5. **Surprises triple, paced to CAL-1 (7 Fri–Sun weeks).** 25 surprises in the catalog (13 for Dutch Hill), at most one radio item per night, at most two surprises in any seven days, a midpoint turn in Week 4 (operating days 10–12), and a set piece on the final Saturday. Quiet-weekday surprises (DH2, DH5) fire on non-holiday Fridays as well as legacy Tue–Thu.
6. **Vivian is felt all winter.** She skis your hill as a real guest in the sim before she makes an offer, and her offer quotes her own measured day. She appears in every winter of the career with a different, bigger trade.
7. **Roster: eight real lost hills, Dutch Hill the smallest (D1, D5, locked).** Dutch Hill (VT), Mount Tom (MA), Maple Valley (VT), Snow Valley (VT), Enchanted Mountain (ME), Evergreen Valley (ME), Brodie (MA), Mount Whittier (NH). **Tenney** and **Crotched West** are cut (both operating today). **Hogback** (VT) stays as lore only. **Rollout (D5):** Ship 3 hills first (Dutch Hill, Mount Tom, Maple Valley in M5), and hills 4–8 in M7 once guest scaling (N12) lands.
8. **You never abandon a hill (D4, locked).** When you move on, a named local ally runs it as caretaker on the coarse off-screen sim, it pays you a little, and Vivian bids on it if reputation slips. If a later hill goes bankrupt, its Atlas dot turns Whiterock blue or forest green and the career continues from your remaining hills (`The Forest` ending only when 0 hills remain).
9. **The next hill comes from a phone call.** A town calls because of something your winter measured, and Maris reports that Whiterock holds an option on that hill's land.
10. **Voice budget (D6, locked).** ElevenLabs free-tier credits only (estimate first, one take each): Cold Open cards 3–6 (~430 chars), one 150-char intro line per new hill, and four ending lines (~150 chars each). Captions always work as fallback.

---

## 1. Narrative pillars & voice

### 1.1 Narrative pillars

| # | Pillar | What it decides |
|---|---|---|
| **N1** | **Every beat starts on the hill.** A story moment fires from a recorded sim condition and either teaches a system or asks for a decision. | No beat on a timer alone. No beat whose only effect is text. |
| **N2** | **It's your name on the lease.** The player is a specific person from this valley with something to lose and someone to answer to. | Characters address the player. Failure costs something personal. |
| **N3** | **Neighbors, each with a job.** Every named character owns one system, speaks in their own voice, and remembers what you did. | No character without a system. Lines reference measured results. |
| **N4** | **The pass is always in the rearview mirror.** Whiterock is a reasonable, well-funded private-equity pass that shows up every winter with a priced trade. | Vivian appears every winter whatever the player's reputation. Every offer has a measured cost and benefit. She is never a cartoon. |
| **N5** | **Dignified history, honest fiction, one lift ride long.** Real facts are true and credited; invented things are plainly ours; every beat reads on a phone in the time it takes to ride the T-bar. | One to three punchy sentences per radio item, one tap per decision, sourced facts on heritage cards, no invented scandal about real people or places. |

### 1.2 Tone & copy standard

Fun, light-hearted, engaging, and unmistakably New England—without ever turning into a "wicked" parody. The humor comes from small-town ski ops (coffee-grinder bullwheels, state plow drivers, duct-taped snowboards, private-equity spreadsheets meeting a frozen culvert). Warmth first, wryness second, clarity always.

---

## 2. Who the player is

### 2.1 The protagonist

| Question | Answer |
|---|---|
| Who | A Readsboro kid, now about 35. Optional name on the lease (24 chars max, letters/spaces/apostrophes/hyphens). Default in text: `"the operator"`. No portrait, no gender, no stated age on screen. |
| History | Learned to ski on the rope tow at the town hill because Dutch Hill closed before you were born. Spent ten winters on a snowmaking crew up north until **Whiterock** bought the resort, automated the night guns, and put the night shift on a timer. Vivian Cho ran the transition and offered you a desk job. You took your toolbox and came home. |
| Why this hill | Nan, your grandmother, sold tickets at Dutch Hill for thirty winters. She kept the last punch card from 1984–85. It has one ride left on it. |
| What you bring | You know snow and you know lifts. That is why you can build and why the crew listens. |
| What you lose if it fails | $12,000: your savings plus Nan's coffee can. The town's one-winter lease, which goes back to the forest. Face in a valley where everyone reads the license plates in the lot. |

### 2.2 The founder is a partner

Each founder has one relationship line shown above their bonus on the pick card:

| Founder | Relationship line |
|---|---|
| **Elena Vargas** | "Taught your mom to snowplow on Dutch Meadows. Still uses your middle name when you're in trouble." |
| **Tom "Ledger" Keene** | "Wrote small-hill loans for thirty years. Says this one is either his masterpiece or his excuse to retire." |
| **Riley Otis** | "Rebuilt your first truck and your second one. Wouldn't sell a rusted bolt to Whiterock." |
| **Dr. Amira Chen** | "Moved up the valley for 'the quiet.' Reads a barometer better than the radio reads the news." |
| **Juniper Hale** | "Runs the land trust meetings with a thermos and a map. Knows every sugar maple by name." |
| **Marco Russo** | "Threw the best party Wilmington ever saw. Also the only one that needed a town ordinance afterward." |

### 2.3 The intro (Cold Open v2)

Target: ~70 seconds of cards, 20–40 seconds on the founder pick, then the hill. Keeps captions, Skip, keyboard advance, and tap-to-advance from `ColdOpen.tsx`.

| # | Card | Status | Caption (Maris Shaw) | Interaction |
|---|---|---|---|---|
| 1 | `closed` | Keep + keep audio | "Dutch Hill ran from 1944 to 1985. Then the lifts stopped." | Tap to advance |
| 2 | `burned` | Keep + keep audio | "In 1990 the lodge burned. The forest started taking the slope back." | Tap to advance |
| 3 | `shoebox` | **New** (visual card: kitchen table, shoebox, ticket punch, 1984–85 card) | "Nan sold tickets here for thirty winters. She kept the last punch card—one ride left on it." | **Tap the card** to flip it and show the unpunched square. **"LAST CHAIR"** title drops in for one beat. |
| 4 | `nightcrew` | **New** (visual card: snow guns at night, hard hat on a hook) | "You made snow on somebody else's mountain for ten winters. Then Whiterock bought the place and put the night shift on a timer." | Tap to advance |
| 5 | `lease` | **Rewrite** of `town` | "Heartwellville will lease you Dutch Hill for one winter. Twelve thousand in the till—your savings, plus whatever Nan had in the coffee can." | **Sign the lease:** optional name input (*"Your name, if you want it on the lease"*), primary button **"Sign it"**, secondary **"Just write 'the operator'"**. |
| 6 | `pick` | Rewrite | "Nobody runs a hill alone. Who's signing with you?" | Button: **"Choose a founder"** |

**Day 1 Cold Read (Route 100 Radio, text-only, before first-lift tip):**
> "Morning, Route 100. Word at the general store is {name} came home from up north and signed for Dutch Hill. Lodge lights are on. Lifts aren't. Yet."

### 2.4 How people address the player

| Who | Address | Sample |
|---|---|---|
| **Maris Shaw** (radio, text) | Name or `"the operator"` | "{name} had the T-bar turning by nine. First time since '85—and it didn't even eat a mitten." |
| **Nan** (radio call-ins, text) | First name, or `"hon"` | "Hon, the Meadows always iced up right by the J-bar. Your grandfather had a whole vocabulary for that corner." |
| **Riley Otis** | `"Boss"` | "Boss, the T-bar sounds like a coffee grinder full of gravel. She'll run." |
| **Frank Oka** | `"Kid"` | "Groomer threw a track, kid. She'll live. Just not tonight." |
| **Chief Dana Holt** | `"Operator"` (radio formal) | "Operator, wind's kicking up on the crest. We're holding the chair." |
| **Elena Vargas** | First name | "The Readsboro kids are coming Friday, {name}. Keep the bunny slope soft." |
| **Vivian Cho** | First name, warm, a touch too smooth | "{name}, I skied it Saturday. Seven-minute wait, decent corduroy, zero cocoa. I can fix two of those." |
| **Al Waters** | `"Operator"` in letters, first name when pleased | "Six pupils, six lessons. I'm telling the school board you're officially a grown-up, {name}." |

### 2.5 The Last Chair bookend

- **First ride (Day 1):** Toast when the first paid guest boards: *"First ride since 1985. Nan's card stays in your pocket till closing day."*
- **Final day (15:45 on last operating day):** Toast + gentle camera ease to the primary lift (skipped if reduced motion is on): *"Last chair. That one's yours."*
- **Winter Review punch-card line:**
  - Solvent: *"Nan's card: punched."*
  - Insolvent but finished: *"Punched. The bills outlasted the snow, but you rode it."*
  - Bankrupt: *"Nan's card still has one ride on it. Keep it."*

---

## 3. Surprise and challenge catalog

### 3.1 Rules for every surprise

1. Starts from a recorded sim condition. Never moves a number the day's rules wouldn't move.
2. Has an operating response where one exists; results show in the next recap through normal settlement.
3. Fires at most once per winter unless marked repeatable.
4. Rolls stay seeded per day (`STREAM.SURPRISE`) so replays match.

### 3.2 Pacing on CAL-1 (7 Fri–Sun weeks) & 28-day legacy

| Rule | Value |
|---|---|
| Radio items per night | **1.** Priority: decision card (school, Vivian, club bus, groomer) > set piece > midpoint reversal > story beat > surprise. Displaced items wait 1 night, then drop. |
| Surprises per 7 civil days | At most **2**. At most **1 threat** in any 5 days. |
| Quiet days | None on operating day 1. None on a night with a decision card. |
| Midpoint turn | One reversal in **Week 4** (operating days 10–12 on CAL-1; days 13–17 on legacy 28-day), chosen from the hill's reversal pool by whichever condition triggers first. |
| Final-week climax | The hill's set piece on the **final Saturday** (operating day 20 on CAL-1; last Saturday on legacy). |

| Operating Week | Open Days (CAL-1) | Legacy Days | Week Job | Beats & Surprises |
|---|---|---|---|---|
| **Week 1** | 1–3 | 1–4 | Learn the hill | Cold read, First uphill load, Saturday crowd. At most 1 warm/funny item; threats only from weather. |
| **Weeks 2–3** | 4–9 | 5–12 | Grow | School bus (when gated), Vivian's scouting visit (DH6, Sat/Sun), Bennington club bus (DH7). Up to 2 surprises/week. |
| **Week 4** | 10–12 | 13–17 | **Midpoint turn** | Dry week if gated, 1 reversal (DH8 Groomer threw a track or DH9 January thaw). Counts toward weekly cap. |
| **Weeks 5–6** | 13–18 | 18–24 | Pressure | Vivian's offer (from Open Day 13 / Legacy Day 18), Nan calls in (DH10), loan tension. Up to 2 surprises, 1 threat. |
| **Week 7** | 19–21 | 25–28 | **Climax** | Last Saturday (DH13 set piece), final Sunday Last Chair, Winter Review, Next-Hill Call. |

### 3.3 Dutch Hill catalog (13)

Kinds: **W** warm, **F** funny, **T** threat, **L** lore, **R** reversal, **S** set piece, **D** decision.

| ID | Name | Kind | Trigger (sim condition) | Copy / Player sees | Operating response |
|---|---|---|---|---|---|
| **DH1** | Pie on the counter | W F | 2% a day from operating day 2 | *"Someone left a warm maple pie on the lodge counter with a sticky note: 'For the lifties.' The crew split it before the ink dried."* | None (morale flavor) |
| **DH2** | Old tracks, new turns | W | Quiet non-holiday Friday (or legacy Tue–Thu), 6% | 3–5 returning regulars arrive. *"Three folks who learned to ski here in the seventies pulled in before nine. One tried to hand the ticket window a six-dollar bill 'just like '85.'"* | Fare |
| **DH3** | Slow going on Route 100 | T | 8% on non-thaw days | Morning arrivals delayed until plow clears. *"State plow's creeping behind a milk truck on Route 100. {count} skiers rolled in late once the salt hit."* | Early Plow talent later |
| **DH4** | Thaw Monday, ice Wednesday | T | Thaw day followed by clear day leaves ≥ 2 lower segments in Ice | *"Thawed yesterday, froze hard by midnight. Route 100 rule of thumb: pack your sharp edges or crank the groomer tonight."* | Mid/High groom or Cheap fare |
| **DH5** | Snow day | W T | Storm forecast on a non-holiday Friday (or legacy Tue–Thu), seeded 40% | *"Readsboro called off school. Every kid with a sled and a cousin with a Subaru is pointed up the driveway."* Uses vacation guest mix for the day. | Fare, snow tier, capacity |
| **DH6** | The visitor in a very clean jacket | F, antagonist | Reputation ≥ 40, Sat or Sun in Weeks 2–3 (open days 4–9 / legacy 6–14) | Guest `"Visitor in a very clean jacket"` (Vivian) skis your hill. Night: *"Rental SUV with Massachusetts plates. Rode the lift six times, timed the line on her phone, didn't buy cocoa. Draw your own conclusions."* | Follow her; fix whatever her "Why?" flags |
| **DH7** | The Bennington club bus | D | Saturday closed with mean wait ≤ 5 min and satisfaction ≥ 70 | Night card: Bennington Ski Club asks to bring 10 skiers next Saturday at $10 under Balanced. *"Bennington Ski Club wants to charter a bus up next Saturday—ten skiers if you can hold the line."* | Accept or decline |
| **DH8** | Groomer threw a track | T R D | Midpoint window (Week 4), Mid/High service on ≥ 2 of last 4 nights | Frank: *"Groomer threw a track over on the Windmill side, kid. She'll live. Not tonight, though."* Tonight grooms nothing at any preset unless you pay $250 to borrow the town road crew's machine. | Pay $250, or skip grooming / lower fare |
| **DH9** | The January thaw | T R | Forecast run of ≥ 2 thaw days starting in/after Week 3 | *"Warm air's parked over the valley for the next couple days. Keep an eye on the lower meadows before they turn to mashed potatoes."* | Snow tier, close lower trail, fare |
| **DH10** | Nan calls in | W L | First Sunday after reputation ≥ 60 (or Heritage Sign learned) | *"Caller on line one—says she's your grandmother. 'Tell {name} the Meadows always iced up by the J-bar. Your grandfather swore at that corner every February.'"* | None (heritage warmth) |
| **DH11** | Skin tracks at dawn | L | Morning after a storm that added depth, with Minimal service the night before | *"Skin tracks up the Windmill side before the bullwheel turned. Folks kept hiking this hill after '85—nice to see them ride past a lodge with the lights on."* | Groom on powder nights or leave soft |
| **DH12** | Dry week | T | 3+ days without snow and depth < 0.35 | Branched on `guns.length`: with guns, *"Dry stretch out there. Guns need cold air to bite—run 'em when it dips."* Without guns: *"Dry stretch, and no snow guns yet. Hold for cold or close the lower third before it browns out."* | Close lower trail, cheap fare, Tier 2 for guns |
| **DH13** | **Last Saturday** | S | Final Saturday of the winter, if not bankrupt | Night before: *"Whole town's coming tomorrow. Plates from Bennington to Brattleboro."* Day: vacation mix + reputation-scaled arrival bonus, torchlight at close (visual), Nan in the lodge if rep ≥ 60. | Fare, snow, capacity |

### 3.4 Later-hill catalog (12)

| ID | Hill | Name | Kind | Trigger | Player sees | Response |
|---|---|---|---|---|---|---|
| **MT1** | Mount Tom | Dry up north | W T | Guns running & regional north-dry flag | Connecticut plates fill the lot; long lines | Raise fare, run night session |
| **MT2** | Mount Tom | The pass bus | D, antagonist | Saturdays from Week 2 | Vivian offers $400/Sat to use your lot as a park-and-ride for Whiterock's bus north | Accept (cash, fewer stalls, Sat arrival dip) or decline |
| **MT3** | Mount Tom | **Lights on the Range** | S | First clear Friday night session with lights built | The whole Pioneer Valley sees the range lit from I-91; after-work crowd doubles | Night fare & service |
| **MV1** | Maple Valley | Inspector's Tuesday | T | State lift inspection on seeded day; low-upkeep lift closes | Dana reads the inspection tag the night before | Pay for repairs tonight or run without it |
| **MV2** | Maple Valley | **Tubing Saturday** | S | Final Saturday with tubing hill built | Readsboro & Dummerston school families bring siblings | Tubing capacity & fare |
| **SV1** | Snow Valley | Boards on the T-bar | D | First weekend with Rider persona | Saturday Regulars grumble; riders want wide trails | Welcome riders or keep skiers-only Sunday |
| **SV2** | Snow Valley | The $29 Tuesday | T R | Midpoint; Whiterock's resort up the road runs a weekday promo | Weekday arrivals dip | Cheap fare, school days, events |
| **SV3** | Snow Valley | **The riders come home** | S | Final Saturday with riders' event built | Jam weekend honoring the 1983–84 nationals | Event fare & capacity |
| **EM1** | Enchanted | Moose on the trail | F | Weekday, fresh snow, < 30 arrivals | Patrol closes one trail till noon for a stubborn bull moose | Lean on redundant trails |
| **EM2** | Enchanted | **Nor'easter** | S R | Seeded 3-day storm in midpoint | Day 1 road closes (arrivals ~0, costs run); Days 2–3 powder crowds | Cash buffer, Early Plow, grooming |
| **BR1** | Brodie | **Green snow Saturday** | S | Saturday nearest mid-March, events built | Dyed green snow (visual) & torchlight parade | Event night choices |
| **MW1** | Mount Whittier | **Cars stop on Route 16** | S | First gondola day | Traffic stops under the first cabin; next weekend's arrivals jump | Gondola & shuttle capacity |

---

## 4. Characters & Whiterock arc

### 4.1 Core cast

| Character | System | Role & voice |
|---|---|---|
| **Maris Shaw** | Story delivery | Route 100 Radio morning-show veteran (Concord, NH). Warm, gabby, weather proverbs, says Worcester wrong on purpose. Uses `{name}` or `"the operator"`. |
| **Nan** | Reputation, heritage, Last Chair | Your grandmother (fiction). Text-only radio call-ins once or twice a winter. |
| **Vivian Cho** | Whiterock (outside money) | Regional VP at Whiterock Mountain Partners. Polite, sharp, private-equity smooth—and right about some things. Learned to ski on a rope tow that closed when she was nine. |
| **Frank Oka** | Grooming, snowmaking | Gruff, diesel-stained, fond of the groomer. Calls you `"kid"`. Owns DH8. |
| **Chief Dana Holt** | Patrol, wind holds, inspections | Calm, deadpan, safety first. Calls you `"Operator"`. Owns snow day & lift inspections. |
| **Elena Vargas** | Schools, families, heritage | Warm, teacherly, knows every bus driver. Owns school & club bus cards. |
| **Al Waters** | School contracts | Readsboro Superintendent (your 4th-grade principal). His reference brings Maple Valley's call. |
| **Riley Otis** | Founder only | Lift mechanic. Calls you `"Boss"`. Must decline Whiterock offers. |

### 4.2 Whiterock (Vivian Cho) across the career

| Act / Hill | Vivian's move | Trade (sim-measured) |
|---|---|---|
| **I — Dutch Hill** | Scouts as a guest (DH6), then offers **$6,000** for a Balanced fare cap from Week 5 (open day 13 / legacy 18) if rep ≥ 50; or **$3,000** for the same cap at rep 40–49 so every player meets her. Offer copy quotes her actual measured scouting day (wait, snow, or cocoa). | Cash now vs fare ceiling |
| **II — Mount Tom** | Pass bus park-and-ride (MT2) | $400/Sat cash vs lot capacity & arrival dip |
| **II — Maple Valley** | Bids on the orchard parcel against Juniper's land trust | Parcel price vs losing land to Whiterock |
| **III — Snow Valley** | Her resort up the road runs the $29 Tuesday (SV2) | Shared guest pool |
| **III — Enchanted** | Leaves you alone (*"Too far north for a gondola payment"*); coffee over a storm reveals her rope-tow past | A breather; humanizes her |
| **III — Evergreen** | Holds the rival bid for the federal lease renewal | Covenant score vs her bid |
| **IV — Brodie** | Tries to poach Frank for Whiterock's snow team | Match +$60/day or Frank's talents slow |
| **IV — Whittier** | **The Coast Offer:** buys every hill you hold for one number | Ending decision (§8) |
| **Every winter after Hill 1** | Bids on one departed hill whose caretaker reputation dipped | Sell (cash now, dot turns Whiterock blue) or keep (income, risk) |

If **Tom Keene** is your founder, his variant arrives a night early: *"She called me first, {name}. She always calls me first."*

---

## 5. Mountain roster and progression

### 5.1 Roster by scale (D1, D5 locked: Hills 1–3 in M5, Hills 4–8 in M7)

| # | Hill | State | Act | Real vertical | Years | Start cash | Guests/day (game) | New mechanic |
|---|---|---|---|---|---|---|---|---|
| 1 | **Dutch Hill**, Heartwellville | VT | I | 570 ft | 1944–1985 | $12,000 | 12–48 | The core loop |
| 2 | **Mount Tom**, Holyoke | MA | II | 680 ft | 1962–1998 | $25,000 | 30–90 | **Night session** & guns from day 1 |
| 3 | **Maple Valley**, Dummerston | VT | II | 841–1,017 ft† | 1963–2000 | $35,000 | 40–100 | **Season-long school program**, tubing, orchard parcel |
| 4 | **Snow Valley**, Winhall | VT | III | 900 ft† | ~1941–1984 | $45,000 | 50–110 | **Riders** & shared guest pool |
| 5 | **Enchanted Mountain**, Jackman | ME | III | ~1,000 ft† | ~1966–1974 | $50,000 | 30–80 | **Wind & storm road closures** |
| 6 | **Evergreen Valley**, Stoneham | ME | III | 1,050 ft† | 1972–1982 | $65,000 | 50–120 | **Federal lease covenant** |
| 7 | **Brodie**, New Ashford | MA | IV | 1,250 ft | 1964–2002 | $90,000 | 80–170 | **Night skiing at scale & events** |
| 8 | **Mount Whittier**, West Ossipee | NH | IV | 1,100–1,650 ft† | ~1949–1985 | $120,000 | 80–200 | **Gondola & two bases** |

**Cut from roster (D1):** Tenney Mountain, NH (operating) and Crotched West, NH (operating Vail resort). **Hogback, VT:** Lore & locked Atlas pin only.

### 5.2 Hill Locals (Caretakers)

- **Mount Tom:** **Lou Carvalho** — Holyoke electrician who wired the old lights.
- **Maple Valley:** **Rosa Merrill** — Dummerston school principal running the district ski program.
- **Snow Valley:** **Kip "Duct-Tape" Lavoie** — board-shop owner who rode the '83 nationals.
- **Enchanted:** **Gilles "Gilly" Fortin** — Jackman snowmobile club & border-crossing guide.
- **Evergreen Valley:** **Ranger Ada Whitcomb** — district ranger holding the federal lease.
- **Brodie:** **Mae Donnelly** — events organizer who ran the green-snow torchlight parade.
- **Mount Whittier:** **Walt Gagnon** — retired gondola mechanic who knows the Route 16 cable.

---

## 6. Why the next mountain, and what happens to the old one

### 6.1 The phone call (N9)

At Winter Review, if solvent (`liquidNetWorth >= 0`), a phone call arrives referencing what your winter actually measured, and Maris reports Whiterock's option on the land:
- **To Mount Tom:** *"Lou Carvalho from Holyoke called. Says anybody who moved {busiestDayArrivals} skiers through Dutch Hill with a {bestSatWait}-minute wait can figure out his lights. Maris adds: Whiterock has an option on the Mount Tom land that runs out in April."*
- **To Maple Valley (if Readsboro delivered all 6 lessons):** *"Rosa Merrill from Dummerston called—Al Waters gave her your number. Six-for-six on school lessons turned heads across the river. Whiterock's sniffing around Maple Valley's orchard parcel too."*

From Act II on, the **Atlas** (M5 row 35) lets you pick between unlocked calls.

### 6.2 Caretakers & Lost Hills (row 37, N10)

- On leaving a hill, pick one of two named allies (that hill's local or your founder / Elena) as **Caretaker**.
- Each caretaker has a policy bias (e.g., *Neighborhood*: cheap fares & family mood; *Snow Crew*: high snow service & upkeep) driving the **coarse off-screen sim**.
- **Income:** Paid at each winter review as a caretaker line in the **Ledger** (row 38).
- **Homecoming card:** At the start of a new winter, one card per departed hill shows the caretaker's measured winter and voice.
- **Whiterock pressure:** If a departed hill's coarse reputation dips below 45, Vivian bids on it. Sell (cash now, Atlas dot turns Whiterock blue, income stops) or keep (income continues, risk repeats).
- **Lost hills (D4):** Winter 1 bankrupt = replay Dutch Hill. Later hill bankrupt = hill is lost (Atlas dot turns Whiterock blue if Vivian bid, else forest green), career continues from remaining hills. 0 hills left = **The Forest** epilogue.

### 6.3 Boundary with Capitalist Mode

Shared/mode-neutral: mountain definitions, Atlas map data, coarse off-screen sim, Ledger. Story-only (`mode: "story"`): player profile, Nan, founder relationship lines, Vivian's arc, beats/surprises copy, caretaker names, calls, endings.

---

## 7. Endings (N18)

| Ending | Condition | Epilogue |
|---|---|---|
| **The Co-op** | Decline the Coast Offer & hold ≥ half the career hills | The caretakers form the Route 100 Co-op with one shared pass. Nan's card is framed in the Dutch Hill lodge. If you declined every Whiterock offer in the career, Vivian quits and runs a rope tow in Worcester County. |
| **The Sale** | Accept the Coast Offer | A big check, your hills on the Whiterock map, honest results: shorter lines, higher fares, Dutch Hill open seven days. Vivian sends a postcard of a gondola. |
| **Going Alone** | Decline with < half the hills yours | A small independent chain, surrounded. Whiterock keeps calling every spring. |
| **The Forest** | 0 hills left at any point | The meadows grow back. Someone in the valley keeps a punch card with one ride left. |

---

## 8. Roadmap (N track + M5)

### M4 Narrative (N1–N8)
- **N0 ☑** `STORY.md` v2.0, `WORLD.md`, `MASTER_PLAN.md` aligned; D1–D6 locked; Whiterock unified.
- **N1 ☐** Cold open v2 (6 cards, punch-card flip & title drop, optional lease name `operatorName`, captions + audio fallback).
- **N2 ☐** Partners & address (founder relationship lines, day-1 cold read, `{name}` / `"the operator"` substitution across Maris/Vivian/Al/Nan, Whiterock copy revamp).
- **N3 ☐** The last chair (first-ride toast, final-day 15:45 toast + camera ease, punch-card outcome line in Winter Review, replace Tenney placeholder with next-hill call preview).
- **N4 ☐** Surprise scheduler (CAL-1 Week 1–7 pacing + 28-day legacy compatibility, 1 radio item/night priority queue, 2/week cap, 1 threat/5 days cap).
- **N5 ☐** Dutch Hill surprise pack (DH2 copy, DH4, DH5 snow-day mix override, DH9, DH10 Nan call-in, DH11 skin tracks, DH12 guns branch).
- **N6 ☐** Vivian skis Dutch Hill (DH6 visitor guest with measured facts, offer copy quotes her day, rep ≥ 50 $6k + rep 40–49 $3k offer).
- **N7 ☐** Decision surprises (DH7 Bennington club bus + DH8 groomer threw a track with $250 road-crew fix).
- **N8 ☐** Last Saturday (DH13 set piece: night-before preview, arrival bonus, torchlight visual, Nan cameo).

### M5 Career (Hills 1–3, N9–N10, rows 34–38)
- **34 ☐** Mountain definitions as data (Dutch Hill, Mount Tom, Maple Valley + story tables).
- **35 ☐** Atlas tab (F5): New England career map with 3-color dots, locked Hogback/Act III–IV pins, heritage cards with your winter's line.
- **N9 ☐** The call: Winter Review phone call from measured results (Lou Carvalho / Rosa Merrill) + branching selection.
- **36 ☐** Mount Tom, MA: Night session (lights building + evening tile) & guns from day 1, MT1–MT3, Lou Carvalho.
- **37 ☐** Caretaker: named ally pick, policy bias on coarse off-screen sim, homecoming card, Vivian bids on weak departed hills.
- **38 ☐** Ledger: fuller income statement, balance, and caretaker income lines on Money tab.
- **N10 ☐** Lost hills (D4) + Maple Valley, VT (or Maple Valley bundled cleanly with M5): district school program, tubing, orchard parcel bid, Inspector's Tuesday, Rosa Merrill.
