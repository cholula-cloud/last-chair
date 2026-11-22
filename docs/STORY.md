# Last Chair Story Mode

**Version:** 2.1 · **Updated:** 2026-11-22 · **Status:** Locked (D1–D6, calendar, upfront economy & cast finalized)

**Scope.** This document covers **Story Mode** only: the career from Dutch Hill onward, played in the Simple ruleset (you build and set two nightly levers, fare and snow & service; the crew runs operations). **Sandbox (M6) and Capitalist Mode (M8, head-to-head against Whiterock) are separate modes added later and do not use this story.** Sandbox has story off. Capitalist Mode may reuse the hills and the rival company, and uses none of the characters, beats, surprises or endings written here. §6.3 lists the boundary.

**Authority.** [MASTER_PLAN.md](./MASTER_PLAN.md) wins on product scope. This file wins on Story Mode narrative: who the player is, the cast, beats, surprises, the mountain roster, copy and the endings. [WORLD.md](./WORLD.md) keeps the lore pantry and the legal and respect line. [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) keeps every number. The rule from WORLD.md holds: when story and sim disagree, the sim wins.

---

## 0. Decisions in one screen (all locked)

1. **The player is a person (D2, locked).** You grew up in Readsboro. Your grandmother, **Grammy Dot** (Dorothy), sold tickets at Dutch Hill for thirty winters in a wool sweater with a thermos of hot cider, and kept the last punch card from 1984–85 with one ride left on it. You spent ten winters on a snowmaking crew up north until **Whiterock** (our private-equity megapass) bought the mountain, automated the night guns, and put the crew on a timer. **Sloane Prescott** signed that memo and offered you a desk job. You took your toolbox and came home. The $12,000 in the till is your savings plus Grammy Dot's coffee can.
2. **Optional name on the lease (D3, locked).** In the Cold Open, you can sign your name on the town lease (24 characters max, text-only, never voiced) or click *"Just write 'the operator'"*.
3. **The founder is your partner.** The pick reads *"Who's signing the lease with you?"* Each founder has a wry, personal line about how they know you.
4. **"Last Chair" gets a meaning.** Grammy Dot's punch card is the title. Every winter ends with the last chair at 3:45 on the final day and the card gets punched. A failed winter leaves the ride on the card.
5. **Calendar & Economy (locked).** Dutch Hill runs **6 Fri–Sun weekends (18 playable days / 42 civil days)** so it stays punchy before the hill goes stale; Mount Tom, Maple Valley, and Act II–IV hills run **7 Fri–Sun weekends (21 playable days / 49 civil days)**. All lifts, venues, and upgrades are paid **100% upfront** (no 40/30/30 installment schedule). Quiet-weekday surprises (DH2, DH5) fire on non-holiday Fridays.
6. **Sloane is felt all winter.** She skis your hill as a real guest in the sim before she makes an offer, and her offer quotes her own measured day. She appears in every winter of the career with a different, bigger trade.
7. **Roster: eight real lost hills, Dutch Hill the smallest (D1, D5, locked).** Dutch Hill (VT), Mount Tom (MA), Maple Valley (VT), Snow Valley (VT), Enchanted Mountain (ME), Evergreen Valley (ME), Brodie (MA), Mount Whittier (NH). **Tenney** and **Crotched West** are cut (both operating today). **Hogback** (VT) stays as lore only. **Rollout (D5):** Ship 3 hills first (Dutch Hill, Mount Tom, Maple Valley in M5), and hills 4–8 in M7 once guest scaling (N12) lands.
8. **You never abandon a hill (D4, locked).** When you move on, a named local ally runs it as caretaker on the coarse off-screen sim, it pays you a little, and Sloane bids on it if reputation slips. If a later hill goes bankrupt, its Atlas dot turns Whiterock blue or forest green and the career continues from your remaining hills (`The Forest` ending only when 0 hills remain).
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
| **N4** | **The pass is always in the rearview mirror.** Whiterock is a reasonable, well-funded private-equity pass that shows up every winter with a priced trade. | Sloane appears every winter whatever the player's reputation. Every offer has a measured cost and benefit. She is never a cartoon. |
| **N5** | **Dignified history, honest fiction, one lift ride long.** Real facts are true and credited; invented things are plainly ours; every beat reads on a phone in the time it takes to ride the T-bar. | One to three punchy sentences per radio item, one tap per decision, sourced facts on heritage cards, no invented scandal about real people or places. |

