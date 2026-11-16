# Last Chair

A cozy 3D ski-hill tycoon for the browser, built for iPhone and iPad Safari first. Reopen Dutch Hill, a real Vermont ski area that closed in 1985, and run one more winter: watch tiny skiers by day, set ticket fare and snow & service by night, and grow a career across lost New England hills.

**Play:** https://last-chair-iota.vercel.app/play

## Docs

| Doc | What it is |
|---|---|
| [docs/MASTER_PLAN.md](./docs/MASTER_PLAN.md) | **Start here.** What the game is, how it differs from Ice Coast Revival, architecture, PR roadmap |
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
| `npm run smoke:winter` | Playwright: founder pick → full winter → review |
| `npm run playtest:p0` | Playwright: P0 playtest steps at iPhone viewport |

Unit tests and a single `npm run check` arrive in PR 2 (see the roadmap).

## Deploy (Vercel)

Production lives on one Vercel team only: [cholula-clouds-projects / last-chair](https://vercel.com/cholula-clouds-projects/last-chair). Do not create projects for this repo on other teams.

| Item | Value |
|---|---|
| GitHub repo | `cholula-cloud/last-chair` |
| Root Directory | **`web`** |
| Production URL | https://last-chair-iota.vercel.app (`/play` for the game) |

Pushes to `main` deploy through the Git integration. On the latest `main` commit, the Vercel check should be green and link to a deployment under cholula-clouds-projects.

**If the site 404s** (usually no production deployment assigned, or the wrong root directory):

1. Project → **Settings → General → Root Directory** = `web` → Save.
2. **Deployments** → latest green `main` deploy → **⋯ → Promote to Production**.
3. **Settings → Domains** → confirm `last-chair-iota.vercel.app` is on this project.
4. **Settings → Deployment Protection** → allow public visitors on the production domain.

Smoke test: `/` and `/play` load without a Vercel login.

**Optional deploy hook** (only if Git deploys are unreliable): Vercel → Settings → Git → Deploy Hooks → create one for `main`; add it to GitHub repo secrets as `VERCEL_DEPLOY_HOOK_URL`.

## Credits

Dutch Hill history from [NELSAP](https://www.nelsap.org/vt/dutch1.html) and [DHASH](https://www.dhash4vt.org/dutch-hill). Structures and events in the game are fiction on a real place. Inspired by New England ski history and the ski-tycoon genre; no assets, code or names are taken from other games.
