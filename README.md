# Last Chair

A cozy 3D ski-hill tycoon for the browser, built for iPhone and iPad Safari first. Reopen Dutch Hill, a real Vermont ski area that closed in 1985, and run one more winter: watch tiny skiers by day, set ticket fare and snow & service by night, and grow a career across lost New England hills.

**Play:** https://cholula-cloud.github.io/last-chair/play/

## Docs

| Doc | What it is |
|---|---|
| [docs/MASTER_PLAN.md](./docs/MASTER_PLAN.md) | **Start here.** Game plan and design: story, modes, build experience, roadmap, how we work |
| [docs/STORY.md](./docs/STORY.md) | **Story Mode bible.** Player backstory, Cold Open, cast, surprise catalog, New England roster, and N track |
| [docs/SIMULATION_SPEC.md](./docs/SIMULATION_SPEC.md) | Numbers and formulas, with implemented-vs-spec status |
| [docs/WORLD.md](./docs/WORLD.md) | Dutch Hill, cast, founders, career mountains, lore |
| [docs/ART_DIRECTION.md](./docs/ART_DIRECTION.md) | Look, palette, scene layout, asset pipeline |
| [docs/TESTING.md](./docs/TESTING.md) | Test layers and device playtest scripts |
| [docs/reference/](./docs/reference/ICE_COAST_REVIVAL_GAME_ANALYSIS.md) | Ice Coast Revival analysis, including Steam patch history |

## Development

The app lives in `web/` (Next.js 16, React 19, React Three Fiber, Zustand, Tailwind 4).

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000/play. `/` is the landing page.

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next route types, then `tsc --noEmit` |
| `npm test` | Vitest unit tests (`npm run test:watch` to watch) |
| `npm run check` | Lint, typecheck, test, build, stopping at the first failure |
| `npm run playtest:smoke` | Fast Playwright smoke (Chromium 390×844) |
| `npm run playtest:p0` | Full operating-calendar Playwright winter (18 open days on Dutch Hill, 21 on Act II+) |

CI **`check`** (lint, typecheck, test, m2-gate, build, bundle) runs on every PR. Player-visible changes also run **`e2e-pr`** (one Chromium smoke). Full browser matrix runs **nightly** (`e2e-nightly.yml`).

## Deploy (GitHub Pages)

The game is fully client-side, so `next build` writes a static site to `web/out/`. The [Pages workflow](./.github/workflows/pages.yml) builds and publishes it on every push to `main` (and on demand from the Actions tab).

| Item | Value |
|---|---|
| Play | https://cholula-cloud.github.io/last-chair/play/ |
| Base path | `/last-chair`, set by the workflow through `PAGES_BASE_PATH`; empty for local dev |
| Repo setting | Settings → Pages → Source = **GitHub Actions** |

Smoke test after a deploy: `/last-chair/` and `/last-chair/play/` load, and the 3D models appear.

## Credits

Dutch Hill history from [NELSAP](https://www.nelsap.org/vt/dutch1.html) and [DHASH](https://www.dhash4vt.org/dutch-hill). Structures and events in the game are fiction on a real place. Inspired by New England ski history and the ski-tycoon genre; no assets, code or names are taken from other games.
