# P1 playtest script (~45–60 min)

**Gate:** [FEEL_SCORECARD.md](./FEEL_SCORECARD.md) P1 · **Devices:** iPhone or iPad Safari (required for sign-off)

**Season length in build:** 14 days (internal shortcut; same loop as 28).

## Setup

1. Open `/play` (prod or `cd web && npm run dev`).
2. Clear site data once if migrating from P0 (`last-chair-v0` → `last-chair-v1`).

## Script

| Step | Action | Pass if |
|------|--------|---------|
| 1 | Pick a founder | Modifiers listed; day HUD appears Day 1/14 |
| 2 | Unpause → read morning headline + weather | Clock advances; ops strip readable |
| 3 | Guests → Follow | Follow ring / camera nudge |
| 4 | Build → surface + chair slots; buy lodge/café/guns | Valid/invalid descent; cash drops; mountain feedback |
| 5 | Close hill → fare + snow; radio beat if shown | Bottom sheet; Got it before Sleep when beat fires |
| 6 | Sleep several mornings | Snow/groom/guns visible after Mid/High; crew talent toast |
| 7 | Reach Day 14 → Winter review | Cash/rep/beats/talents summary; Tenney pin |
| 8 | Continue → mountain 2 stub → Replay | Stub copy; new winter starts |

## External sign-off

- [ ] Player A (phone/tablet) finished winter 1  
- [ ] Player B finished winter 1  
- [ ] Player C finished winter 1  

Log friction in a GitHub issue with device + OS version.

## Agent verification

Automated Chromium iPhone viewport script: `web/scripts/playtest-p0.mjs` (founder → day loop → winter review).
