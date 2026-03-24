import { neon } from "@neondatabase/serverless";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getSessionFromRequest, getSessionUserId } from "./auth";
import { getPathname, toWebRequest, writeJson } from "./http";

type RecommendedSolution = {
  method: string;
  algorithm: string;
  moveCount: number;
  states: string[];
  backend?: string;
  generatedAt: string;
};

type PersistedSolve = {
  id: string;
  time: number;
  scramble: string;
  date: string;
  updatedAt?: string;
  penalty?: "+2" | "DNF";
  recommendedSolution?: RecommendedSolution;
};

type SolveRow = {
  id: string;
  time: number;
  scramble: string;
  recorded_at: string;
  updated_at: string;
  penalty: "+2" | "DNF" | null;
  recommended_solution: unknown;
};

let cachedSql: ReturnType<typeof neon> | null = null;
let cachedConnection: string | null = null;

function getSqlClient() {
  const connection = process.env.DATABASE_URL;
  if (!connection) return null;

  if (!cachedSql || cachedConnection !== connection) {
    cachedSql = neon(connection);
    cachedConnection = connection;
  }

  return cachedSql;
}

function parseRecommendedSolution(value: unknown): RecommendedSolution | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.method !== "string" ||
    typeof candidate.algorithm !== "string" ||
    typeof candidate.moveCount !== "number" ||
    typeof candidate.generatedAt !== "string"
  ) {
    return undefined;
  }

  return {
    method: candidate.method,
    algorithm: candidate.algorithm,
    moveCount: candidate.moveCount,
    generatedAt: candidate.generatedAt,
    states:
      Array.isArray(candidate.states) &&
      candidate.states.every((state) => typeof state === "string")
        ? candidate.states
        : [],
    backend: typeof candidate.backend === "string" ? candidate.backend : undefined,
  };
}

function parsePersistedSolve(value: unknown): PersistedSolve | null {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.time !== "number" ||
    typeof candidate.scramble !== "string" ||
    typeof candidate.date !== "string"
  ) {
    return null;
  }

  const recordedAt = new Date(candidate.date);
  if (Number.isNaN(recordedAt.getTime())) return null;

  const updatedAt =
    typeof candidate.updatedAt === "string" ? candidate.updatedAt : candidate.date;
  if (Number.isNaN(new Date(updatedAt).getTime())) return null;

  return {
    id: candidate.id,
    time: candidate.time,
    scramble: candidate.scramble,
    date: candidate.date,
    updatedAt,
    penalty:
      candidate.penalty === "+2" || candidate.penalty === "DNF"
        ? candidate.penalty
        : undefined,
    recommendedSolution: parseRecommendedSolution(candidate.recommendedSolution),
  };
}

function serializeRow(row: SolveRow): PersistedSolve {
  return {
    id: row.id,
    time: row.time,
    scramble: row.scramble,
    date: row.recorded_at,
    updatedAt: row.updated_at,
    penalty: row.penalty ?? undefined,
    recommendedSolution: parseRecommendedSolution(row.recommended_solution),
  };
}

async function listUserSolves(userId: string) {
  const sql = getSqlClient();
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const rows = await sql`
    select id, time, scramble, recorded_at, updated_at, penalty, recommended_solution
    from cubevault_solves
    where user_id = ${userId}
    order by recorded_at desc
  `;

  return (rows as SolveRow[]).map(serializeRow);
}

async function replaceUserSolves(userId: string, solves: PersistedSolve[]) {
  const sql = getSqlClient();
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (solves.length === 0) {
    await sql`delete from cubevault_solves where user_id = ${userId}`;
    return;
  }

  const payload = JSON.stringify(
    solves.map((solve) => ({
      id: solve.id,
      time: solve.time,
      scramble: solve.scramble,
      recorded_at: solve.date,
      updated_at: solve.updatedAt ?? solve.date,
      penalty: solve.penalty ?? null,
      recommended_solution: solve.recommendedSolution ?? null,
    }))
  );

  await sql.transaction([
    sql`delete from cubevault_solves where user_id = ${userId}`,
    sql`
      insert into cubevault_solves (
        user_id,
        id,
        time,
        scramble,
        recorded_at,
        updated_at,
        penalty,
        recommended_solution
      )
      select
        ${userId}::text,
        incoming.id,
        incoming.time,
        incoming.scramble,
        incoming.recorded_at,
        incoming.updated_at,
        incoming.penalty,
        incoming.recommended_solution
      from jsonb_to_recordset(${payload}::jsonb) as incoming(
        id text,
        time integer,
        scramble text,
        recorded_at timestamptz,
        updated_at timestamptz,
        penalty text,
        recommended_solution jsonb
      )
    `,
  ]);
}

export function createSolveStorageMiddleware() {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    const pathname = getPathname(req);
    if (pathname !== "/api/solves" && pathname !== "/api/solves/sync") {
      next();
      return;
    }

    try {
      const request = await toWebRequest(req);
      const session = await getSessionFromRequest(request);
      const userId = getSessionUserId(session);

      if (!userId) {
        writeJson(res, 401, { error: "Sign in required to load saved solves." });
        return;
      }

      if (pathname === "/api/solves" && req.method === "GET") {
        const solves = await listUserSolves(userId);
        writeJson(res, 200, { solves });
        return;
      }

      if (pathname === "/api/solves/sync" && req.method === "POST") {
        const body = (await request.json()) as Record<string, unknown>;
        if (!Array.isArray(body.solves)) {
          writeJson(res, 400, { error: "Expected a solves array." });
          return;
        }

        const solves = body.solves.flatMap((solve) => {
          const parsed = parsePersistedSolve(solve);
          return parsed ? [parsed] : [];
        });

        if (solves.length !== body.solves.length) {
          writeJson(res, 400, { error: "One or more solves are invalid." });
          return;
        }

        await replaceUserSolves(userId, solves);
        writeJson(res, 200, { ok: true, solveCount: solves.length });
        return;
      }

      writeJson(res, 405, {
        error: "Use GET /api/solves or POST /api/solves/sync.",
      });
    } catch (error) {
      writeJson(res, 500, {
        error:
          error instanceof Error ? error.message : "Unable to handle solve storage.",
      });
    }
  };
}