### 1.2 Tone & New England culture

Fun, light-hearted, engaging, and unmistakably Ice Coast—without turning into a cartoon accent parody. Lean deeply into real New England ski culture:
- **Arlberg & 10th Mountain grit:** Hannes Schneider's wedge lessons in Cranmore, WWII 10th Mountain riggers keeping bullwheels alive with mill-race discipline (James B. Francis: *"the headgate doesn't care about your feelings"*).
- **Road & corridor culture:** Route 100 mud-season frost heaves, creeping behind a state salt truck or milk tanker, Mass Pike & I-91 plates rolling up from Springfield and Hartford, Saturday regulars carrying boots in a milk crate.
- **Town-meeting economics vs. Boston private equity:** Whiterock talks in amortization schedules, regional yield, and "frictionless pass-holder throughput." Heartwellville talks in woodstove heat, cider donuts, volunteer firemen, and whether the T-bar ate a mitten today.
- **Copy rule (`ART_DIRECTION.md`):** Zero em dashes (`—`) and zero middle dots (`·`) in player-facing strings.

---

## 2. Who the player is

### 2.1 The protagonist

| Question | Answer |
|---|---|
| Who | A Readsboro kid, now about 35. Optional name on the lease (24 chars max, letters/spaces/apostrophes/hyphens). Default in text: `"the operator"`. No portrait, no gender, no stated age on screen. |
| History | Learned to ski on the town rope tow because Dutch Hill closed before you were born. Spent ten winters on a snowmaking crew up north until **Whiterock** bought the resort, automated the night guns, and put the night shift on a timer. **Sloane Prescott** signed the layoff memo and offered you a spreadsheet job. You took your wrench and came home. |
| Why this hill | **Grammy Dot** sold tickets at Dutch Hill for thirty winters. She kept the last punch card from 1984–85. It has one ride left on it. |
| What you bring | You know snow and you know lifts. That is why you can build and why the crew listens. |
| What you lose if it fails | $12,000: your savings plus Grammy Dot's coffee can. The town's one-winter lease, which goes back to the forest. Face in a valley where everybody recognizes your truck at the general store. |

### 2.2 The founder is a partner

Each founder has one relationship line shown above their bonus on the pick card:

| Founder | Relationship line |
|---|---|
| **Elena Vargas** | "Taught your mom to snowplow on Dutch Meadows. Still uses your middle name when the lift line gets sloppy." |
| **Tom "Ledger" Keene** | "Wrote small-hill loans for thirty winters. Says this one is either his masterpiece or his excuse to buy a camper." |
| **Riley Otis** | "Rebuilt your first pickup and your second one. Wouldn't sell a rusted cotter pin to Whiterock." |
| **Dr. Amira Chen** | "Moved up Route 100 for 'the quiet.' Reads a barometer better than Boston reads the morning news." |
| **Juniper Hale** | "Runs the land trust meetings with a thermos and a grease pencil. Knows every sugar maple on the ridge." |
| **Marco Russo** | "Threw the best pig roast Wilmington ever saw. Also the only one that needed a town selectboard bylaw afterward." |

### 2.3 The intro (Cold Open v2)

Target: ~70 seconds of cards, 20–40 seconds on the founder pick, then the hill. Keeps captions, Skip, keyboard advance, and tap-to-advance from `ColdOpen.tsx`.

| # | Card | Status | Caption (Maris Shaw) | Interaction |
|---|---|---|---|---|
| 1 | `closed` | Keep + keep audio | "Dutch Hill ran from 1944 to 1985. Then the lifts stopped." | Tap to advance |
| 2 | `burned` | Keep + keep audio | "In 1990 the lodge burned. The forest started taking the slope back." | Tap to advance |
| 3 | `shoebox` | **New** (tappable punch card) | "Grammy Dot sold tickets here for thirty winters. She kept the last punch card, with one ride left on it." | **Tap the card** to flip it and show the unpunched square. **"LAST CHAIR"** drops in for one beat. |
| 4 | `nightcrew` | **New** | "You made snow up north for ten winters. Then Whiterock bought the mountain and put the night crew on a timer." | Tap to advance |
| 5 | `lease` | **Rewrite** | "Heartwellville will lease you Dutch Hill for one winter. Twelve thousand in the till. Most of it is yours, and the rest came out of Grammy Dot's coffee can." | **Sign the lease:** optional name input (*"Your name, if you want it on the lease"*), **"Sign it"**, secondary **"Just write 'the operator'"**. |
| 6 | `pick` | Rewrite | "Nobody runs a hill alone. Who is signing with you?" | Button: **"Choose a founder"** |

