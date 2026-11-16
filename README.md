# Last Chair

**Slopes tycoon** — bring lost New England ski hills back to life. **Browser-first**, built for **iPhone, iPad, and desktop** — [cholula-cloud](https://github.com/cholula-cloud).

## Docs

All planning lives in **[docs/](./docs/README.md)**. Start with:

- [Feel scorecard](./docs/FEEL_SCORECARD.md) — P0/P1 ship gates (**P1 = product MVP**)
- [Game design bible](./docs/GAME_DESIGN_BIBLE.md) — vision
- [Implementation roadmap](./docs/IMPLEMENTATION_ROADMAP.md) — eng phases

## Development

```bash
cd web
npm install
npm run dev
```

Open `/play` for the Dutch Hill slice (React Three Fiber + day/night loop).

## Deploy

The Next.js app is in **`web/`**. Vercel project **last-chair** uses root directory `web` and GitHub `cholula-cloud/last-chair`.
