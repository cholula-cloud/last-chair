# Last Chair

**Slopes tycoon** — bring lost New England ski hills back to life. **Browser-first**, built for **iPhone, iPad, and desktop** — [cholula-cloud](https://github.com/cholula-cloud).

## Docs

All planning lives in **[docs/](./docs/README.md)**. Start with:

- [Feel scorecard](./docs/FEEL_SCORECARD.md) — P0/P1 ship gates (**P1 = product MVP**)
- [Game design bible](./docs/GAME_DESIGN_BIBLE.md) — vision
- [Ship-shape review](./docs/SHIP_SHAPE_REVIEW.md) — cut/keep + art honesty
- [Implementation roadmap](./docs/IMPLEMENTATION_ROADMAP.md) — eng phases

## Development

```bash
cd web
npm install
npm run dev
```

Open `/play` for the Dutch Hill slice (React Three Fiber + day/night loop).

## Deploy

The Next.js app is in **`web/`**. It is published through Cursor; there is no Vercel deployment. Play the build from Cursor, or locally with `npm run dev` and `/play`.