**Day 1 Cold Read (Route 100 Radio, text-only, before first-lift tip):**
> "Morning, Route 100. Word at the general store is {name} came home from up north and signed for Dutch Hill. Lodge lights are on. Lifts aren't. Yet."

### 2.4 How people address the player

| Who | Address | Sample |
|---|---|---|
| **Maris Shaw** (radio, text) | Name or `"the operator"` | "{name} had the T-bar turning by nine. First time since '85, and it didn't even eat a mitten." |
| **Grammy Dot** (radio call-ins, text) | First name, or `"hon"` | "Hon, Dutch Meadows always glazed over right by the J-bar. Your grandfather had a whole vocabulary for that corner." |
| **Riley Otis** | `"Boss"` | "Boss, the T-bar sounds like a coffee grinder full of gravel. She'll run." |
| **Frank Oka** | `"Kid"` | "Groomer threw a track, kid. She'll live. Just not tonight." |
| **Chief Dana Holt** | `"Operator"` (radio formal) | "Operator, wind's kicking up on the crest. We're holding the chair." |
| **Elena Vargas** | First name | "The Readsboro kids are coming Friday, {name}. Keep the bunny slope soft." |
| **Sloane Prescott** | First name, Boston PE smooth | "{name}, I skied it Saturday. Seven-minute wait, decent corduroy, zero cocoa. I can solve two of those before lunch." |
| **Supt. Hank Pelletier** | `"Operator"` in letters, first name when pleased | "Six pupils, six Arlberg turns. I'm telling the school board you're officially a grown-up, {name}." |

### 2.5 The Last Chair bookend

- **First ride (Day 1):** Toast when the first paid guest boards: *"First ride since 1985. Grammy Dot's card stays in your pocket till closing day."*
- **Final day (15:45 on last operating day):** Toast + gentle camera ease to the primary lift (skipped if reduced motion is on): *"Last chair. That one's yours."*
- **Winter Review punch-card line:**
  - Solvent: *"Grammy Dot's card: punched."*
  - Insolvent but finished: *"Punched. The bills outlasted the snow, but you rode it."*
  - Bankrupt: *"Grammy Dot's card still has one ride on it. Keep it."*

---

## 3. Surprise and challenge catalog

### 3.1 Rules for every surprise

1. Starts from a recorded sim condition. Never moves a number the day's rules wouldn't move.
2. Has an operating response where one exists; results show in the next recap through normal settlement.
3. Fires at most once per winter unless marked repeatable.
4. Rolls stay seeded per day (`STREAM.SURPRISE`) so replays match.

### 3.2 Pacing on the Fri–Sun Operating Calendar

- **Dutch Hill (Act I):** **6 Fri–Sun weekends** (18 playable operating days / 42 civil days, Dec 26 to Feb 5).
- **Mount Tom, Maple Valley & Act II–IV hills:** **7 Fri–Sun weekends** (21 playable operating days / 49 civil days, Dec 26 to Feb 12).
- **Mon–Thu:** Simulated in the background (`advanceClosedDays`) with a **Weekday Digest** on Friday morning.
- **Scheduler caps:** At most **1 radio item per night** (priority: decision card > set piece > midpoint reversal > story beat > surprise; displaced items wait 1 night, then drop). At most **2 surprises in any 7 civil days**, and **1 threat in any 5 days**. Quiet on operating day 1 and on decision-card nights.

| Dutch Hill Week (6-wk) | Larger Hill Week (7-wk) | Week Job | Beats & Surprises |
|---|---|---|---|
| **Week 1 (Open 1–3)** | **Week 1 (Open 1–3)** | Learn the hill | Cold read, First uphill load, Saturday crowd. At most 1 warm/funny item; threats only from weather. |
| **Week 2 (Open 4–6)** | **Weeks 2–3 (Open 4–9)** | Grow | School bus (when gated), Sloane scouting (DH6 on Sat/Sun), Bennington club bus (DH7). |
| **Week 3 (Open 7–9)** | **Week 4 (Open 10–12)** | **Midpoint turn** | Dry week if gated, 1 reversal (DH8 Groomer threw a track or DH9 January thaw). Counts toward weekly cap. |
| **Weeks 4–5 (Open 10–15)** | **Weeks 5–6 (Open 13–18)** | Pressure | Sloane's Whiterock offer (from Open Day 10 on Dutch Hill / Open Day 13 on larger hills), Grammy Dot calls in (DH10), loan tension. |
| **Week 6 (Open 16–18)** | **Week 7 (Open 19–21)** | **Climax** | Last Saturday (DH13 set piece), final Sunday Last Chair, Winter Review, Next-Hill Call. |

