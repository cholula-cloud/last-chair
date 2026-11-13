# P0 playtest script (~15 min)

**Gate:** [FEEL_SCORECARD.md](./FEEL_SCORECARD.md) P0 · **Devices:** iPhone Safari (required), iPad Safari (recommended)

## Setup

1. Open `/play` (prod or `npm run dev` in `web/`).
2. Add to Home Screen optional smoke — still a tab for v1.

## Script

| Step | Action | Pass if |
|------|--------|---------|
| 1 | Tap **▶** to unpause | Clock advances; guests move on mountain |
| 2 | Read top HUD | Day, time, cash visible without zoom |
| 3 | Read **ops strip** (bottom) | Queue, snow %, mood hint visible |
| 4 | Tap **Guests** → **Follow** one guest | List works; follow toggles |
| 5 | Tap **Build** → try invalid slot → valid slot → **Place lift** | Red/green descent message; place only when valid |
| 6 | Tap **Close hill** (or wait until 4 PM) | Night sheet opens |
| 7 | Change **Fare** and **Snow & service** | Full-width tiles, no pinch to read |
| 8 | Tap **Sleep** | Morning; snow color shifts with tier |
| 9 | Reload tab | Progress restores (local save) |

## Debrief (ask player)

- Why did you change fare or snow tonight?
- Anything buried or too small on phone?

Log friction in a GitHub issue with device + iOS version.
