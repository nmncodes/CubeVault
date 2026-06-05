# CubeVault

CubeVault is a Rubik-style timer board with scramble generation, solve history, stats, and replay support.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind
- Solve persistence: Neon Postgres via server API
- Solver: Custom C++ Thistlethwaite engine (`thistle/`) compiled to a native binary, called from `api/solve.py`

## Local development setup

### 1. Install dependencies

```bash
corepack pnpm install
```

### 2. Build the C++ solver

```bash
cd thistle
g++ -O2 -std=c++17 -o thistlethwaite thistlethwaite.cpp
```

The binary is invoked by `api/solve.py` as a subprocess. Make sure it's on `PATH` or set `CUBEVAULT_SOLVER_BIN` to its absolute path.

### 3. Configure environment

Copy `.env.example` to `.env`, then set real values:

- `DATABASE_URL`
- optional (local dev only): `CUBEVAULT_SOLVER_BIN` — path to compiled `thistlethwaite` binary
- optional: `VITE_SOLVER_API_ORIGIN` — use an external solver host instead

### 4. Sync database schema

```bash
corepack pnpm prisma:generate
corepack pnpm prisma:push
```

If your solve table is missing, run the SQL from:

- `neon/cubevault.sql`

### 5. Run the app

```bash
corepack pnpm dev
```

Server runs on `http://localhost:8080` (strict port).

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
   - `DATABASE_URL`
4. Deploy.

Notes:

- Vercel serverless APIs are in `api/`: `api/solves.ts`, `api/solves/sync.ts`, `api/solve.py`.
- The Thistlethwaite binary must be compiled and bundled for the Vercel build environment. Add a `vercel.json` build step or pre-compile for Linux x86-64 and commit the binary.
- SPA fallback is configured in `vercel.json`.
- Verify APIs after deploy:
  - `POST https://YOUR_DOMAIN/api/solve` with `{"scramble":"R U R' U'","method":"Thistlethwaite"}`

## Optional: Use Render for Solver Only

If `/api/solve` is unstable on Vercel (e.g. binary execution limits), keep solves on Vercel and move only the solver to Render.

1. Create a new Render Web Service from this repo.
2. Use:
   - Build command: `cd thistle && g++ -O2 -std=c++17 -o thistlethwaite thistlethwaite.cpp && pip install -r solver_service/requirements.txt`
   - Start command: `uvicorn solver_service.app:app --host 0.0.0.0 --port $PORT`
3. Set `ALLOWED_ORIGINS` on Render:
   - production: `https://YOUR_VERCEL_DOMAIN`
4. Copy your Render URL, then set on Vercel:
   - `VITE_SOLVER_API_ORIGIN=https://YOUR_RENDER_DOMAIN`
5. Redeploy Vercel frontend.

Health checks:

- `GET https://YOUR_RENDER_DOMAIN/health`
- `POST https://YOUR_RENDER_DOMAIN/api/solve` with `{"scramble":"R U R' U'","method":"Thistlethwaite"}`

## API routes

- `GET /api/solves` — returns the current user's solve history
- `POST /api/solves/sync` — replaces the current user's solve set
- `POST /api/solve` — runs the Thistlethwaite engine and returns a solution

## About the solver

The solver is a hand-written C++ implementation of Thistlethwaite's algorithm located in `thistle/`. It solves any scramble in at most 52 moves across four phases:

| Phase | Goal | Max moves |
|---|---|---|
| G0 → G1 | Fix all edge orientations | 7 |
| G1 → G2 | Fix corner orientations + place UD-slice edges | 13 |
| G2 → G3 | Reduce corner tetrads + fix permutation parity | 15 |
| G3 → G4 | Half-turn only solve (BFS) | 17 |

The binary accepts a scramble string as `argv[1]` and returns JSON:

```bash
./thistlethwaite "R U R' U'"
# {"ok":true,"method":"Thistlethwaite","algorithm":"..."}
```