### 3.3 Dutch Hill catalog (13)

Kinds: **W** warm, **F** funny, **T** threat, **L** lore, **R** reversal, **S** set piece, **D** decision.

| ID | Name | Kind | Trigger (sim condition) | Copy / Player sees | Operating response |
|---|---|---|---|---|---|
| **DH1** | Pie on the counter | W F | 2% a day from operating day 2 | *"Someone left a warm maple cream pie on the lodge counter with a sticky note: 'For the lifties.' The crew split it before the ink dried."* | None (morale flavor) |
| **DH2** | Old tracks, new turns | W | Quiet non-holiday Friday, 6% | 3–5 returning regulars arrive. *"Three folks who learned to wedeln here in '76 pulled in before nine. One tried to hand the window a six-dollar bill 'just like '85.'"* | Fare |
| **DH3** | Slow going on Route 100 | T | 8% on non-thaw days | Morning arrivals delayed until plow clears. *"State plow's creeping behind a milk tanker on Route 100. {count} skiers rolled in late once the salt hit."* | Early Plow talent later |
| **DH4** | Thaw Monday, ice Wednesday | T | Thaw day followed by clear day leaves ≥ 2 lower segments in Ice | *"Thawed yesterday, froze boilerplate by midnight. Route 100 rule of thumb: sharpen your edges or crank the groomer tonight."* | Mid/High groom or Cheap fare |
| **DH5** | Snow day | W T | Storm forecast on a non-holiday Friday, seeded 40% | *"Readsboro called off school. Every kid with a Flexible Flyer and a cousin with a Subaru is pointed up the driveway."* Uses holiday guest mix. | Fare, snow tier, capacity |
| **DH6** | The visitor in a very clean jacket | F, antagonist | Reputation ≥ 40, Sat or Sun in Weeks 2–3 | Guest `"Visitor in a very clean jacket"` (Sloane) skis your hill. Night: *"Black Range Rover with Massachusetts plates. Rode the lift six times, timed the line on her watch, skipped the hot cider. Draw your own conclusions."* | Follow her; fix whatever her "Why?" flags |
| **DH7** | The Bennington club bus | D | Saturday closed with mean wait ≤ 5 min and satisfaction ≥ 70 | Night card: Bennington Ski Club asks to bring 10 skiers next Saturday at $10 under Balanced. *"Bennington Ski Club wants to charter a bus next Saturday. Ten skiers if you can keep the line under five minutes."* | Accept or decline |
| **DH8** | Groomer threw a track | T R D | Midpoint window (Week 3, seasons ≥ 21d), ≥ 2 Mid/High nights with ≥ 1 High in last 4 | Frank: *"Groomer threw a track over on the Windmill side, kid. She'll live. Just not tonight."* Tonight grooms nothing at any preset unless you pay $250 to borrow the town road crew's machine. | Pay $250, or skip grooming / lower fare |
| **DH9** | The January thaw | T R | Forecast run of ≥ 2 thaw days starting in/after Week 2 | *"Warm air from Jersey is parked over the Green Mountains for a couple days. Watch the lower meadows before they turn to mashed potatoes."* | Snow tier, close lower trail, fare |
| **DH10** | Grammy Dot calls in | W L | First Sunday after reputation ≥ 60 (or Heritage Sign learned) | *"Caller on line one, says she's your grandmother. 'Hon, Dutch Meadows always glazed over by the J-bar. Your grandfather had a whole vocabulary for that corner.'"* | None (heritage warmth) |
| **DH11** | Skin tracks at dawn | L | Morning after a storm that added depth, with Minimal service the night before | *"Skin tracks up the Windmill side before the bullwheel turned. Backcountry folks kept hiking this hill after '85. Nice to see them ride past a lodge with the lights on."* | Groom on powder nights or leave soft |
| **DH12** | Dry week | T | 3+ days without snow and depth < 0.35 | Branched on `guns.length`: with guns, *"Dry stretch out there. Guns need cold air to bite, so fire 'em when the mercury drops."* Without guns: *"Dry stretch, and no snow guns yet. Hold for cold or rope off the lower third before it browns out."* | Close lower trail, cheap fare, Tier 2 for guns |
| **DH13** | **Last Saturday** | S | Final Saturday of the winter, if not bankrupt | Night before: *"Whole valley's coming tomorrow. Plates from Bennington to Brattleboro, plus half of Readsboro."* Day: holiday mix + rep-scaled arrival bonus, torchlight at close, Grammy Dot in the lodge if rep ≥ 60. | Fare, snow, capacity |

