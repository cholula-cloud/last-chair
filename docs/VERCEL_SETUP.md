# Vercel — cholula-cloud only

**Production lives on one team:** [cholula-clouds-projects / last-chair](https://vercel.com/cholula-clouds-projects/last-chair).  
**Do not** use other Vercel teams or duplicate `last-chair` projects for this repo.

| Item | Value |
|------|--------|
| GitHub repo | `cholula-cloud/last-chair` |
| Framework root | **`web`** (not repo root) |
| Production URL | **https://last-chair-iota.vercel.app** |
| Play slice | **https://last-chair-iota.vercel.app/play** |

---

## Why the site 404s today

`last-chair-iota.vercel.app` is attached to **cholula-cloud’s** project, but that project often has **no production deployment** assigned (or **Root Directory** is wrong). Builds can be green on GitHub while the public alias still returns `NOT_FOUND`.

---

## Fix production (dashboard, ~5 min)

1. Open [last-chair on cholula-clouds-projects](https://vercel.com/cholula-clouds-projects/last-chair).
2. **Settings → General → Root Directory** → set to **`web`** → Save.
3. **Deployments** → latest **`main`** deploy (green) → **⋯ → Promote to Production**.
4. **Settings → Domains** → confirm **`last-chair-iota.vercel.app`** is on **this** project (production).
5. **Settings → Deployment Protection** → for production/custom domains, allow **public** visitors (not team SSO only on the iota domain).

Smoke test: `/` and `/play` load without Vercel login.

---

## Connect Vercel in Cursor (for agents)

The Vercel MCP must use **the same Vercel login** as cholula-clouds-projects — not another team.

1. **Cursor Settings → MCP → Vercel**.
2. If the connected user is wrong, **Disconnect** and **Connect** again.
3. Log in with the Vercel account that owns **cholula-clouds-projects**.
4. Approve access to that team when prompted.

After that, agents can promote deployments, domains, and logs on **cholula-cloud’s** project only.

---

## Verify from GitHub

On the latest `main` commit, the **Vercel** check should be green. The link should open a deployment under **cholula-clouds-projects**, not another team.

---

## Optional: deploy hook (no CLI)

If you want CI to poke production after `main` pushes:

1. Vercel → **Project → Settings → Git → Deploy Hooks** → create hook for **`main`**.
2. GitHub → repo **Settings → Secrets → Actions** → add `VERCEL_DEPLOY_HOOK_URL`.

(Only needed if automatic Git deploys are unreliable; normally Git integration is enough.)