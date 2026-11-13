# Last Chair — implementation roadmap

## Architecture (Vercel + 3D web)

```
web/                          # Next.js 16 App Router (deploy root on Vercel)
├── src/app/                  # marketing + game shell routes
├── src/game/                 # simulation (pure TS, testable)
├── src/render/               # React Three Fiber scene
├── src/ui/                   # design-system panels
└── public/assets/            # GLB, audio, textures (Blender exports)

docs/                         # design references (this folder)
```

### Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Hosting | **Vercel** (Git integration → `cholula-cloud/last-chair`) | Preview deploys, edge-friendly static assets |
| App shell | **Next.js** | SEO for marketing; route `/play` for game |
| 3D | **Three.js + React Three Fiber + drei** | Browser parity with ICR; strong React UI pairing |
| State | **Zustand** + **immer** | Pause-friendly game state |
| Sim tick | **Web Worker** (phase 1b) | Keep 60fps while simulating guests |
| Save | **IndexedDB** → later **Supabase** auth sync | Match ICR cloud save fantasy |
| Art | **Blender 4.x** → GLB | User-requested pipeline |

### Repo layout note

Next.js lives in **`web/`** because the repo root is Git-only initially. Vercel project **`last-chair`** should use **Root Directory = `web`**.

---

## Phased delivery

### Phase 0 — Foundation (current sprint)

- [x] Game design analysis + improvement plan docs
- [x] Next.js scaffold in `web/`
- [ ] Link Vercel ↔ GitHub (`create_git_project` / dashboard) with root `web`
- [ ] Marketing landing + “Play (preview)” stub
- [ ] CI: `npm run build` on push

### Phase 1 — Vertical slice (playable week)

**Target:** One mountain, 7 days, one lift, one run, 50 guests, closing recap.

- Heightfield terrain + snow overlay shader
- Place T-bar / chair (line tool)
- Guest spawner + simple path down slope
- Day clock 6am–4pm, overnight snow tick
- UI: fare slider, operating budget, cash + satisfaction

**Exit criteria:** Player can fix a queue problem and see satisfaction move next day.

### Phase 2 — Build loop

- Trail drawing + difficulty calc
- Snow guns + groomer assignment UI
- Lodge + one café (capacity + revenue)
- Finance triad: income, balance, cash flow (simplified)

### Phase 3 — Career + talents (MVP subset)

- 15 talents (5 per tree) proving prerequisites + facility gates
- Second mountain unlock + caretaker idle income
- 2 founders with distinct rules

### Phase 4 — Content & polish

- Blender asset pass (village kit v1)
- Narrative beats + radio
- Mobile UX pass + performance budget (draw calls, instancing)
- Hill Cup / daily challenge

### Phase 5 — Parity expansion

- Remaining talents/sets, full 28-day season rules, full founder roster
- Cloud accounts + cross-device save

---

## Engineering conventions

- **Simulation code** has zero React imports (unit test with Vitest).
- **Deterministic seeds** for QA replays.
- **Feature flags** in `src/game/flags.ts` for Simple vs Director modes.

---

## Vercel / cholula-cloud checklist

| Step | Status |
|------|--------|
| Vercel MCP authenticated | ✅ (`list_teams` works) |
| Project `last-chair` exists (Organicin team) | ✅ |
| GitHub repo `cholula-cloud/last-chair` | ✅ |
| Git ↔ Vercel link with `rootDirectory: web` | ⏳ run after push |
| Production domain (`last-chair-iota.vercel.app` on GH homepage) | ⏳ attach after first deploy |
| Vercel CLI on agent VM | ✅ user prefix; **CLI login** needs user OAuth if not using MCP deploy |

### Deploy commands (after link)

```bash
cd web && npm run build
# MCP: create_deployment or push to main → auto deploy
```

---

## Immediate next coding tasks

1. Add `@react-three/fiber`, `three`, `@react-three/drei` to `web`.
2. `/play` route with empty `MountainScene` and pause overlay.
3. `SimState` types mirroring manual sections (guest, lift, snow, day).
4. Blender: blockout **Warming Hut + T-bar** as first GLB.
