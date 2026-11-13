# Last Chair

**Slopes tycoon** — bring lost New England ski hills back to life. **Browser-first**, built for **iPhone, iPad, and desktop** — [cholula-cloud](https://github.com/cholula-cloud).

## Docs

Planning index: **[docs/README.md](./docs/README.md)**

| Start here | |
|------------|--|
| [Game design bible](./docs/GAME_DESIGN_BIBLE.md) | Vision + why Last Chair |
| [Feel scorecard](./docs/FEEL_SCORECARD.md) | P0/P1 ship gates |
| [Platform & mobile](./docs/PLATFORM_MOBILE.md) | Touch UX, Safari QA |
| [Simulation spec](./docs/SIMULATION_SPEC.md) | Dutch Hill v0 numbers |
| [Implementation roadmap](./docs/IMPLEMENTATION_ROADMAP.md) | Engineering phases |
| [P0 playtest script](./docs/PLAYTEST_P0.md) | iPhone Safari gate |
| [Ice Coast Revival analysis](./docs/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) | ICR reference |

## Development

```bash
cd web
npm install
npm run dev
```

Open `/play` for the vertical slice (React Three Fiber + day/night loop).

## Deploy

The Next.js app is in **`web/`**. Vercel project **last-chair** uses root directory `web` and GitHub `cholula-cloud/last-chair`.
