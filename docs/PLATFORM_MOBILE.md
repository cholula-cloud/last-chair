# Last Chair — platform & mobile

**Version:** 0.1 · **Updated:** 2026-11-13  
**Delivery:** **Browser-first** (URL, no store for v1). **Design & QA:** **iPhone + iPad Safari primary**; desktop Chrome is dev convenience and optional play.

---

## Product intent

Players open Last Chair in **Safari on phone or tablet** — couch, lodge Wi‑Fi, après — not at a 27″ monitor. UI and performance targets assume **touch, thumb reach, and WebGL on iOS**.

ICR ships the same way; our wedge is **mobile-native night flow and sheets**, not a scaled-down desktop layout.

---

## QA device matrix

| Tier | Devices | Role |
|------|---------|------|
| **P0 gate** | iPhone (notch, Safari), iPad 11" (Safari) | Every vertical-slice PR |
| **P1** | iPhone SE width (narrow), iPad landscape | Layout stress |
| **Secondary** | Desktop Chrome / Firefox | Dev only; ship only after mobile green |

Test with **Add to Home Screen** optional smoke — still a browser tab for v1 (no Capacitor requirement).

---

## Orientation

| Surface | Default | Notes |
|---------|---------|-------|
| **iPhone** | **Landscape** for 3D day view | HUD along top/side; thumb on bottom ops strip |
| **iPhone** | **Portrait OK** for night recap / career sheets | Full-width tiles |
| **iPad** | **Landscape** for build + diorama | Wider FOV; optional split when sheets open |
| **Desktop** | Landscape | Same layout as iPad where possible |

Do not require rotation mid-session except when opening full-screen night recap (optional portrait nudge — never block continue).

---

## Safe areas & layout

- Respect `env(safe-area-inset-*)` on notch / home indicator.
- Primary actions in **bottom third** (thumb zone).
- Min touch target **44×44 CSS px** (night fare + snow/service tiles larger: full-width, 56px+ height).
- No hover-only affordances.

---

## Touch controls

| Gesture | In explore mode | In build mode |
|---------|-----------------|---------------|
| **One finger drag** | Pan camera | Pan camera |
| **Pinch** | Zoom | Zoom |
| **Tap** | Select guest / lift / building | Place confirmed preview |
| **Two-finger** | — | Disabled while placing to avoid accident |

**Build mode** is an explicit toggle — no accidental placements from pan.

**Follow guest:** tap guest in **Guests sheet** (list), not required pick in 3D on phone.

---

## UI patterns (mobile-primary)

- **Day HUD:** compact top bar — pause, day clock, cash; collapsible **ops strip** (queue hint, snow icon, satisfaction).
- **Build / Guests:** **bottom sheets** (half or full height), not desktop side panels.
- **Night recap:** **bottom sheet** — two presets (Fare · Snow & service) + Continue; readable without pinch-zoom.
- **Ledger / career:** stacked cards; no multi-column finance tables on phone.

See [FEEL_SCORECARD.md](./FEEL_SCORECARD.md) P0 acceptance.

---

## WebGL & performance budgets (v1 targets)

Tunable in playtest; start here:

| Knob | iPhone target | iPad target |
|------|---------------|-------------|
| Simulated guests (active) | 20–30 | 40 |
| Drawn guest meshes | ≤24 | ≤48 |
| Trees | Instanced; LOD past mid distance | Same |
| Frame budget | 30fps acceptable on mid iPhone | 60fps stretch |
| Texture | ≤2K heightfield; Draco GLB per art doc | Same |

**Low power:** optional setting (post-P0) — fewer guests drawn, no follow camera swing.

**Sim tick:** fixed step in worker or main thread; when tab hidden (`document.visibilityState`), pause day clock and optionally flush save (see [SIMULATION_SPEC.md](./SIMULATION_SPEC.md)).

---

## iOS Safari specifics

- **Audio:** user gesture before Mountain Radio bed (future); v0 text-only beats need no unlock.
- **Memory:** avoid duplicating heightfield on CPU + GPU; single source of truth.
- **Workers:** guest sim may run in `Worker`; reconcile with R3F on main thread via posted snapshots at ≤10 Hz for rendering.
- **120Hz:** prefer `requestAnimationFrame`; no assumed fixed 60.

---

## Session targets (design)

- **Night flow:** fare + snow/service + continue in **≤90 seconds** of taps (no hunting).
- **First day:** one full loop completable **one-handed in landscape** (pause → optional build → close → night).

---

## References

- [GAMEPLAY_AND_FLOW.md](./GAMEPLAY_AND_FLOW.md) — session flow  
- [ART_DIRECTION.md](./ART_DIRECTION.md) — FOV, palette  
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) — Phase A1 exits on iOS Safari  
