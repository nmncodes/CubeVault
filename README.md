# CubeVault

CubeVault is a Rubik-style timer board with scramble generation, solve history,
stats, and replay support.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Auth: Auth.js (`@auth/core`) with OAuth providers
- Auth persistence: Prisma adapter + Neon Postgres
- Solve persistence: Neon table via server API
- Solver API: Vercel Python Function (`api/solve.py`) using `solver/solve_scramble.py`

## Local development setup

### 1. Install dependencies

```bash
corepack pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env`, then set real values:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`
- optional: `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`
- optional (local dev only): `CUBEVAULT_PYTHON`
- optional: `VITE_SOLVER_API_ORIGIN` (use external solver host)


### 3. Sync database schema

```bash
corepack pnpm prisma:generate
corepack pnpm prisma:push
```

This provisions Auth.js tables (`User`, `Account`, `Session`, `VerificationToken`).

If your solve table is missing, run SQL from:

- `neon/cubevault.sql`

### 4. Run the app

```bash
corepack pnpm dev
```

Server runs on:

- `http://localhost:8080` (strict port)

## Useful scripts

- `corepack pnpm dev`
- `corepack pnpm build`
- `corepack pnpm preview`
- `corepack pnpm test`
- `corepack pnpm lint`
- `corepack pnpm prisma:generate`
- `corepack pnpm prisma:push`

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Add project env vars:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `DATABASE_URL`
   - optional GitHub OAuth vars
4. Deploy.

Notes:

- Vercel serverless APIs are in `api/`:
  `api/auth/[...auth].ts`, `api/auth-meta.ts`, `api/solves.ts`,
  `api/solves/sync.ts`, `api/solve.py`.
- SPA fallback is configured in `vercel.json`.
- Python dependency install is driven by root `requirements.txt` (`rubik-solver`).
- Update OAuth callbacks to your production domain:
  - `https://YOUR_DOMAIN/api/auth/callback/google`
  - `https://YOUR_DOMAIN/api/auth/callback/github`
- Verify APIs after deploy:
  - `GET https://YOUR_DOMAIN/api/auth-meta`
  - `POST https://YOUR_DOMAIN/api/solve` with `{"scramble":"R U R' U'","method":"Kociemba"}`

## Optional: Use Render For Solver Only

If `/api/solve` is unstable on Vercel for your project, you can keep Auth + solves
on Vercel and move only the solver to Render.

1. Create a new Render Web Service from this repo.
2. Use:
   - Build command: `pip install -r solver_service/requirements.txt`
   - Start command: `uvicorn solver_service.app:app --host 0.0.0.0 --port $PORT`
3. Set `ALLOWED_ORIGINS` on Render:
   - production: `https://YOUR_VERCEL_DOMAIN`
4. Copy your Render URL, then set this Vercel env var:
   - `VITE_SOLVER_API_ORIGIN=https://YOUR_RENDER_DOMAIN`
5. Redeploy Vercel frontend.

Health checks:

- `GET https://YOUR_RENDER_DOMAIN/health`
- `POST https://YOUR_RENDER_DOMAIN/api/solve` with `{"scramble":"R U R' U'","method":"Kociemba"}`

## API routes

- `GET /api/auth-meta`
  returns auth/database/provider readiness.
- `GET|POST /api/auth/*`
  handled by Auth.js middleware.
- `GET /api/solves`
  returns current signed-in user's solves.
- `POST /api/solves/sync`
  replaces signed-in user's solve set.
- `POST /api/solve`
  returns solver output for a scramble.

## Troubleshooting

- `DATABASE_URL is not configured`
  `.env` is missing or not loaded in your dev process.
- `relation "cubevault_solves" does not exist`
  run `corepack pnpm prisma:push` and/or apply `neon/cubevault.sql`.
- `/api/auth-meta` shows `authConfigured: false`
  missing `AUTH_SECRET` or no valid OAuth provider envs.
- Login button appears to do nothing
  verify `GET /api/auth-meta` returns JSON, then verify OAuth redirect URIs
  exactly match your Vercel domain callback URLs.
- Solver status stays unavailable
  check Vercel Function logs for `/api/solve`; as a fallback, deploy solver
  separately and set `VITE_SOLVER_API_ORIGIN=https://your-solver-service.onrender.com`.
- Avoid splitting Auth.js backend to another origin unless you also redesign auth
  (cross-origin cookie sessions are fragile). Keep auth/solves on same origin.
