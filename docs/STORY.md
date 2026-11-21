# Last Chair Story Mode

**Version:** 1.0 · **Updated:** 2026-11-21

**Scope.** This document covers **Story Mode** only: the career from Dutch Hill onward, played in the Simple ruleset (you build and set two nightly levers, fare and snow & service; the crew runs operations). **Sandbox (M6) and Capitalist Mode (M8, head-to-head against the megapass) are separate modes added later and do not use this story.** Sandbox has story off. Capitalist Mode may reuse the hills and the rival company, and uses none of the characters, beats, surprises or endings written here. §6.4 lists the boundary.

**Authority.** [MASTER_PLAN.md](./MASTER_PLAN.md) wins on product scope. This file wins on Story Mode narrative: who the player is, the cast, beats, surprises, the mountain roster and the endings. [WORLD.md](./WORLD.md) keeps the lore pantry and the legal and respect line. [SIMULATION_SPEC.md](./SIMULATION_SPEC.md) keeps every number. The rule from WORLD.md holds: when story and sim disagree, the sim wins.

**Owner decisions.** Six items are **proposed, pending owner** and are labeled D1 to D6 wherever they appear. §10 lists each with its recommended default. Until the owner answers, build only the parts that do not depend on them, and treat the recommended default as the working assumption.

**Provenance.** Written from a read-only review of the repo at `main` (1692e91, MASTER_PLAN v2.7). Code behavior described in §1.2 is as of that commit.

---

## 0. Decisions in one screen

