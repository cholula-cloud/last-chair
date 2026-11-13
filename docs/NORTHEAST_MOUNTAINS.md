# Last Chair — Northeast mountains (career map)

**Version:** 0.3 · **Updated:** 2026-11-13  
**Scope:** Story Mode career uses **real place names** and **documented history**. Gameplay maps are **stylized**; terrain is not a GIS copy.

---

## Why real mountains

Same design contract as the reference genre leader: **lost and struggling New England ski areas** are the emotional substrate. Players recognize towns, pass names, and “that hill closed when I was a kid.”

**Sources we treat as public record** (heritage cards, loading screens, radio):

- [NELSAP](https://www.nelsap.org/) — lost area inventories by state  
- State ski history societies, local newspapers, area obituaries  
- USGS / town names for geography only  

**We invent:** your foreclosure timeline, SummitLink, fictional locals, exact dollar amounts, and “what you built last winter.”

---

## Legal / respect line

- **Do** use real mountain names, closure eras, and widely published facts.  
- **Do** credit “Inspired by New England ski history” in the game.  
- **Don’t** paste proprietary trail maps, logos, or lifted copy from other games.  
- **Don’t** imply endorsement by living areas or families.  
- Sensitive closures: tone is **dignified memory**, not mockery.  
- **Revival games on closed hills:** credit NELSAP/DHASH; player rebuild is fiction, not USFS lease claim.

---

## Career progression (v0 roster)

Order follows the reference pattern: **warmer / smaller / more indebted → colder / steeper / more capital**. Heights and lift history are **approximate** for design; verify before ship copy.

| Act | Mountain | State | Design role | Real-history hook (public) |
|-----|----------|-------|-------------|----------------------------|
| I | [**Dutch Hill**](https://www.nelsap.org/vt/dutch1.html) | VT | **Career start** — rural, dead | Heartwellville/Readsboro; **1944–1985**; no late snowmaking; [DHASH](https://www.dhash4vt.org/dutch-hill) |
| II | [**Tenney Mountain**](https://www.nelsap.org/nh/tenney.html) | NH | Lost-hill fight | Plymouth; reopening attempts |
| II | [**Maple Valley**](https://www.nelsap.org/vt/maplevalley.html) | VT | Family economy | Windsor County; long closure |
| III | [**Mount Whittier**](https://www.nelsap.org/nh/whittier.html) | NH | Lift reliability | Ossipee; gondola-era memory |
| III | [**Hogback Mountain**](https://www.nelsap.org/vt/hogback.html) | VT | Glades & wind | Marlboro edge; steep |
| IV | [**Brodie Mountain**](https://www.nelsap.org/ma/brodie.html) | MA | Night ski lore | New Ashford; lights & racing |
| IV | [**Crotched West**](https://www.nelsap.org/nh/crotchedwest.html) | NH | Split-area politics | Peterborough region |
| V+ | NELSAP pool MA/NH/VT/ME | — | Endgame variety | Caretaker sim |

**Sandbox:** any template mountain OR **“generic 1,200 ft NE hill”** without story beats.

---

## Per-mountain deliverables (Story Mode)

Each career peak gets a **Heritage Card** (1 screen):

1. **Opened / went quiet** (year range, sourced)  
2. **What locals miss** (one sentence, dignified)  
3. **What you’re trying to restore** (game goal: bus, night skiing, race program, etc.)  
4. **NELSAP “read more”** link (external, optional)

Terrain archetype tags (for sim): `southern_thaw`, `family_ropetow`, `exposed_summit`, `gondola_vintage`, `night_show`.

---

## Map UI (career hub)

- **New England silhouette** — MA, NH, VT, ME pins (ME optional late).  
- **Ice Coast** label optional in UI (nickname for packed snow / NE freeze-thaw — see [NORTHEAST_LORE.md](./NORTHEAST_LORE.md)).  
- Locked peaks show real name + one-line history blurb.

---

## Implementation order

1. **Dutch Hill** — only mountain in Phase A ([FEEL_SCORECARD](./FEEL_SCORECARD.md)); start **no snowmaking**, surface lift.  
2. **Tenney** — mountain 2 + caretaker.  
3. **Maple Valley** — mountain 3.  
4. Remaining peaks — post-parity / 110% pass.

Update this table when locking elevation, lift type, and opening scenario per peak.