### 3.4 Later-hill catalog (12)

| ID | Hill | Name | Kind | Trigger | Player sees | Response |
|---|---|---|---|---|---|---|
| **MT1** | Mount Tom | Dry up north | W T | Guns running & regional north-dry flag | Connecticut and Hartford plates flood I-91; arrivals jump, long lines | Raise fare, run night session |
| **MT2** | Mount Tom | The Whiterock shuttle | D, antagonist | Saturdays from Week 2 | Sloane offers $400/Sat to use your lot as a park-and-ride for Whiterock's express bus north | Accept (cash, fewer stalls, Sat arrival dip) or decline |
| **MT3** | Mount Tom | **Lights on the Range** | S | First clear Friday night session with lights built | The whole Pioneer Valley sees the traprock ridge lit from I-91; after-work crowd doubles | Night fare & service |
| **MV1** | Maple Valley | Inspector's Tuesday | T | State lift inspection on seeded day; oldest under-serviced lift flagged | Dana reads the Vermont tramway inspection notice the night before | Pay $600 repair tonight or close lift 1 day |
| **MV2** | Maple Valley | **Tubing Saturday** | S | Final Saturday with tubing hill built | Windham District school families bring younger siblings | Tubing capacity & fare |
| **SV1** | Snow Valley | Boards on the T-bar | D | First weekend with Rider persona | Saturday Regulars grumble; riders want wide trails | Welcome riders or keep skiers-only Sunday |
| **SV2** | Snow Valley | The $29 Tuesday | T R | Midpoint; Whiterock's resort up the road runs a promo | Weekday arrivals dip | Cheap fare, school days, events |
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
| **Maris Shaw** | Story delivery | Route 100 Radio morning-show veteran (Concord, NH). Warm, gabby, weather proverbs, town-meeting gossip, says "Wooster" wrong on purpose. Uses `{name}` or `"the operator"`. |
| **Grammy Dot** | Reputation, heritage, Last Chair | Your grandmother Dorothy (fiction). Sold tickets at Dutch Hill for 30 winters. Text-only radio call-ins once or twice a winter. |
| **Sloane Prescott** | Whiterock (outside money) | Managing Director of Mountain Acquisitions at **Whiterock** (**Whiterock Pass**). Boston/Greenwich PE smooth ("amortizing a gondola", "predictable price point"), secretly learned to ski on a lost rope tow that closed when she was nine. |
| **Frank Oka** | Grooming, snowmaking | Gruff, diesel-stained, fond of the groomer and mill-race engineering. Calls you `"kid"`. Owns DH8. |
| **Chief Dana Holt** | Patrol, wind holds, inspections | Calm, deadpan, safety first. Calls you `"Operator"`. Owns snow day & lift inspections. |
| **Elena Vargas** | Schools, families, heritage | Warm, teacherly, knows every bus driver and Arlberg turn. Owns school & club bus cards. |
| **Supt. Hank Pelletier** | School contracts | Readsboro Superintendent & your 4th-grade principal. His reference brings Maple Valley's call. |
| **Riley Otis** | Founder only | 10th Mountain disciplined rigger & lift mechanic. Calls you `"Boss"`. Must decline Whiterock offers. |

### 4.2 Whiterock (Sloane Prescott) across the career