1. **The player is a person.** You grew up in Readsboro. Your grandmother, Nan, sold tickets at Dutch Hill and kept the last punch card from the 1984–85 winter with one ride left on it. You spent ten winters on a snowmaking crew at a big resort up north until Abominable Snowglomerate bought it and put the night shift on a timer. Vivian Cho signed that memo (**proposed, pending owner: D2**). The $12,000 in the till is your savings plus Nan's coffee can.
2. **The founder is your partner.** The pick already reads "Who's signing the lease with you?" Keep that frame and give each founder one line about how they know you.
3. **"Last Chair" gets a meaning.** Nan's punch card is the title. Every winter ends with the last chair at 3:45 on the final day and the card gets punched. A failed winter leaves the ride on the card.
4. **Surprises triple, with a pacing rule.** 25 surprises in the catalog (13 for Dutch Hill), at most one radio item per night, at most two surprises in any seven days, a midpoint turn on days 13–17 and a set piece on the final Saturday.
5. **Vivian is felt all winter.** She skis your hill as a real guest in the sim before she makes an offer, and her offer quotes her own measured day. She appears in every winter of the career with a different, bigger trade.
6. **Roster: eight real lost hills, Dutch Hill the smallest.** Dutch Hill (VT), Mount Tom (MA), Maple Valley (VT), Snow Valley (VT), Enchanted Mountain (ME), Evergreen Valley (ME), Brodie (MA), Mount Whittier (NH). **Tenney is cut** (reopened in 2018 and operated since; it is a living area). **Crotched West is cut** (rebuilt in 2003 as today's operating Crotched Mountain). **Hogback** (VT) stays as lore only; its vertical is smaller than Dutch Hill's. **Proposed, pending owner: D1.** Shipping all eight at once or three first is **D5**.
7. **You never abandon a hill.** When you move on, a named local ally runs it as caretaker on the coarse off-screen sim, it pays you a little, and Vivian bids on it. The Atlas map, with dots in three colors (yours, the pass, the forest), is the career scoreboard and decides the ending. Whether the career continues after a lost hill is **D4**.
8. **The next hill comes from a phone call.** A town calls because of something your winter measured, and Maris reports that Snowglomerate holds an option on that hill's land. Solvency is the sim-measured gate; the call is the story gate.
9. **Build the smallest thing first.** Cold open v2, the last-chair bookend, the surprise scheduler and the Vivian scouting visit land in M4 as rows N1 to N8. Hills and caretakers land in M5 and M7. The optional name on the lease is **D3**; the story voice budget is **D6**.

---

## 1. Audit

### 1.1 Narrative pillars

Method, from the two pillar articles (the ch0m5 page read in full; the Medium article returned HTTP 403 and was not read, see Limitations): a pillar names the experience and the feeling, is specific enough to settle an argument, and is used as a filter. An element that supports the pillars is developed; one that conflicts is cut or changed. These five sit under MASTER_PLAN's nine game pillars and never override them.

| # | Pillar | What it decides |
|---|---|---|
| **N1** | **Every beat starts on the hill.** A story moment fires from a recorded sim condition and either teaches a system or asks for a decision. | No beat on a timer alone. No beat whose only effect is text. A surprise that the sim cannot cause waits for the sim change |
| **N2** | **It's your name on the lease.** The player is a specific person from this valley with something to lose and someone to answer to. | Characters address the player. Failure costs something personal. The intro establishes the stake before the first lift |
| **N3** | **Neighbors, each with a job.** Every named character owns one system, speaks in their own voice and remembers what you did. | No character without a system. No system explained by an unnamed voice when a neighbor owns it. Lines reference measured results |
| **N4** | **The pass is always in the rearview mirror.** Abominable Snowglomerate is a reasonable, well-funded alternative that shows up every winter with a priced trade. | Vivian appears every winter whatever the player's reputation. Every offer has a measured cost and benefit. She is never a cartoon |
| **N5** | **Dignified history, honest fiction, one lift ride long.** Real facts are true and credited; invented things are plainly ours; every beat reads on a phone in the time it takes to ride the T-bar. | Three sentences per radio item, one tap per decision, sourced facts on heritage cards, no invented scandal about real people or places |

### 1.2 What the player experiences today, in order

Title screen (Continue, New winter, Load, Settings, Credits) → New winter → cold open: four stills with Maris Shaw voice-over and captions, about 22 seconds (`coldOpenCards.ts`): the hill ran 1944–1985; the lodge burned in 1990; "Heartwellville wants its hill back. The town has leased it to you, with $12,000 to start."; "Pick who runs it with you." → founder pick sheet titled "Dutch Hill, winter 1", subtitle "Who's signing the lease with you?", the winter goal, six founders with bonus and constraint → day 1 with coach tips (first lift, first trail) → first night recap with the fare and snow tiles → story beats at closing when gated (`readyStoryBeat` in `sim.ts`): First uphill load (one open lift and five runs), Saturday corridor (Saturday with 22 or more arrivals), School bus (Tier 2, ski school, a lesson delivered), Dry week (three days without snow and depth under 0.35), Vivian's offer (reputation 55 or more from day 18) → local surprises (`surprises.ts`): pie (2% a day), former regulars (6% on quiet midweek days), road delay (8% on non-thaw days), each at most once → winter review with "What the town remembers" → a Tenney Mountain card that says Tenney isn't open yet.

Measured frequency (SIMULATION_SPEC, 40 Adaptive winters): pie 19, former regulars 11, road delay 33. That is about 1.6 surprises per winter for a strong player. Vivian appeared in all 40 Adaptive winters. Strategies with mean satisfaction of 30 to 55 start at reputation 40 and drift toward their satisfaction, so many of those winters never reach 55 and never meet Vivian.

### 1.3 Pillar test of the current story

✓ supports, ✗ conflicts, ~ partial, – not relevant.

| Element | N1 | N2 | N3 | N4 | N5 | Verdict |
|---|---|---|---|---|---|---|
| Cold open, four stills, Maris VO | ~ | ✗ | ~ | ✗ | ✓ | **Change.** Keep cards 1 and 2 and their audio. Add the player and Nan. Name the stake |
| Founder pick | ✓ | ~ | ~ | ✓ | ✓ | **Change.** Keep mechanics. Add one relationship line per founder |
| Winter goal (solvency) | ✓ | ~ | – | – | ✓ | **Keep.** Add the personal stake to its copy on the strip once |
| First uphill load beat | ✓ | ~ | ✓ | – | ✓ | **Keep**, name the player in text |
| Saturday corridor beat | ✓ | – | ~ | – | ✓ | **Keep** |
| School bus and Readsboro visit | ✓ | ~ | ✓ | – | ✓ | **Keep.** Strongest existing beat. Grow it into Maple Valley's district program |
| Dry week beat | ✓ | – | ~ | – | ✓ | **Change.** The line mentions guns the player may not own yet; branch the line on `guns.length` |
| Vivian offer ($6,000 for a Balanced fare cap) | ✓ | ✗ | ✓ | ~ | ✓ | **Change.** Keep the trade. Precede it with the scouting visit, quote her measured day, and guarantee an appearance every winter (§4.3) |
| Riley must decline | ✓ | ✓ | ✓ | ✓ | ✓ | **Keep** |
| Pie, former regulars, road delay | ✓ | – | ~ | – | ✓ | **Keep** all three. Too few and too random: add the scheduler and the pack in §3 |
| Lodge tier radio lines | ✓ | – | ~ | – | ✓ | **Keep** |
| Crew talents framed by Frank, Dana, Elena | ✓ | – | ~ | – | ✓ | **Change.** Each crew member gets one winter-1 moment tied to their talent (§4.1) |
| Winter review, "What the town remembers" | ✓ | ~ | ✓ | ✓ | ✓ | **Keep.** Add the punch card line and the next-hill call |
| Tenney teaser ("isn't open yet") | ✗ | ✗ | – | – | ✗ | **Cut.** Dead end, and Tenney is operating today (§5.2). Replace with the call (§6) |
| Heritage card | ✓ | – | – | – | ✓ | **Keep.** Add one line written by your winter |
| Caretaker as idle income | ✗ | ✗ | ✗ | ✗ | ~ | **Change.** Named ally, measured coarse sim, Vivian bids (§6.3) |
| Founder story hooks in WORLD.md: Tom "Snowglomerate calls him first" | ✓ | ✓ | ✓ | ✓ | ✓ | **Keep**, wire in Act II (Tom variant of the Vivian offer) |
| Riley "Patrollog sidequests about wind holds" | ✗ | – | ✗ | – | – | **Cut.** Dana owns wind holds; game pillar 5 says the crew handles operations |
| Marco "Trampoline/Arena content later" | ✗ | – | – | – | – | **Cut.** Those venues are on MASTER_PLAN's not-planned list |
| Amira "Ledger & Cocoa" weather segments | ✓ | – | ✓ | – | ✓ | **Keep** as Maris radio flavor when Amira is the founder |
| Juniper land-trust arc | ✓ | – | ✓ | ✓ | ✓ | **Keep**, wire to Maple Valley's parcel bid |

### 1.4 What is missing, ranked by harm

| Rank | Gap | Hurts | Why it matters |
|---|---|---|---|
| 1 | **The player is a blank.** Nobody addresses you; nothing is yours to lose except a number | First hour | The first decision with stakes (fare on night 1) lands on a stranger. Pillar N2 fails in the first minute |
| 2 | **The title means nothing.** "Last Chair" is never paid off | First hour and winter end | No bookend. Winter review closes on a stat sheet |
| 3 | **Vivian can be missing.** Gate is reputation 55 from day 18; weaker players never meet the antagonist, and strong ones meet her once in the last third | First winter | Pillar N4 fails for the players who most need a reason to care |
| 4 | **About 1.6 surprises a winter, all random.** Days 8 to 28 have no designed story shape; there is no midpoint turn and no final-week climax in story terms | First winter | MASTER_PLAN §11 asks for "pressure rises, a decision lands mid-season". The weather does the work alone |
| 5 | **Named characters have no reason to be cared about.** Frank, Dana and Elena are talent labels; Al exists for one card | First winter | Pillar N3 fails; talents read as a menu |
| 6 | **The winter ends on a dead end.** The Tenney card says the next hill is not built | Winter end | MASTER_PLAN's success metric "the player wants mountain 2" has nothing to want |
| 7 | **The career has no reason to move.** Next hills are listed by act with no hook out of winter results and no fate for the old hill | Career | ICR has the same gap; our chance to differ (§7) |
| 8 | **Roster conflicts with the respect line.** Tenney operates today; Crotched West is now an operating Vail-owned area; Hogback is smaller than Dutch Hill | Before ship | WORLD.md Part 3 forbids implying anything about living areas |

---

## 2. Who the player is

### 2.1 The protagonist

Rows marked D2 and D3 are **proposed, pending owner**.

| Question | Answer |
|---|---|
| Who | A Readsboro kid, now about 35. Name optional, entered on the lease (D3). Default in text: "the operator". No portrait, no gender, no stated age on screen |
| History | Learned to ski on the rope tow at the town hill because Dutch Hill had closed before you were born. Spent ten winters on a snowmaking crew at a big resort up north. Abominable Snowglomerate bought that resort, automated the night guns and cut the crew. Vivian Cho ran the transition and offered you a desk job. You came home instead (D2) |
| Why this hill | Nan, your grandmother, sold tickets at Dutch Hill for thirty winters. She kept the last punch card from the 1984–85 winter. It has one ride left on it |
| What you bring | You know snow and you know lifts. That is why you can build and why the crew listens. It is also why the coach can talk to you as a peer |
| What you lose if it fails | $12,000: your savings plus Nan's coffee can. The town's one-winter lease, which goes back to the forest. Face in a valley where everyone reads the plates in the lot |
| Tie to Heartwellville | Nan (alive, about 85, lives in Readsboro, calls the radio). Elena taught your mother to snowplow if Elena is your founder; otherwise she knew Nan. Al Waters was your fourth-grade principal |

Respect line: Nan and her thirty winters are fiction. The real Dutch Hill had real owners and staff, and the game names and impersonates none of them. Nan's memories describe the hill and leave out the people who ran it. The heritage card keeps only sourced facts.

### 2.2 The founder is a lens

The founder pick already frames the founder as the person signing with you. Keep the six founders and their numbers unchanged. Add one relationship line each, shown above the bonus on the pick card and used by the radio.

| Founder | Relationship line |
|---|---|
| Elena Vargas | "Taught your mother to snowplow on Dutch Meadows. Still uses your middle name when she's serious." |
| Tom Keene | "Wrote small-hill loans for thirty years. Says this one is either his best or his last." |
| Riley Otis | "Rebuilt your first truck and your second one. Won't sell a single bolt to the pass." |
| Amira Chen | "Moved up the valley for the quiet. Reads the sky better than the radio does." |
| Juniper Hale | "Runs the land trust meetings. Knows exactly which trees the town will miss." |
| Marco Russo | "Threw the best party Wilmington ever had. Also the most expensive." |

### 2.3 The intro, under three minutes on a phone

Target: about 70 seconds of cards, 20 to 40 seconds on the founder pick, then the hill. Every card keeps captions, Skip and tap-to-advance from `ColdOpen.tsx`. Cards 4 and 5 depend on D2 and D3.

| # | Card | Status | Caption (voiced by Maris unless marked) | Interaction |
|---|---|---|---|---|
| 1 | `closed` | Keep, keep audio | "Dutch Hill ran from 1944 to 1985. Then the lifts stopped." | Tap to advance |
| 2 | `burned` | Keep, keep audio | "In 1990 the lodge burned. The forest started taking the slope back." | Tap to advance |
| 3 | `shoebox` | **New still**: a kitchen table, a shoebox, a ticket punch, a 1984–85 punch card | "Nan sold tickets at Dutch Hill for thirty winters. She kept the last punch card. One ride left on it." | **Tap the card** to flip it and show the unpunched square. The title drop: "LAST CHAIR" fades in over the card for one beat |
| 4 | `nightcrew` | **New still**: snow guns at night on a big resort, a hard hat on a hook | "You made snow on somebody else's mountain for ten winters. Then the new owners put the night crew on a timer." | Tap to advance |
| 5 | `lease` | **Rewrite** of `town`: the lease on the clerk's counter, a pen | "Heartwellville will lease you the hill for one winter. Twelve thousand dollars in the till. Most of it's yours. The rest came out of Nan's coffee can." | **Sign the lease:** optional name field (label "Your name, if you want it on the lease"), button "Sign it". Secondary: "Just write 'the operator'". 24 characters max, letters, spaces, apostrophes, hyphens |
| 6 | `pick` | Rewrite | "Nobody runs a hill alone. Who's signing with you?" | Button: "Choose a founder" (existing) |

Then the founder sheet (unchanged layout, new relationship lines) and day 1. On day 1, the first Route 100 Radio item is a text-only cold read, before the first-lift coach tip: "Morning, Route 100. Word is {name} came home from up north and signed for Dutch Hill. Lodge lights are on. Lifts aren't. Yet."

**Voice budget (D6, proposed, pending owner).** Re-record only cards 3 to 6 in one ElevenLabs take on the free credits: about 430 characters. Cards 1 and 2 keep the existing file; split `cold-open.mp3` at the 11.2 s cue and append the new take. The name is never voiced. Estimate the credits before generating.

### 2.4 How people address the player

| Who | Address | Sample |
|---|---|---|
| Maris Shaw (radio, text) | Name or "the operator up at Dutch Hill", third person | "{name} had the T-bar turning by nine. That's a first since 1985." |
| Nan (radio call-ins, text only) | First name, or "hon" if no name | "Hon, the Meadows always iced up by the J-bar. Your grandfather swore at that spot every February." |
| Riley Otis | "Boss" | "Boss, the T-bar sounds like a coffee grinder. It'll run." |
| Frank Oka | "Kid" | "Groomer threw a track, kid. She'll live. Not tonight." |
| Chief Dana Holt | "Operator", radio formal | "Operator, wind's up top. We're holding the chair." |
| Elena Vargas | First name or middle name | "The Readsboro kids are coming Tuesday. Keep the bunny slope soft." |
| Vivian Cho | First name, warm, a touch too familiar | "{name}, I skied it Saturday. Seven-minute wait, decent corduroy, no cocoa. I can fix two of those." |
| Al Waters | "Operator" in letters, first name when pleased | "Six pupils, six lessons. I'm telling the board you're a grown-up now." |

With no name entered, lines that need one use "the operator" (Maris, Al) or drop the name (Vivian, Nan).

### 2.5 The last chair bookend

- **First ride.** When the first paid guest rides the first lift on day 1, a toast: "First ride since 1985. Nan's card stays in your pocket till closing day."
- **Final day.** At 15:45 on the last day the lifts stop loading (existing rule). The final chair or T-bar of the winter gets a one-line toast and the camera, if reduced motion is off, eases to the lift: "Last chair. That one's yours."
- **Winter review.** Solvent: "Nan's card: punched." Insolvent but finished: "Punched. The bills outlasted the snow, but you rode it." Bankrupt: "Nan's card still has one ride on it. Keep it." This uses `outcome` and `liquidNetWorth`; no new state.

---

## 3. Surprise and challenge catalog

### 3.1 Rules for every surprise

1. A surprise starts from a recorded sim condition (MASTER_PLAN game pillar 9). It never moves a number the day's rules would not move.
2. Each has an operating response where one exists; the result shows in the next recap through the same settlement.
3. Each kind fires at most once per winter unless marked repeatable.
4. Rolls stay seeded per day (`STREAM.SURPRISE`) so replays match.

### 3.2 Pacing

| Rule | Value |
|---|---|
| Radio items per night | One. Priority: decision card (school, Vivian, club bus, groomer) > set piece > midpoint reversal > story beat > surprise. A displaced item waits one night, then drops |
| Surprises per seven days | At most two. At most one threat in any five days |
| Quiet days | None on day 1. None on a night with a decision card |
| Midpoint turn | One reversal between days 13 and 17, chosen from the hill's reversal pool by whichever condition is met first. If no condition is met, none fires; the sim stays honest |
| Final-week climax | The hill's set piece on the last Saturday (or its calendar slot) |

**Winter shape (28 days).** Dutch Hill's operating calendar (MASTER_PLAN, CAL-1) plays Friday to Sunday and simulates Monday to Thursday in the background. "Day" below counts days in the 28-day shape. Map each week job to the calendar's playable days when row N4 lands.

| Days | Week job | Beats | Surprises |
|---|---|---|---|
| 1–7 | Learn the hill | Cold read, First uphill load, Saturday corridor | One warm or funny item at most. Threats only from weather |
| 8–14 | Grow | School bus (when gated), Vivian's scouting visit, club bus | Up to two |
| 13–17 | **Midpoint turn** | Dry week if gated, one reversal | The reversal counts toward the weekly cap |
| 15–21 | Pressure | Vivian's offer (day 18 on), the loan card if cash runs out | Up to two, one threat |
| 22–28 | **Climax** | Last Saturday set piece, final night, review, last chair | One warm item at most outside the set piece |

### 3.3 Dutch Hill catalog (13)

Kinds: W warm, F funny, T threat, L lore, R reversal, S set piece, D decision.

| ID | Name | Kind | Trigger (sim condition) | Player sees | Operating response | Teaches | Rarity | Build |
|---|---|---|---|---|---|---|---|---|
| DH1 | Pie on the counter | W F | Existing: 2% a day from day 2 | Existing radio line | None | Nothing; it is the warm one | ~50% of winters | Built |
| DH2 | Old tracks, new turns | W | Existing: quiet midweek, 6% | 3–5 returning regulars arrive. New: if the fare is Cheap, one insists on paying $6 "like '85" (copy only) | Fare | Regulars and word of mouth | ~25% | Built; copy add |
| DH3 | Slow going on Route 100 | T | Existing: 8% on non-thaw days | Morning arrivals held until the plow clears | Early Plow talent later | Arrival curve, storms | ~80% | Built |
| DH4 | Thaw Monday, ice Wednesday | T | A thaw day followed by a clear day leaves two or more lower segments in the Ice condition (O3 rule) | Maris proverb; morning headline; Conditions glyphs | Mid or High groom tonight, or Cheap fare | Snow quality and grooming | Common | Copy plus trigger on existing state |
| DH5 | Snow day | W T | Storm forecast on a Tue–Thu outside holiday weeks, seeded 40% | "Readsboro called off school. Every kid with a sled and a cousin with a car is headed your way." Day uses the vacation guest mix | Night-before fare and snow choice; build capacity | Demand from weather, queues | Uncommon | **Sim:** mix override for that day |
| DH6 | The visitor in a very clean jacket | F, antagonist | Reputation ≥ 40, a Saturday or Sunday between days 6 and 14 | A guest labeled "Visitor in a very clean jacket" (Vivian) on the Guests sheet. Night: "Rental car with Massachusetts plates. Rode the T-bar six times. Didn't buy a hot chocolate. Draw your own conclusions." | Follow her; fix whatever her "Why?" shows | Follow-a-guest, the satisfaction breakdown | Once, most winters | **Sim:** one injected Saturday Regular guest with a fixed id; her finished-day facts saved for the offer |
| DH7 | The Bennington club bus | D | A Saturday closed with average wait ≤ 5 min and satisfaction ≥ 70 | Night card: a ski club asks to bring 10 skiers next Saturday at $10 under Balanced | Accept or decline; next Saturday's queues are the result | Capacity planning, fare | Uncommon | **Sim + save:** `clubBooking` like `schoolContract` |
| DH8 | Groomer threw a track | T R D | Midpoint window, Mid or High service on 3 of the last 5 nights, groomed distance this winter over a threshold | Frank: "Groomer threw a track on the Windmill side. She'll live. Not tonight, though." Tonight grooms nothing at any preset (snow guns still run). Decision: borrow the town road crew's machine for $250, or go without | Pay, or close a trail, or drop the fare | Grooming capacity, closures | ≤ 1 a winter | **Sim + save:** `groomerDown` night flag |
| DH9 | The January thaw | T R | A forecast run of three or more thaw days starting after day 10 | Maris frames the run the night before it starts; Conditions scrub shows tomorrow | Snow tier, close the lowest segment, fare | Thaw by elevation, closures | Common | Copy on existing weather |
| DH10 | Nan calls in | W L | First Sunday after reputation crosses 60, or after Heritage Sign is learned | A one-line radio memory of the hill from Nan | None | What reputation means | Once | Copy |
| DH11 | Skin tracks at dawn | L | Morning after a storm that added depth, with Minimal service the night before | "Skin tracks up the Windmill side before the lift turned. Folks kept hiking this hill after the lifts quit. Nice to see them ride down past a lodge with the lights on." | Groom on powder nights or leave it soft | Minimal vs groomed after snowfall | Uncommon | Copy plus trigger |
| DH12 | Dry week | T | Existing beat gate | Existing line, branched: with guns, "wait for cold to run them"; without, "wait for cold or close the lower third" | Close the lower segment, cheap fare, Tier 2 for guns | Natural snow limits | Common | Copy branch |
| DH13 | **Last Saturday** | S | The final Saturday of the winter, if not bankrupt | Night before: "Whole town's coming tomorrow. Plates from Bennington to Brattleboro." Day: vacation mix plus a reputation-scaled arrival bonus, torchlight down Dutch Meadows at close (decoration only), Nan in the lodge if reputation ≥ 60 | Fare, snow, capacity; it is also the vacation-Saturday operating goal in `winterArc.ts` | Peak-day planning | Every winter | **Sim:** small arrival bonus; render: torch line |

### 3.4 Later-hill catalog (12)

| ID | Hill | Name | Kind | Trigger | Player sees | Response | Teaches | Rarity |
|---|---|---|---|---|---|---|---|---|
| MT1 | Mount Tom | Dry up north | W T | Guns running and the regional "north" weather flag dry for four days | Connecticut plates; arrivals jump; long lines | Raise the fare, open the night session longer | Guns as a market edge, elasticity | Common |
| MT2 | Mount Tom | The pass bus | D, antagonist | Saturdays from week 2 | Vivian offers $400 a Saturday to use your lot as a park-and-ride for her pass bus north | Accept (cash, fewer stalls and a Saturday arrival penalty) or decline | Hidden costs of outside money | Once |
| MT3 | Mount Tom | **Lights on the Range** | S | First clear night session on a Friday with the lights built | The whole valley sees the hill lit from I-91; after-work crowd doubles | Fare and service for the night session | Night skiing | Every winter |
| MV1 | Maple Valley | Inspector's Tuesday | T | A state lift inspection on a seeded weekday; any lift with low maintenance (needs lift wear in the sim) closes until fixed | Dana reads the inspection notice the night before | Pay for repairs tonight, or run without that lift | Lift reliability | Once |
| MV2 | Maple Valley | **Tubing Saturday** | S | Final Saturday with the tubing hill built | The district program's families come back with siblings | Capacity, tubing fare | Activities and families | Every winter |
| SV1 | Snow Valley | Boards on the T-bar | D | First weekend with the Rider persona in the mix | Saturday Regulars grumble; riders want wide trails | Welcome riders (more arrivals, Regulars' mood dips) or keep a skiers-only Sunday | Guest mix | Once |
| SV2 | Snow Valley | The $29 Tuesday | T R | Midpoint; the pass resort up the road (fictional) runs a weekday promo | Weekday arrivals fall for a week | Cheap fare, school days, events | Elasticity vs reputation | Once |
| SV3 | Snow Valley | **The riders come home** | S | Final Saturday with a riders' event built | A jam weekend in homage to the 1983–84 national championships held here | Event fare and capacity | Events | Every winter |
| EM1 | Enchanted | Moose on the trail | F | Weekday, fresh snow, under 30 arrivals | Patrol closes one trail until noon | Lean on redundant trails | Trail closures | Uncommon |
| EM2 | Enchanted | **Nor'easter** | S R | Seeded three-day storm in the midpoint window | Day 1 the road closes (arrivals near zero, costs run); days 2–3 powder crowds | Cash buffer, Early Plow, grooming | Fixed costs on closed days | Every winter |
| BR1 | Brodie | **Green snow Saturday** | S | The Saturday nearest mid-March in the calendar, events built | Homage to Brodie's St. Patrick's tradition: dyed snow (decoration), torchlight parade | Event night choices | Events and night skiing at scale | Every winter |
| MW1 | Mount Whittier | **Cars stop on Route 16** | S | First gondola day | Traffic stops under the first cabin; next weekend's arrivals rise | Gondola and shuttle capacity | Two bases, gondola | Once |

Evergreen Valley's set piece is the ranger's inspection day (§5.4). It stays out of the count above because it needs the lease-covenant system first.

---

## 4. Characters

### 4.1 More presence for the existing cast

| Character | System | Change |
|---|---|---|
| Maris Shaw | Story delivery | Narrates the cold open and every radio item. Uses the player's name in text. WORLD.md now matches ART_DIRECTION: a Concord, NH morning-show voice |
| Vivian Cho | Outside money | Three touchpoints every winter: scouting (as a guest), offer (priced on measured results), aftermath line in the review. Career arc in §4.3 |
| Frank Oka | Grooming, snowmaking | Owns DH8 (groomer down) and the Groomer Rebuild talent payoff ("Told you she'd live.") |
| Chief Dana Holt | Wind holds, safety, inspections | Owns DH5 snow day crowd control and MV1 inspection |
| Elena Vargas | Schools, families, heritage | Owns the school and club bus cards. As founder and crew she is one person; when picked as founder her crew lines gain "partner" warmth |
| Al Waters | School contracts | Keep. Becomes the reference that brings Maple Valley's call |
| Riley Otis | Founder only | No change to rules. Riley's voice is the sample for the house "boss" register when picked |

### 4.2 Additions (small, each tied to a system)

| New character | Where | System | Notes |
|---|---|---|---|
| **Nan** | Dutch Hill, all career | Reputation, heritage, the last chair ritual | Text only. Radio call-ins once or twice a winter. Never voiced |
| One local per later hill | §5.4 table | That hill's new mechanic | Becomes the hill's caretaker when you move on (§6.3) |

### 4.3 Antagonist plan: Vivian across the career

Vivian believes consolidation is how skiing survives in New England, and she can show the numbers. She learned to ski on a rope tow that closed when she was nine (fictional, unnamed town; revealed in Act III). She is polite, quick, and right about some things.

| Act / hill | Her move | Trade (sim-measured) |
|---|---|---|
| I Dutch Hill | Scouts as a guest (DH6), then offers $6,000 for a Balanced fare cap | Existing trade. **Gate change:** the offer fires from day 18 at reputation ≥ 50; at reputation 40–49 she sends a smaller offer ($3,000 for the same cap) so every player meets her |
| II Mount Tom | Pass bus park-and-ride (MT2) | Cash per Saturday vs lot capacity |
| II Maple Valley | Bids on the orchard parcel against the land trust (Juniper's arc) | Parcel price vs losing land to the pass |
| III Snow Valley | Her resort up the road runs the $29 Tuesday (SV2) | Shared guest pool |
| III Enchanted | Leaves you alone ("too far north for a gondola payment"). Backstory reveal over coffee in a storm | A breather; the player sees her as a person |
| III Evergreen | Holds the rival bid for the federal lease renewal | Covenant score vs her bid |
| IV Brodie | Tries to hire Frank for her snow team | Match with +$60 a day for the rest of the career, or Frank's remaining talents slow for one winter |
| IV Whittier | **The coast offer:** buys every hill you hold for one number | The ending decision (§8) |
| Every winter after Dutch Hill | Bids on one departed hill whose caretaker reputation dipped | Sell (cash now, dot turns pass blue) or keep (income, risk) |

If the founder is Tom, his variant of each offer arrives a night earlier through him ("She called me first. She always calls me first.").

---

## 5. Mountain roster and progression

### 5.1 Ordering rule

Scale grows hill to hill in vertical, lift count, trail count, guests per day, starting capital, and the number of systems in play. Weather gets colder and windier going north and up, with one deliberate warm exception (Mount Tom) that teaches guns. Dutch Hill is the smallest by vertical and by every other measure.

### 5.2 Changes to WORLD.md Part 3

The Tenney and Crotched West cuts and the Hogback move are **proposed, pending owner (D1)**. The Maple Valley county fix is a factual correction and needs no decision.

| Hill | Decision | Reason |
|---|---|---|
| Dutch Hill, VT | **Keep**, career start | Smallest, verified 570 ft |
| Tenney Mountain, NH | **Cut** (D1) | Reopened for skiing in March 2018 and again for 2022–23 under current owners; reported operating through at least early 2025. A living area cannot be "reopened" by the player without implying something about its owners |
| Maple Valley, VT | **Keep**, fix location | It is in Dummerston (Windham County), not Windsor County. Closed since 2000; private owner since 2018; still lost |
| Mount Whittier, NH | **Keep**, make it the finale | Gondola across Route 16, two bases, largest published vertical on the list |
| Hogback, VT | **Move to lore** (D1) | 460–500 ft published vertical, smaller than Dutch Hill. Town-owned conservation land open to the public. Radio and Atlas pin only |
| Brodie, MA | **Keep** | Night skiing pioneer, 1,250 ft |
| Crotched West, NH | **Cut** (D1) | The western side was rebuilt in 2003 and is today's operating Crotched Mountain, owned by Vail Resorts. Unusable under the respect line, and a real megapass parallel too close to our fictional one |
| Added | Mount Tom (MA), Snow Valley (VT), Enchanted Mountain (ME), Evergreen Valley (ME) | All closed, documented by NELSAP or New England Ski History, and none operating as of the sources read |

### 5.3 Roster by scale

Numbers marked † are published figures that disagree between sources; **verify before shipping** any of them in player copy. Game guests per day assume the sim keeps 20–30 agents on iPhone and represents larger crowds with one agent standing for several skiers (sim change, row N12). Start cash, guest ranges and weather archetypes are design placeholders for SIMULATION_SPEC and the balance harness.

| # | Hill | State | Act | Real vertical | Historic lifts / trails | Years | Start cash | Guests/day (game) | Weather archetype | New mechanic |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Dutch Hill**, Heartwellville | VT | I | 570 ft | T-bar, J-bar, rope tows / about 8–12 | 1944–1985 | $12,000 | 12–48 | Southern snow belt, no guns at start | The core loop |
| 2 | **Mount Tom**, Holyoke | MA | II | 680 ft | 4 doubles, J-bar / 15, all lit and snowmade | 1962–1998 | $25,000 | 30–90 | Warm valley; thaws often | **Night session** and guns from day 1 |
| 3 | **Maple Valley**, Dummerston | VT | II | 841–1,017 ft† | 2 doubles, T-bar, tow / 19 | 1963–2000 | $35,000 | 40–100 | Southern VT thaws | **Season-long school program**, tubing, a land parcel |
| 4 | **Snow Valley**, Winhall | VT | III | 900 ft† (700 before 1977) | T-bar, Poma, double / not verified | about 1941–1984 | $45,000 | 50–110 | Higher Green Mountains, more snow | **Riders** (snowboard persona) and a **shared guest pool** with a pass resort next door |
| 5 | **Enchanted Mountain**, near Jackman | ME | III | about 1,000 ft† (brochures claimed up to 1,800) | Double, T-bar, Poma / 6 | about 1966–1974 | $50,000 | 30–80 | Cold, windy, isolated | **Wind and isolation**: storm road closures, wind holds dominate |
| 6 | **Evergreen Valley**, Stoneham | ME | III | 1,050 ft† | 3 doubles / 12† | 1972–1982 | $65,000 | 50–120 | Cold western Maine | **Lease covenant**: a landlord with conditions, measured each winter |
| 7 | **Brodie**, New Ashford | MA | IV | 1,250 ft (advertised) | 3–6 chairs and T-bars / 33–40 | 1964–2002 | $90,000 | 80–170 | Berkshire wind and ice | **Night skiing at scale and events** |
| 8 | **Mount Whittier**, West Ossipee | NH | IV, finale | 1,100–1,650 ft† | 6,300 ft gondola, 3 T-bars, tows / about 7 | before 1949 to about 1985 | $120,000 | 80–200 | White Mountain wind, steep, no guns historically | **Gondola, two bases half a mile apart**, lift reliability |

Whether all eight ship together or three ship first (Dutch Hill, Mount Tom, Maple Valley in M5, the rest in M7) is **proposed, pending owner (D5)**. The recommended default is three first.

### 5.4 Per-hill design

| Hill | Local character (caretaker later) | Signature surprise | Relation to the pass | Heritage hook (sourced) |
|---|---|---|---|---|
| Dutch Hill | Nan (heritage); caretaker is your founder or Elena | Last Saturday (DH13) | First scouting and offer | 1944–1985; lodge burned 1990 in firefighter training; no snowmaking ever |
| Mount Tom | **Lou Carvalho**, Holyoke electrician who wired the old lights | Lights on the Range (MT3) | Pass bus park-and-ride | Night skiing and snowmaking on every trail; summer wave pool and alpine slide; next to a quarry |
| Maple Valley | **Rosa Merrill**, school principal who runs the district program | Tubing Saturday (MV2) | Parcel bid against the land trust | Two Hall double chairs from 1963–64; night skiing; tubing late in its life |
| Snow Valley | **Kip Lavoie**, board-shop owner who rode the 1983 nationals as a kid | The riders come home (SV3) | Pass resort next door runs promos | Hosted the national snowboarding championships in 1983 and 1984 |
| Enchanted | **Gilles Fortin**, Jackman snowmobile club and border-crossing guide | Nor'easter (EM2) | None at first; Vivian's backstory | Brochures claimed 1,800 ft; the tape measure disagreed. Wind and isolation |
| Evergreen Valley | **Ada Whitcomb**, the district ranger (fictional) who holds the lease | Inspection day: covenant check against operating days and lift upkeep | Rival bid on the lease renewal | Federal land lease; long idle spells; lifts ordered removed in 1991 |
| Brodie | **Mae Donnelly**, events organizer who ran the torchlight parade | Green snow Saturday (BR1) | Hires away Frank | Night skiing from 1965–66, once billed as the largest night skiing facility; St. Patrick's green snow |
| Mount Whittier | **Walt Gagnon**, retired gondola mechanic who knows the cable | Cars stop on Route 16 (MW1) | The coast offer | Gondola crossed Route 16; skiers could not ski between the gondola base and the lodge |

The facts in the heritage column come from NELSAP and secondary compilations. **Verify before shipping**, especially vertical, trail counts and years, which the sources report differently.

Respect notes per hill: name no real owners, families or living businesses (Brodie's buyers, Mount Tom's equipment buyers, the business in Whittier's old gondola base, the snowboard brand behind the 1983 event, Snow Valley's operating neighbors). Present closures as hard luck and changing times. Each heritage card states "Inspired by New England ski history. Buildings and events in the game are fiction on a real place" and credits NELSAP.

### 5.5 How difficulty shifts

| Axis | Dutch Hill | Middle hills (2–5) | Big hills (6–8) |
|---|---|---|---|
| Capital | $12,000, one loan | $25,000–$50,000 plus caretaker income | $65,000–$120,000, larger loans, construction in phases |
| Guest mix | Weekday learners, Saturday regulars | Adds after-work night crowds, district school groups, riders | Destination weekenders, event crowds, two-base logistics |
| Weather | Natural snow, thaws | Guns from day 1 at Tom; colder going north | Wind holds on chairs and the gondola; nor'easters |
| Lift slots | 2–3 | 3–5 | 5–7, including the gondola |
| Systems in play | Build, fare, snow, lodge tiers, one offer | Plus night session, programs, shared market | Plus covenant, events at scale, reliability, two bases |
| Win condition | Solvent day 28 | Solvent plus one hill goal (e.g., night session margin, program lessons) | Solvent plus hill goal plus the pass's pressure on departed hills |

The Simple ruleset holds everywhere: new mechanics add things to build and offers to answer at night. They never add a third standing nightly lever. Mount Tom's night session is a building (lights) plus a tile choice inside the existing snow & service decision ("Lights on" adds cost and an evening crowd), so the night sheet keeps two levers.

---

## 6. Why the next mountain, and what happens to the old one

### 6.1 The hook

At the winter review, after the punch card line, a call arrives. It references something your winter actually measured, and Maris reports the threat.

- Dutch Hill to Mount Tom, sample: "Lou Carvalho from Holyoke called. Says anybody who moved {busiest Saturday arrivals} skiers through a T-bar with a {wait}-minute line can figure out his lights. Maris adds: Snowglomerate has an option on the Mount Tom land that runs out in April."
- If the Readsboro visit delivered all six lessons, Rosa Merrill (Maple Valley) calls instead or as well, citing Al Waters.

From Act II on, the Atlas offers two calls when the results support both, so the map branches. Each call names its hill, its town and Snowglomerate's interest in it.

### 6.2 Gates

| Gate | Measured by | Story face |
|---|---|---|
| Solvent winter | `liquidNetWorth ≥ 0` at review (existing) | The town renews your lease and the call comes |
| Hill-specific call | One measured result per hill (busiest Saturday, lessons delivered, night-session margin, covenant score) | Who calls you |
| Capital | Year-end cash plus caretaker income plus a town match scaled by winter score | The down payment on the next lease |
| Tier of call | Winter score (existing `winterScore`) sets the town match: under 60 none, 60–79 10%, 80+ 20% | "The select board voted to chip in." |

### 6.3 The old hill

| Piece | Design |
|---|---|
| **Caretaker** | On leaving, pick one of two named allies (that hill's local character or your founder) to run it. Each has a policy bias that drives the coarse off-screen sim: e.g., Elena favors Cheap fares and family mood; Frank favors High snow service. Row 37's coarse sim produces a winter result: income, reputation, snow trouble |
| **Income** | Paid at each winter review as a caretaker line in the Ledger (row 38) |
| **Homecoming card** | At the start of each new winter, one card per departed hill: the caretaker's measured winter in two lines, and their voice |
| **Heritage card** | Gains a line written by your winter: "Reopened by {name}. Winter {n}: {score}. Last chair, day 28." |
| **Pass pressure** | Each winter, if a departed hill's coarse reputation fell below a threshold, Vivian bids for it. Sell (cash, dot turns pass blue, income stops) or keep (income, the risk repeats) |
| **Returning visits** | M7: play one day at a departed hill per winter (a holiday Saturday) with its saved layout. Optional |
| **Failure (D4, proposed, pending owner)** | Winter 1 bankrupt: replay Dutch Hill (existing). A later hill bankrupt: the hill is lost; its dot turns pass blue if Vivian bid on it that winter, otherwise forest green. The career continues from your other hills with lower capital. With no hills left, the career ends in the Forest epilogue and the slot offers a replay of the last winter |

### 6.4 Boundary with Capitalist Mode

Shared and mode-neutral: mountain definitions (row 34), the Atlas map data, the coarse off-screen sim (row 37) and the Ledger (row 38). Capitalist Mode may reuse the hills and the rival company.

Story-only, under a story content table and a `mode: "story"` check: the player profile, Nan, the founders' relationship lines, Vivian's arc and dialogue, all beats and surprises' copy, caretaker names, the calls and the endings. Capitalist Mode's Abominable Snowglomerate is an AI company with no named rep and no memory of a Story career. No Story save carries into Capitalist Mode. Sandbox has story off and shares none of this content.

---

## 7. ICR comparison and our take

**What ICR does** (from the analysis doc): a career across real lost New England areas, ordered warmer and smaller toward higher and colder, with a warming climate as both narrative and mechanic; six founders with constraints; a megapass antagonist (Apex Summit Collective) with buyouts and poaching, more prominent in the Steam copy than in play; caretakers that simulate departed hills for income; 70 talents that persist across hills; a named mentor who coaches the first week and hands the player a second hill on day 4; a business-literacy goal through full statements.

**What it leaves open.** The analysis itself calls the narrative frame "underused". The player has no identity. The antagonist is a background pressure. Caretakers are an income line. The next hill is a progression step, and the mentor gives it away on day 4, before the first hill is earned.

**Our take.** Last Chair is the story of one person from Heartwellville stitching the lost hills of the Ice Coast back into a working network, one winter at a time, while a reasonable, well-funded pass offers to make it all easier. Every story moment comes out of the hill's measured numbers, every hill you leave keeps running under a neighbor you trusted, and the career ends on a map whose dots you colored.

Three ties only we do:

1. **The rival skis your hill.** Vivian is a guest in the sim. She waits in your lift line, her "Why?" breakdown is real, and her offer quotes her own measured day. The antagonist reads the same numbers the player reads.
2. **The map is the ending.** Departed hills stay alive under named caretakers on the coarse sim; Vivian bids on the weak ones; each dot is yours, the pass's or the forest's, and the ending is computed from the dots plus your last reply.
3. **The last chair.** Nan's punch card gives every winter the same closing ritual, and each heritage card gains a dated line written by what the sim measured that winter.

---

## 8. Endings

The finale is Vivian's coast offer at Mount Whittier, a night card after the final winter's review. The ending reads the Atlas dots and the reply. The Forest ending depends on D4 (continuing after a lost hill).

| Ending | Condition | Epilogue (three stills, text, one voiced closing line) |
|---|---|---|
| **The Co-op** | Decline the coast offer and hold at least half the career hills as yours | The caretakers form the Route 100 Co-op with one shared pass. Nan's card is framed in the Dutch Hill lodge. If you declined every Vivian offer in the career, she quits and runs a rope tow somewhere in Worcester County |
| **The Sale** | Accept the coast offer | A large check, your hills on the pass map, honest results: lines shorter, fares higher, Dutch Hill open seven days. Vivian sends a postcard of a gondola |
| **Going alone** | Decline with fewer than half the hills yours | A small independent chain, surrounded. Snowglomerate keeps calling every spring |
| **The Forest** | No hills left at any point | The meadows grow back. Someone in the valley keeps a punch card with one ride left |

Voice budget for endings (D6, proposed, pending owner): one closing line per ending, about 150 characters each, four lines.

---

## 9. Roadmap impact

New track **N** (narrative). Rows follow MASTER_PLAN §9's table style and are mirrored in its N track table. Order puts the smallest build that makes the intro and surprises land first. "Save" marks a schema bump; "Sim" marks a rules change that re-baselines the characterization snapshot or the harness. Rows that depend on an owner decision name it.

### M4 (code, copy and 2D stills; no Blender)

| # | Status | PR | Accomplishes | Save / sim |
|---|---|---|---|---|
| N0 | ☐ | STORY.md and roster docs | STORY.md lands; WORLD.md Part 3 roster replaced (Tenney and Crotched West cut, Hogback to lore, Maple Valley county fixed, four hills added); MASTER_PLAN §2 arc table and row 36 point here | Docs only |
| N1 | ☐ | Cold open v2 | Six cards (two new stills, two rewritten), punch-card flip and title drop, optional name on the lease (D3), one ElevenLabs take for cards 3–6 (~430 characters, free credits, D6), captions fallback | **Save:** `operatorName: string \| null` |
| N2 | ☐ | Partners and address | Founder relationship lines on the pick; day-1 cold read; name substitution in Maris, Vivian, Al and Nan text lines; "the operator" fallback | Copy only |
| N3 | ☐ | The last chair | First-ride toast, final-day last chair toast and camera ease, punch-card line in the winter review for all three outcomes; replace the Tenney card with a placeholder call card until row N9 | None (reads `outcome`) |
| N4 | ☐ | Surprise scheduler | One radio item per night with the priority order, two-per-week and one-threat-per-five-days caps, quiet days, midpoint window; existing three surprises move onto it | **Sim:** re-baseline snapshot |
| N5 | ☐ | Dutch Hill surprise pack | DH2 copy, DH4, DH5, DH9, DH10, DH11, DH12 branch | **Save:** extend `SurpriseKind` enum in validation. **Sim:** snow-day mix override |
| N6 | ☐ | Vivian skis Dutch Hill | DH6 visitor guest, her facts stored, offer copy quotes them; offer gate to reputation ≥ 50 with the $3,000 variant at 40–49 | **Save:** `vivianVisit` facts. **Sim:** harness rerun for offer frequency |
| N7 | ☐ | Decision surprises | DH7 club bus and DH8 groomer down, with cards, recap results and review memory lines | **Save:** `clubBooking`, `groomerDown`. **Sim** |
| N8 | ☐ | Last Saturday | DH13 set piece: night-before preview, arrival bonus, torchlight decoration, Nan cameo | **Sim:** small arrival term |

### M5 (career)

| # | Status | PR | Accomplishes | Save / sim |
|---|---|---|---|---|
| 34 | ☐ (changed) | Mountain definitions as data | Adds story tables per hill: beats, surprise pool, set piece, local character, call text, heritage lines, pass relation | Content schema |
| 35 | ☐ (changed) | Atlas | Dots in three colors, locked hills with sourced one-line history, heritage cards with your winter's line | **Save:** `careerHills[]` (id, status yours / pass / forest / locked, caretaker, records) |
| N9 | ☐ | The call | Next-hill call from a measured result, Maris's threat line, town match from winter score, branching from Act II | Reads `winterRecord` |
| 36 | ☐ (changed) | **Mount Tom, MA** (replaces Tenney) | Night session as a building plus a snow & service tile option; guns from day 1; MT1–MT3; Lou Carvalho | **Sim:** evening arrival curve, lights cost |
| 37 | ☐ (changed) | Caretaker | Named caretaker pick, policy bias on the coarse sim, homecoming card, Vivian bids on weak departed hills | **Save:** caretaker per hill. **Sim:** coarse sim |
| 38 | ☐ | Ledger | Adds caretaker income lines (unchanged intent) | n/a |
| N10 | ☐ | Lost hills (D4) | Bankrupt later hill turns pass or forest; career continues; Forest epilogue when none remain | **Save:** status transitions |

### M7 (career completion)

Consider renaming M7 to M5b if the owner wants hills before polish. Rows N11 to N17 cover the hills beyond the first three under the D5 recommended default.

| # | Status | PR | Accomplishes |
|---|---|---|---|
| N11 | ☐ | Maple Valley, VT | District school program (season-long Readsboro), tubing, orchard parcel bid, inspector's Tuesday (needs lift wear in the sim) |
| N12 | ☐ | Guest scaling | One agent can stand for several skiers so hills 4–8 keep 20–30 agents on iPhone; recap and "Why?" stay exact |
| N13 | ☐ | Snow Valley, VT | Rider persona, shared guest pool with a fictional pass resort, SV1–SV3 |
| N14 | ☐ | Enchanted Mountain, ME | Wind-dominant weather, road closure days, EM1–EM2, Vivian backstory |
| N15 | ☐ | Evergreen Valley, ME | Lease covenant score, ranger inspection, rival lease bid |
| N16 | ☐ | Brodie, MA | Night at scale and events (uses A5), Frank poach decision, BR1 |
| N17 | ☐ | Mount Whittier, NH | Gondola lift type, two bases with a shuttle, wind holds on the gondola, MW1, the coast offer |
| N18 | ☐ | Endings | Four endings from Atlas dots and the final reply; four voiced lines (D6) |

---

## 10. Open decisions for Griffin

All six are **proposed, pending owner**. The recommended default is the working assumption until the owner answers.

| # | Question | Recommended default | Status |
|---|---|---|---|
| D1 | Replace Tenney (operating since 2018) and Crotched West (now Vail's Crotched Mountain) in the career? | **Yes.** Mount Tom becomes hill 2 and row 36 | Proposed, pending owner |
| D2 | Give the player a past at a Snowglomerate resort, with Vivian as the manager who cut the night crew? | **Yes.** It makes every offer personal without making her a villain | Proposed, pending owner |
| D3 | Optional name entry on the lease, shown in text only and never voiced? | **Yes**, optional, with "the operator" as the default | Proposed, pending owner |
| D4 | Does the career continue after losing a hill past winter 1? | **Yes.** The dot changes color and the ending accounts for it | Proposed, pending owner |
| D5 | Ship eight hills, or three in M5 and five later? | **Three first** (Dutch Hill, Mount Tom, Maple Valley in M5); the rest in M7 once guest scaling (N12) lands | Proposed, pending owner |
| D6 | ElevenLabs free-credit budget for story voice: cold open cards 3–6 now (~430 characters), one 150-character intro line per new hill, four ending lines? | **Approve**, estimate each batch before generating, one take each | Proposed, pending owner |

---

## Limitations and sources

**Supported by the repo:** the play order, beat gates, surprise odds, founder numbers, the $6,000 offer, the reputation-55 gate and the Tenney card come from `content.ts`, `surprises.ts`, `sim.ts`, `rules.ts`, `summitLink.ts`, `coldOpenCards.ts`, `ColdOpen.tsx`, `FounderPick.tsx`, `WinterReviewSheet.tsx` and SIMULATION_SPEC's 40-seed results. **Inferred:** that weaker strategies rarely meet Vivian follows from the reputation update (85% yesterday, 15% today's satisfaction) and the measured satisfaction means; the harness has not logged offers for those strategies. **Assumed:** start cash, guest ranges and per-hill numbers in §5 are design placeholders. Hill facts come from NELSAP and secondary compilations that disagree on vertical, trail counts and years; every † figure needs a check before it appears in player copy. Tenney's 2025–26 operating status was not confirmed; its 2018 and 2022–23 reopenings were. The Medium pillar article returned HTTP 403 through every route tried, so the pillar method rests on the ch0m5 page and general practice; pillars N1–N5 should be rechecked against the Medium article if it can be read. ICR's career is described from our analysis doc and store material, not from a full playthrough. The ElevenLabs free allowance was not rechecked. The week-by-day shape in §3.2 was written against a 28-day count and needs mapping to the Fri–Sun operating calendar.

Sources:

- [NELSAP Dutch Hill](https://www.nelsap.org/vt/dutch1.html)
- [NELSAP Hogback](https://www.nelsap.org/vt/hogback.html)
- [NELSAP Maple Valley](https://www.nelsap.org/vt/maplevalley.html)
- [VTDigger, Maple Valley sale 2018](https://vtdigger.org/2018/05/25/maple-valley-ski-area-dummerston-sells-745k/)
- [NELSAP Tenney](https://www.nelsap.org/nh/tenney.html)
- [Concord Monitor, Tenney reopens](https://www.concordmonitor.com/tenney-mountain-ski-open-49883866)
- [Unofficial Networks, Tenney Hornet chair 2025](https://unofficialnetworks.com/2025/05/07/tenney-mountain-hornet-chairlift)
- [NELSAP Mount Whittier](https://www.nelsap.org/nh/mtwhit.html)
- [NELSAP Brodie](https://www.nelsap.org/ma/brodie.html)
- [NELSAP Mount Tom](https://www.nelsap.org/ma/mttom.html)
- [NELSAP Crotched Mountain](https://www.nelsap.org/nh/crotched.html)
- [Wikipedia, Crotched Mountain Ski & Ride](https://en.wikipedia.org/wiki/Crotched_Mountain_Ski_%26_Ride)
- [NELSAP Snow Valley](https://www.nelsap.org/vt/snowvalley1.html)
- [New England Ski History, Snow Valley](https://newenglandskihistory.com/Vermont/snowvalley.php)
- [NELSAP Enchanted Mountain](https://nelsap.org/me/enchanted.html)
- [NELSAP Evergreen Valley](https://www.nelsap.org/me/evergreen.html)
- [New England Ski History, Evergreen Valley](https://newenglandskihistory.com/Maine/evergreenvalley.php)
- [Game Design Pillars (ch0m5)](https://ch0m5.github.io/Game-Design-Pillars/)
- [Apelman, Defining the pillars of game design (Medium, not readable)](https://medium.com/@matthewapelman/defining-the-pillars-of-game-design-and-how-we-can-use-them-throughout-the-design-process-2d3b424e7fe1)
