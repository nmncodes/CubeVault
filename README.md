# CubeVault

CubeVault is a Rubik-style timer board with scramble generation, solve history,
stats, and replay support.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Auth: Auth.js (`@auth/core`) with OAuth providers
- Auth persistence: Prisma adapter + Neon Postgres
- Solve persistence: Neon table via server API
- Solver API: Python backend (`solver/solve_scramble.py`)

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
- optional: `CUBEVAULT_PYTHON`


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
  `api/solves/sync.ts`, `api/solve.ts`.
- SPA fallback is configured in `vercel.json`.
- `api/solve.ts` requires Python + `rubik-solver`. On Vercel Node functions this
  may be unavailable unless you provide a compatible runtime/service.
- Update OAuth callbacks to your production domain:
  - `https://YOUR_DOMAIN/api/auth/callback/google`
  - `https://YOUR_DOMAIN/api/auth/callback/github`

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