| Act / Hill | Sloane's move | Trade (sim-measured) |
|---|---|---|
| **I — Dutch Hill** | Scouts as a guest (DH6), then offers **$6,000** for a Balanced fare cap from Week 4 (open day 10+) if rep ≥ 50; or **$3,000** for the same cap at rep 40–49 so every player meets her. Offer copy quotes her actual measured scouting day (wait, snow, cocoa). | Cash now vs fare ceiling |
| **II — Mount Tom** | Whiterock shuttle park-and-ride (MT2) | $400/Sat cash vs lot capacity & arrival dip |
| **II — Maple Valley** | Bids on the orchard parcel against Juniper's land trust | Parcel price vs losing land to Whiterock |
| **III — Snow Valley** | Her resort up the road runs the $29 Tuesday (SV2) | Shared guest pool |
| **III — Enchanted** | Leaves you alone (*"Too far north for a gondola payment"*); coffee over a storm reveals her rope-tow past | A breather; humanizes her |
| **III — Evergreen** | Holds the rival bid for the federal lease renewal | Covenant score vs her bid |
| **IV — Brodie** | Tries to poach Frank for Whiterock's snow team | Match +$60/day or Frank's talents slow |
| **IV — Whittier** | **The Coast Offer:** buys every hill you hold for one number | Ending decision (§7) |
| **Every winter after Hill 1** | Bids on one departed hill whose caretaker reputation dipped below 45 | Sell (cash now, dot turns Whiterock blue) or keep (income, risk) |

If **Tom Keene** is your founder, his variant arrives a night early: *"She called me first, {name}. Whiterock always calls the banker first."*

---

## 5. Mountain roster and progression

### 5.1 Roster by scale (D1, D5 locked: Hills 1–3 in M5, Hills 4–8 in M7)

| # | Hill | State | Act | Real vertical | Years | Start cash | Calendar | New mechanic |
|---|---|---|---|---|---|---|---|---|
| 1 | **Dutch Hill**, Heartwellville | VT | I | 570 ft | 1944–1985 | $12,000 | 6 wknds (18 open) | The core loop |
| 2 | **Mount Tom**, Holyoke | MA | II | 680 ft | 1962–1998 | $25,000 | 7 wknds (21 open) | **Night session** & guns from day 1 |
| 3 | **Maple Valley**, Dummerston | VT | II | 841–1,017 ft† | 1963–2000 | $35,000 | 7 wknds (21 open) | **Season-long school program**, tubing, orchard parcel, Inspector's Tuesday |
| 4 | **Snow Valley**, Winhall | VT | III | 900 ft† | ~1941–1984 | $45,000 | 7 wknds | **Riders** & shared guest pool |
| 5 | **Enchanted Mountain**, Jackman | ME | III | ~1,000 ft† | ~1966–1974 | $50,000 | 7 wknds | **Wind & storm road closures** |
| 6 | **Evergreen Valley**, Stoneham | ME | III | 1,050 ft† | 1972–1982 | $65,000 | 7 wknds | **Federal lease covenant** |
| 7 | **Brodie**, New Ashford | MA | IV | 1,250 ft | 1964–2002 | $90,000 | 7 wknds | **Night skiing at scale & events** |
| 8 | **Mount Whittier**, West Ossipee | NH | IV | 1,100–1,650 ft† | ~1949–1985 | $120,000 | 7 wknds | **Gondola & two bases** |

**Cut from roster (D1):** Tenney Mountain, NH (operating) and Crotched West, NH (operating Vail resort). **Hogback, VT:** Lore & locked Atlas pin only.

### 5.2 Hill Locals (Caretakers)

- **Mount Tom:** **Lou Carvalho** — Holyoke electrician who wired the old range lights.
- **Maple Valley:** **Rosa Merrill** — Dummerston school principal running the Windham District ski program.
- **Snow Valley:** **Kip "Duct-Tape" Lavoie** — board-shop owner who rode the '83 nationals in Sorel boots.
- **Enchanted:** **Gilles "Gilly" Fortin** — Jackman snowmobile club & border-crossing guide.
- **Evergreen Valley:** **Ranger Ada Whitcomb** — district ranger holding the federal lease.
- **Brodie:** **Mae Donnelly** — events organizer who dyed three acres of snow green with a fire hose.
- **Mount Whittier:** **Walt Gagnon** — retired gondola mechanic who can diagnose a cable splice from Route 16.

---

## 6. Why the next mountain, and what happens to the old one

### 6.1 The phone call (N9)

At Winter Review, if solvent (`liquidNetWorth >= 0`), a phone call arrives referencing what your winter actually measured, and Maris reports Whiterock's option on the land:
- **To Mount Tom:** *"Lou Carvalho from Holyoke called. Says anybody who moved {busiestDayArrivals} skiers through Dutch Hill with a {bestSatWait}-minute wait can handle his range lights. Maris adds: Whiterock has an option on the Mount Tom traprock ridge that expires in April."*
- **To Maple Valley (if Readsboro delivered all 6 lessons):** *"Rosa Merrill from Dummerston called. Hank Pelletier gave her your number after six-for-six on school lessons turned heads across Windham County. Whiterock is sniffing around Maple Valley's orchard parcel too."*

