# Last Chair — implementation roadmap

**Version:** 0.3 · **Updated:** 2026-11-13  
**Focus:** **99% ICR parity in Story Mode** → Sandbox → **110% pass**

---

## Principles

1. **Story Mode = ICR Simple loop** + light narrative hooks.
2. **Don't over-simulate:** defer Director ops and full accounting UI.
3. **Sandbox** after Hemlock day-loop is fun.
4. **110%** features only from [IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md).

---

## Architecture

Unchanged: `web/` Next.js + R3F + Zustand + worker sim + Blender GLB.

```
web/src/game/     # pure TS sim (ICR rules)
web/src/render/   # R3F
web/src/ui/       # night recap, build sheets
```

---

## Phase A — 99% parity core (Story Mode)

### A1 Vertical slice

- [ ] Day / pause / close
- [ ] One lift, descent check, 20 guests, follow
- [ ] Night: fare + snow/service presets
- [ ] Cash + satisfaction one-liners

### A2 One winter (simplified)

- [ ] 28-day calendar (can shorten for internal test to 14)
- [ ] Weather stubs (snow, thaw)
- [ ] Warming hut → build menu basics
- [ ] Crew overnight + talents 1–10 (order list from analysis doc)

### A3 Story Mode shell

- [ ] Founder pick (stats only, minimal copy)
- [ ] 6 story beats Act I (radio text)
- [ ] Career hub: map placeholder, level, talent progress read-only

### A4 Parity expansion

- [ ] Trails draw, 2 lift types, snow guns, groom visible
- [ ] Café + shop; lodge tier 1→2
- [ ] Winter review; mountain 2 stub; caretaker idle $ 
- [ ] Crew talents → 25+; satisfaction breakdown on tap

**Exit:** Side-by-side with ICR Simple on comparable hill—same verbs, our art.

---

## Phase B — Sandbox

- [ ] Main menu: Story | Sandbox
- [ ] Economy toggles, no story
- [ ] Save slots
- [ ] Optional: all talents / unlimited $

**Exit:** Streamers can build without debt anxiety.

---

## Phase C — 110% pass

Only after [IMPROVEMENTS_PASS.md](./IMPROVEMENTS_PASS.md) gate.

---

## Vercel

**Project:** [cholula-cloud's last-chair](https://vercel.com/cholula-clouds-projects/last-chair)  
**Repo:** `cholula-cloud/last-chair` · **Root Directory:** `web`

| Check | Notes |
|-------|--------|
| Git connected | User confirmed; ensure pushes to `main` deploy |
| Production deploy | Page showed **No Production Deployment** earlier—first green `main` build should fix |
| Duplicate project | Agent MCP also sees `last-chair` under another team; use **cholula-cloud** project for prod |

CLI on VM: logged out; deploy via Git push or dashboard.

---

## Open engineering tasks (now)

1. `web/src/game/` types from ICR manual rules
2. R3F heightfield scene on `/play`
3. Night recap UI (2 tiles + continue)
