# Last Chair — world, story and cast

**Version:** 1.1 · **Updated:** 2026-11-21  
Merged from the former Act I, characters, mountains and lore docs. Game plan and priorities: [MASTER_PLAN.md](./MASTER_PLAN.md). The full Story Mode narrative (the player, Nan, the intro, the surprise catalog, the roster, endings) lives in [STORY.md](./STORY.md), which wins on Story Mode narrative; this file keeps the lore pantry, the cast reference and the respect line. Items STORY.md marks proposed, pending owner are marked the same way here. Numbers behind founders and beat gates: [SIMULATION_SPEC.md](./SIMULATION_SPEC.md).

**Rule:** characters and story exist to teach systems and anchor emotion. When story and sim disagree, the sim wins and the story adapts.

| Part | Contents |
|---|---|
| [1. Dutch Hill, Act I](#part-1-dutch-hill-act-i) | Why this hill, heritage card, sim template, six beats, respect checklist |
| [2. Cast](#part-2-cast) | Six founders, recurring NPCs, guest personas, crew framing, writing rules |
| [3. Career mountains](#part-3-career-mountains) | Real-place policy, roster by act, heritage card format, map UI |
| [4. Lore pantry](#part-4-lore-pantry) | Ice Coast identity, lost hills, regional threads, radio voice guide |

---

## Part 1: Dutch Hill, Act I

**Place:** [Dutch Hill / Dutch Mountain](https://www.nelsap.org/vt/dutch1.html), **Heartwellville**, Readsboro, Vermont  
**Also:** [DHASH — backcountry revival](https://www.dhash4vt.org/dutch-hill)

**Story Mode structure (player effort):** daily ski sim → nightly fare + snow/service (+ rare story reply) → metric-gated radio beats → winter review (real peak name). Tone: hopeful operator; **dignified** history (NELSAP, DHASH). No fourth mandatory nightly control in Act I; heritage optional; radio can be off.

**World:** New England Ice Coast. You start on Dutch Hill — a **closed** area on Route 100, lodge gone, lifts scrapped or seized, forest reclaiming **Dutch Meadows**. **Abominable Snowglomerate Pass** (fictional) = consolidation pressure. Career continues to [Part 3](#part-3-career-mountains); copy pantry: [Part 4](#part-4-lore-pantry).

---

### Why this hill

**Broken down, in the sticks** — southern Green Mountain spine, a few miles from the Massachusetts line. Not a commuter bump like metro Boston; **dirt roads, volunteer fire department, a base lodge that burned in 1990.**

Real arc (public record):

- Operated **1944–1985**; peak years mid-century T-bar, J-bar, rope tow, ~570′ vertical, ~dozen trails.  
- **No snowmaking** in the lean years; weekends-only; adult tickets **$6** era economics.  
- Closed for good after **1984–85** — bad snow, megaresort competition, habit change.  
- **1990:** base lodge burned for **firefighter practice** (documented).  
- Land later **public**; trails growing in; **DHASH** works with USFS on human-powered skiing.

**Player fantasy:** You buy the **note on a dead lift line** — not a fantasy name, a **real ghost** — and try to run **one more winter** before the forest takes the meadows back.

**Who you are** (STORY.md §2): a Readsboro kid who spent ten winters on a snowmaking crew up north (the Snowglomerate past is **proposed, pending owner**). Your grandmother Nan (fiction) sold tickets at Dutch Hill for thirty winters and kept the last punch card from 1984–85 with one ride left on it. That card is the title: every winter ends with the last chair and the card gets punched.

---

### Heritage card (draft)

**Dutch Hill — Heartwellville, Vermont**

- Skiing here from the **1940s**; Dutch Meadows novice pitch; **T-bar daily** by 1947.  
- Sold in **1968** as owners aged; renamed **Dutch Mountain**, then **Dutch Hill** again.  
- Never a snow gun; lived on **natural snow** and local loyalty.  
- Closed **1985**; lodge gone **1990**; mountain returned wild.  
- **Your winter:** The town does not want the only lighted slope in the valley dark again.

---

### Sim template

| Field | Value |
|-------|--------|
| Vertical (game scale) | 570′ terrain reference. The lift terminals determine the vertical available to ski. |
| Start state | Tier 1 lodge. The player places the first surface lift and paints its descent before opening. |
| Archetypes | `rural_sticks`, `natural_snow_only`, `weekends_family`, `no_snowmaking_start` |
| Weather | Southern VT snow belt — good winters **or** 1970s-style drought arcs |
| Arrival | Gravel lot off Route 100, 30/50/80 stalls by lodge tier (visual parking only; does not cap arrivals) |

Respect real **DHASH** work: in-game “saved the hill” is **tycoon fiction**, not claiming USFS lease.

---

### Act I beats

| # | Beat | Lore |
|---|------|------|
| 1 | **First uphill load** | DHASH hikers on radio; “last ticket was 1985” |
| 2 | **Saturday** | Plates from **Bennington**, **Williamstown**, **Brattleboro** |
| 3 | **School bus** | Readsboro / Wilmington corridor. A proven ski school can invite six pupils for a weekday. |
| 4 | **Dry week** | No guns—**wait for cold** or close trails (ICR lesson) |
| 5 | **Abominable Snowglomerate** | Vivian offers $6,000 in return for a fare cap. Riley must decline. |
| 6 | **Winter review** | A solvent finish brings a phone call from the next town, tied to something your winter measured. The first call comes from **Mount Tom, MA** (proposed, pending owner; STORY.md §6). Maris reports that Abominable Snowglomerate holds an option on the land. |

---

### Ship / respect

- [ ] Link NELSAP + DHASH in credits  
- [ ] Do not depict real 1990 fire as player stunt  
- [ ] Clarify: structures are fictional rebuilds on a real place  

Writer accents for these beats: [Part 4](#part-4-lore-pantry) (Dutch Hill lore stash). Metric gates: [SIMULATION_SPEC.md](./SIMULATION_SPEC.md).

---

## Part 2: Cast

Characters exist to **teach systems** and **anchor emotion**. Mechanics always win if story and sim disagree (story adapts).

---

### Founders (career start — pick one)

Equivalent to ICR’s six founders: different rules, same career. **One founder per career**, chosen at new game. The founder is the person signing the lease with you; each gets one relationship line on the pick card (STORY.md §2.2).

#### 1. **Elena Vargas — *The Caretaker***

- **Background:** Taught the last lessons at **Dutch Hill** before the **1985** closure (fiction: you’re back for the revival).
- **Bonus:** Happier families bring two extra guests.
- **Constraint:** Keep the warming hut.
- **Story:** Knows every bus driver by name. Taught your mother to snowplow on Dutch Meadows; she uses your middle name when she is serious.

#### 2. **Tom “Ledger” Keene — *The Refi***

- **Background:** Community banker who lost the last loan.
- **Bonus:** Borrow at 7% for the winter.
- **Constraint:** On a thaw day, guests lose 3 welcome points if at least three of the last seven days were thaws.
- **Story:** Abominable Snowglomerate calls him first, which creates tension on buyout offers. His version of each Vivian offer arrives a night early. Wrote small-hill loans for thirty years.

#### 3. **Riley Otis — *The Rigger***

- **Background:** Lift mechanic; can keep one marginal lift “limping” safely.
- **Bonus:** Spend 15% less on lift operations.
- **Constraint:** Must decline Vivian’s offer.
- **Story:** Rebuilt your first truck and your second one, and will not sell a bolt to the pass. Wind holds belong to Chief Dana Holt.

#### 4. **Dr. Amira Chen — *The Forecast***

- **Background:** Former NWS adjacent researcher; moved to valley for “quiet.”
- **Bonus:** See two days of forecasts and get a sharper outlook for tomorrow.
- **Constraint:** Guests expect 5% better snow.
- **Story:** “Ledger & Cocoa” segments explain weather in plain language, delivered as Maris radio flavor when Amira is the founder.

#### 5. **Juniper Hale — *The Preservationist***

- **Background:** Land trust liaison; clearing trees is politically visible.
- **Bonus:** Gain half a reputation point before rounding on a night with guests.
- **Constraint:** Lift lines and tree clearing cost 15% more.
- **Story:** Vermont land-trust politics arc, wired to the Maple Valley parcel bid against Vivian. Runs the land trust meetings and knows which trees the town will miss.

#### 6. **Marco Russo — *The Showman***

- **Background:** Ran a failed festival series; loves night skiing and music.
- **Bonus:** Earn 10% more from venues.
- **Constraint:** Pay $80 more per day.
- **Story:** Headliner beats at night and event set pieces (Brodie). Threw the best party Wilmington ever had, and the most expensive.

---

### Key NPCs (recurring)

| Name | Role | Systems touch |
|------|------|----------------|
| **Maris Shaw** | Route 100 Radio host (Concord, NH morning-show veteran, matching ART_DIRECTION) | Story delivery, tutorials, [Part 4](#part-4-lore-pantry) |
| **Nan** | Your grandmother (fiction); sold tickets at Dutch Hill for thirty winters; keeps the last punch card | Reputation, heritage, the last chair ritual. Text only, radio call-ins once or twice a winter, never voiced |
| **Chief Dana Holt** | Patrol captain | Wind holds, safety, lift inspections, snow-day crowd control |
| **Superintendent Al Waters** | School district; was your fourth-grade principal | Bus days, lesson seats; the reference that brings Maple Valley's call |
| **Vivian Cho** | Abominable Snowglomerate regional rep; skis your hill as a guest before she offers; appears every winter | Buyouts, poaching, race sponsorship, the coast offer (STORY.md §4.3) |
| **Frank Oka** | Garage & diesel | Groomer/snowmaking reliability events |
| **Hill locals** (one per later hill) | Lou Carvalho (Mount Tom), Rosa Merrill (Maple Valley), Kip Lavoie (Snow Valley), Gilles Fortin (Enchanted), Ada Whitcomb (Evergreen Valley), Mae Donnelly (Brodie), Walt Gagnon (Mount Whittier); all fiction | Each owns that hill's new mechanic and becomes its **caretaker** when you move on: a named ally who runs the departed hill on the coarse off-screen sim for income (STORY.md §5.4, §6.3) |

---

### Guest personas (simulation-facing)

Guests are **agents** with a **persona tag** affecting needs, venues, and mood weights. Show 4–8 visibly in UI; pool has more for variety.

| Persona | Wants | Pain points | Narrative color |
|---------|-------|-------------|-----------------|
| **First-Timer** | Lessons, gentle terrain | Falls, confusing signage | “Will they come back?” |
| **Saturday Regular** | Same lift, same burger | Queues, price hikes | Named after 3 visits |
| **Race Kid** | Training tow, gates | Ice, closed course | Home team storyline |
| **Park Rat** | Features, lunch skip | Thin coverage on landings | Weekly jam headline |
| **Family Pack** | Bathrooms, lunch seats, rentals | Crowding, broken T-bar | Bus-day correlation |
| **Luxury Weekender** | Lodge mood, steakhouse | Poor snow, tacky village | Ticket value sensitive |
| **Patrol Volunteer** | (special) | Wind, icy steeps | Unpaid help talent analog |

**Regulars** unlock after N visits: small portrait in Guests tab, one-line bio, reference in radio call-ins.

---

### Relationship to talents & crew

In **Story Mode (ICR Simple)**, overnight crew talent order is **framed as NPCs**:

- **Frank** teaches Rope Tow, Trail Guns, Groom Pass, Corduroy, Snow Fences, Bull Wheel Tune, Early Plow, Night Lights and Groomer Rebuild.
- **Dana** teaches Patrol Radio, Wind Hold, Volunteer Patrol and First Aid Hut.
- **Elena** teaches Ticket Booth, School Day, House Band, Café Shift, Heritage Sign, Ski School and Route 100 Billboard.

Same fixed priority idea as ICR **Build the Mountain**—but **named**, so radio can joke about their stubbornness.

In **Sandbox** (optional **ICR Complex** later), player may pick talents manually; NPCs comment in Story log instead.

---

### Writing guidelines

- New England **specific, not parody**—no excessive “wicked” tone.
- Humor from **operations** (corduroy, lift tickets, chowder), not from mocking guests.
- Abominable Snowglomerate speaks corporate-plain; locals speak concrete (*“the T-bar sounded like a coffee grinder”*).
- Player-facing copy follows the Voice section of [ART_DIRECTION.md](ART_DIRECTION.md#voice) (wry Vermont local); that section is the authority if this file disagrees.

---

### Cast expansion backlog

- [ ] Full voice casting / TTS policy
- [ ] 2–3 romance-free town B-plots (diner, hardware store) for flavor events
- [ ] Founder-linked **ultimate talent** cosmetic ( jacket color only )

---

## Part 3: Career mountains

**Scope:** Story Mode career uses **real place names** and **documented history**. Gameplay maps are **stylized**; terrain is not a GIS copy.

---

### Why real mountains

Same design contract as the reference genre leader: **lost and struggling New England ski areas** are the emotional substrate. Players recognize towns, pass names, and “that hill closed when I was a kid.”

**Sources we treat as public record** (heritage cards, loading screens, radio):

- [NELSAP](https://www.nelsap.org/) — lost area inventories by state  
- State ski history societies, local newspapers, area obituaries  
- USGS / town names for geography only  

**We invent:** your foreclosure timeline, Abominable Snowglomerate, fictional locals, exact dollar amounts, and “what you built last winter.”

---

### Legal / respect line

- **Do** use real mountain names, closure eras, and widely published facts.  
- **Do** credit “Inspired by New England ski history” in the game.  
- **Don’t** paste proprietary trail maps, logos, or lifted copy from other games.  
- **Don’t** imply endorsement by living areas or families.  
- Sensitive closures: tone is **dignified memory**, not mockery.  
- **Revival games on closed hills:** credit NELSAP/DHASH; player rebuild is fiction, not USFS lease claim.

---

### Career progression (v1 roster, proposed, pending owner)

Order follows the reference pattern: **warmer / smaller / more indebted → colder / steeper / more capital**. Dutch Hill is the smallest hill on the list by vertical and by every other measure. Full per-hill design, difficulty table, caretakers and surprise catalog: [STORY.md §5](./STORY.md#5-mountain-roster-and-progression). Heights and lift history are **approximate** for design. Figures marked † disagree between sources; **verify before shipping** any of them in player copy.

The roster below replaces the v0 list. Tenney, Crotched West and Hogback are removed from the career (STORY.md decision D1, **proposed, pending owner**); the reasons follow the table.

| Act | Mountain | State | Design role | Real-history hook (public) |
|-----|----------|-------|-------------|----------------------------|
| I | [**Dutch Hill**](https://www.nelsap.org/vt/dutch1.html) | VT | **Career start**: rural, dead, 570 ft | Heartwellville/Readsboro; **1944–1985**; no late snowmaking; [DHASH](https://www.dhash4vt.org/dutch-hill) |
| II | [**Mount Tom**](https://www.nelsap.org/ma/mttom.html) | MA | Night session and guns from day 1; warm valley, thaws often | Holyoke; 680 ft; lit and snowmade on every trail; **1962–1998** |
| II | [**Maple Valley**](https://www.nelsap.org/vt/maplevalley.html) | VT | Season-long school program, tubing, a land parcel | Dummerston, **Windham County**; 841–1,017 ft†; **1963–2000**; closed since 2000 |
| III | [**Snow Valley**](https://www.nelsap.org/vt/snowvalley1.html) | VT | Riders and a shared guest pool with a pass resort next door | Winhall; about 900 ft†; about 1941–1984; hosted the 1983 and 1984 national snowboarding championships |
| III | [**Enchanted Mountain**](https://nelsap.org/me/enchanted.html) | ME | Wind and isolation: storm road closures, wind holds | Near Jackman; about 1,000 ft† (brochures claimed up to 1,800); about 1966–1974 |
| III | [**Evergreen Valley**](https://www.nelsap.org/me/evergreen.html) | ME | Lease covenant: a landlord with conditions | Stoneham; 1,050 ft†; **1972–1982**; federal land lease |
| IV | [**Brodie Mountain**](https://www.nelsap.org/ma/brodie.html) | MA | Night skiing at scale and events | New Ashford; 1,250 ft advertised; **1964–2002**; night skiing pioneer |
| IV (finale) | [**Mount Whittier**](https://www.nelsap.org/nh/mtwhit.html) | NH | Gondola, two bases, lift reliability | West Ossipee; 1,100–1,650 ft†; gondola across Route 16; before 1949 to about 1985 |
| V+ | NELSAP pool MA/NH/VT/ME | — | Endgame variety | Caretaker sim |

**Removed from the career**

| Hill | Why | Where it lives now |
|---|---|---|
| Tenney Mountain, NH | Reopened for skiing in March 2018 and again for 2022–23; reported operating through at least early 2025. A living area cannot be reopened by the player without implying something about its owners | Not in the game |
| Crotched West, NH | The western side was rebuilt in 2003 and is today's operating Crotched Mountain, owned by Vail Resorts. It sits too close to our fictional megapass | Not in the game |
| Hogback Mountain, VT | Published vertical of 460 to 500 ft is smaller than Dutch Hill's; the land is town-owned conservation land open to the public | **Lore only:** radio mentions and a locked Atlas pin with a history line |

**Correction:** Maple Valley is in Dummerston, **Windham County**. The v0 table said Windsor County, which is wrong.

**Sandbox:** any template mountain OR **“generic 1,200 ft NE hill”** without story beats. Sandbox does not use the Story Mode roster order, cast or beats. Capitalist Mode may reuse these hills (STORY.md §6.4).

---

### Per-mountain deliverables (Story Mode)

Each career peak gets a **Heritage Card** (1 screen):

1. **Opened / went quiet** (year range, sourced)  
2. **What locals miss** (one sentence, dignified)  
3. **What you’re trying to restore** (game goal: bus, night skiing, school program, events, etc.)  
4. **NELSAP “read more”** link (external, optional)
5. **Your winter** (added once you play the hill): “Reopened by {name}. Winter {n}: {score}. Last chair, day 28.”

Every heritage card states “Inspired by New England ski history. Buildings and events in the game are fiction on a real place” and credits NELSAP. Name no real owners, families or living businesses.

Terrain archetype tags (for sim): `southern_thaw`, `family_ropetow`, `exposed_summit`, `gondola_vintage`, `night_show`, `wind_isolated`, `lease_covenant`, `rider_market`.

---

### Map UI (career hub)

- **New England silhouette** — MA, NH, VT, ME pins (ME optional late).  
- **Ice Coast** label optional in UI (nickname for packed snow / NE freeze-thaw — see [Part 4](#part-4-lore-pantry)).  
- Locked peaks show real name + one-line history blurb.
- Each hill is a dot in one of three colors: yours, the pass’s, or the forest’s. The dots decide the ending (STORY.md §6.3, §8).

---

### Implementation order

Ship **Dutch Hill only** through the MVP (M3 in [MASTER_PLAN](./MASTER_PLAN.md#9-roadmap)); Mount Tom (replacing Tenney, row 36) and caretaker follow in M5, with the remaining hills in M7 or later (STORY.md D5, proposed, pending owner). Update the roster table when locking elevation, lift type, and opening scenario per peak.

---

## Part 4: Lore pantry

A **writer’s pantry** for radio, heritage cards, tooltips, and story beats. Facts below are **public regional history and folklore**; game events remain fictional.

Use this part when drafting copy. Tie beats to [Part 3](#part-3-career-mountains).

---

### 1. The Ice Coast (identity)

**“Ice Coast”** is skier slang for **New England**: freeze–thaw, scraped groomers Tuesday, powder on Thursday, rain on Saturday. The game leans into **honest conditions**—not marketing fluff.

**Narrative use:**

- Radio hosts joke about **corduroy vs boilerplate**.  
- Tutorial beat: guests happy on **fresh**; mad on **refrozen granular** (satisfaction teaching).  
- Contrast with “West Coast blower” only as one-liner—this game is **home**.

---

### 2. Lost hills (the wound)

Hundreds of NE areas operated rope tows and T-bars after WWII; consolidation, insurance, snow inconsistency, and megapasses erased many ([NELSAP](https://www.nelsap.org/) catalogs **MA 172+, NH 173+, VT 113+, ME 79+** lost entries).

**Player fantasy:** not museum curation—**reopen the ticket window**.

**Respectful lines we use:**

- “The rope tow isn’t coming back, but the **hill might**.”  
- “Kids still learn on Magic, but they **used to learn here too**.”

**Avoid:** gloating over bankruptcies; naming living operators’ failures.

---

### 3. 10th Mountain & military ski thread

**10th Mountain Division** (WWII mountain troops) links Army service, training at Camp Hale, and postwar ski industry builders. New Hampshire and Vermont still name trails and glades for them.

**Lore drops:**

- Founder **Riley Otis** can reference **mechanic discipline** from service without copying a real person’s biography.  
- Optional beat: **veteran patrol volunteer** talent analog.  
- Real event anchor: **Hannes Schneider Meister Cup at Cranmore** (NH) — **Arrival-style community race**, not plot dependency.

---

### 4. Arlberg / ski school lineage

**Hannes Schneider** (Austria → North Conway / Cranmore) spread the **Arlberg teaching method** in the US. NE ski schools still teach wedeln descendants.

**Gameplay:**

- Ski school revenue beat on **Dutch Hill** (one bus), growing into **Maple Valley**’s season-long district program.  
- Radio: “Lesson 1 is still **stand on the downhill ski**.”

---

### 5. Engineering & rivers (James B. Francis thread)

Boston’s industrial age built **Lowell / Lawrence** mills; **James B. Francis** (Lowell Hydraulic Experiments) is a real New England engineering hero. ICR’s “Lifer” founder nods to **craft engineers** who keep lifts alive.

**Our founder parallel:** **Riley Otis — The Rigger** — overnight repairs, no sellout to Abominable Snowglomerate.

**Lore:** “The headgate doesn’t care about your feelings” — **mill race mentality** applied to lift maintenance.

---

### 6. Land, forest, and the 4000-footers

NE skiing is **forested**, not alpine bowls. Clearing runs was **literal logging**; glades are **managed forest**, not wild wilderness.

**Talents / beats:**

- Preservationist founder: **clearing is political**.  
- Real reference: **Land conservation vs trail expansion** fights in VT and MA.

**White Mountains** preside over career northward; **Presidential Range** weather as late-game **wind hold** education.

---

### 7. Megapass era (fiction on real trend)

Real history: **Ikon / Epic / Indy** reshaped pass economics; locals debate **skiing as subscription**.

**Fictional Abominable Snowglomerate** stands in for consolidation pressure—**do not** use Epic/Vail trademarks in UI.

**Lore lines:**

- “They’re not evil; they’re **amortizing a gondola**.”  
- “Independents survive on **Friday night leaguers** and **school contracts**.”

---

### 8. School bus & town recreation

Before destination resorts, **town hills** (Wayland, Topsfield, Thunder Mountain, dozens in MA alone) taught generations on rope tows.

**Story beats:**

- Superintendent calls about **Tuesday bus** if you cancel mid-season.  
- Municipality offers **cheap lease** if you keep **lesson seats** for residents.

---

### 9. Night skiing pioneer folklore

**Brodie Mountain (MA)** marketed among the first **night skiing** experiences—lights on a modest vertical. Brodie is a **showmanship** mountain in career roster.

**Founder **Marco Russo** — events, après, night lights narrative.**

---

### 10. Weather proverbs (gameplay-flavored)

Real NE operator wisdom (paraphrase for radio):

| Saying | Sim meaning |
|--------|-------------|
| “Thaw on Monday, ice on Wednesday.” | Groom after thaw; satisfaction hit |
| “If Jay got it, you might in an hour.” | Storm track; snow timing |
| “The lot fills when the plow hits the county road.” | Access road beat (110% village) |
| “Wind holds spend money whether guests ski or not.” | Fixed costs lesson |

---

### 11. Red Sox / Bruins / town identity (texture)

Apres doesn’t need broadcast rights—**texture only**: café TVs, “Game 7” Saturday crowd, **hot chocolate > craft IPA** on school days.

---

### 12. Literature & town character (light touch)

New England **Melville / Hawthorne / Robert Frost** territory—**frost heaves and stone walls**, not homework.

Use for **founder flavor**:

- **Juniper Hale — Preservationist** ↔ land ethics without pasting Scarlet Letter plot.  
- Frost: “**Miles to go** before you sleep” on closing bell (public domain poem).

---

### 13. Radio & NPC voice guide

| Voice | Lore job |
|-------|-----------|
| **Maris Shaw** | Concord NH radio veteran; pronounces Worcester wrong on purpose |
| Call-ins | Real town names near active mountain |
| Abominable Snowglomerate rep | Boston office, skis twice a season |
| Patrol chief | References **4437** culture without hero worship |

**Boston vs Albany media markets:** eastern MA hills “live or die on the Pike”; western MA / VT on **I-91**.

---

### 14. Act I beats (Dutch Hill)

Beat table and ship notes live in **[Part 1](#part-1-dutch-hill-act-i)** — do not duplicate here. Lore accents for copy: §15 stash below.

---

### 15. Dutch Hill lore stash (Act I)

- **Heartwellville** naming; southern Vermont **snow belt** (~110″ lore) vs closing anyway.  
- **Alpenwald** across-the-street development failure — optional economic B-text.  
- **1990 lodge burn** — mention only with dignity (fire dept training).  
- Trails: **Dutch Meadows**, **Windmill** steep — sign names for level design, not copied layout.  
- Accents: “last adult ticket **$6**”; Route 100 plates; Readsboro/Wilmington bus; no snowmaking opening; Abominable Snowglomerate map-dot pressure; Nan’s punch card; winter review → the call from Mount Tom.

---

### 16. Where lore must not block simplicity

- **No quiz** on history.  
- Heritage card = **optional** read.  
- One lore sentence per night recap max unless player opens Story log.

---

### References (team)

- NELSAP state indexes: [MA](https://www.nelsap.org/ma/ma.html), [NH](https://www.nelsap.org/nh.html), [VT](https://www.nelsap.org/vt.html), [ME](https://www.nelsap.org/me/me.html)  
- NE Ski Museum (Franconia) — exhibit tone reference  
- Public domain / fair-use: historic photos **only** when licensed for ship