From Act II on, the **Atlas** (M5 row 35) lets you pick between unlocked calls. **Town match:** `winterScore` 60–79 adds +10% starting capital bonus; 80+ adds +20%.

### 6.2 Caretakers & Lost Hills (row 37, N10)

- On leaving a hill, pick one of two named allies (that hill's local or your founder / Elena) as **Caretaker**.
- Each caretaker has a policy bias (`Neighborhood`: cheap fares & family mood; `Snow Crew`: high snow service & upkeep) driving the **coarse off-screen sim**.
- **Income:** Paid at each winter review as a caretaker line in the **Ledger** (row 38).
- **Homecoming card:** At the start of a new winter, one card per departed hill shows the caretaker's measured winter and voice.
- **Whiterock pressure:** If a departed hill's coarse reputation dips below 45, Sloane bids on it. Sell (cash now, Atlas dot turns Whiterock blue, income stops) or keep (income continues, risk repeats).
- **Lost hills (D4):** Winter 1 bankrupt = replay Dutch Hill. Later hill bankrupt = hill is lost (Atlas dot turns Whiterock blue if Sloane bid, else forest green), career continues from remaining hills. 0 hills left = **The Forest** epilogue.

### 6.3 Boundary with Capitalist Mode

Shared/mode-neutral: mountain definitions, Atlas map data, coarse off-screen sim, Ledger. Story-only (`mode: "story"`): player profile, Grammy Dot, founder relationship lines, Sloane's arc, beats/surprises copy, caretaker names, calls, endings.

---

## 7. Endings (N18)

| Ending | Condition | Epilogue |
|---|---|---|
| **The Co-op** | Decline the Coast Offer & hold ≥ half the career hills | The caretakers form the Route 100 Co-op with one shared pass. Grammy Dot's card is framed in the Dutch Hill lodge. If you declined every Whiterock offer in the career, Sloane quits and runs a rope tow in Worcester County. |
| **The Sale** | Accept the Coast Offer | A big check, your hills on the Whiterock map, honest results: shorter lines, higher fares, Dutch Hill open seven days. Sloane sends a postcard of a gondola. |
| **Going Alone** | Decline with < half the hills yours | A small independent chain, surrounded. Whiterock keeps calling every spring. |
| **The Forest** | 0 hills left at any point | The meadows grow back. Someone in the valley keeps a punch card with one ride left. |

---

## 8. Roadmap (N track + M5)

- **N0 ☑** Docs finalized (`STORY.md` v2.1, `WORLD.md`, `MASTER_PLAN.md`, `SIMULATION_SPEC.md`).
- **0b ☑** Upfront 100% construction payments (remove 40/30/30 installments) & 6-weekend Dutch Hill calendar (18 open / 42 civil days) + 7-weekend Act II+ calendar (21 open / 49 civil days).
- **N1–N2 ☑** Cold open v2 (6 cards, punch-card flip & title drop, optional `operatorName`), founder relationship lines, Day 1 cold read, Whiterock/Sloane/Grammy Dot/Hank Pelletier copy revamp.
- **N3 ☑** The last chair (Day 1 first-ride toast, final-day 15:45 toast + camera ease, Winter Review punch-card line, Mount Tom call preview).
- **N4–N5 ☑** Surprise scheduler (Week 1–6/7 pacing, 1 item/night queue, caps) + Dutch Hill surprise pack (DH1–DH5, DH9–DH12).
- **N6–N8 ☑** Sloane scouting guest (DH6) + measured offer ($6k rep ≥50 / $3k rep 40–49), Bennington club bus (DH7), Groomer threw a track (DH8), Last Saturday (DH13).
- **34, 35, N9 ☑** Mountain roster data (`roster.ts`), Office Atlas SVG map + Heritage Cards (`OfficeAtlas.tsx`), Winter Review phone call & town match.
- **36, 37, 38, N10, N11 ☑** Mount Tom (MA) + Maple Valley (VT) hills & mechanics (`mountTom.ts`, `mapleValley.ts`), Caretaker coarse sim & Homecoming (`caretaker.ts`), Caretaker Ledger lines, Lost hills (D4) & The Forest epilogue.
