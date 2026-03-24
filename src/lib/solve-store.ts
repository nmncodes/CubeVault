import { Solve, RecommendedSolution } from "@/lib/scramble";

const GUEST_SOLVES_STORAGE_KEY = "cubevault.pending-solves.v1";
const ACCOUNT_SOLVES_CACHE_PREFIX = "cubevault.account-solves.";

type PersistedSolve = {
  id: string;
  time: number;
  scramble: string;
  date: string;
  updatedAt?: string;
  penalty?: "+2" | "DNF";
  recommendedSolution?: RecommendedSolution;
};

function parseStoredSolution(value: unknown): RecommendedSolution | undefined {
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
    states:
      Array.isArray(candidate.states) &&
      candidate.states.every((state) => typeof state === "string")
        ? candidate.states
        : [],
    backend: typeof candidate.backend === "string" ? candidate.backend : undefined,
    generatedAt: candidate.generatedAt,
  };
}

function parsePersistedSolve(value: unknown): Solve | null {
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

  const date = new Date(candidate.date);
  if (Number.isNaN(date.getTime())) return null;

  return {
    id: candidate.id,
    time: candidate.time,
    scramble: candidate.scramble,
    date,
    updatedAt:
      typeof candidate.updatedAt === "string" ? candidate.updatedAt : candidate.date,
    penalty:
      candidate.penalty === "+2" || candidate.penalty === "DNF"
        ? candidate.penalty
        : undefined,
    recommendedSolution: parseStoredSolution(candidate.recommendedSolution),
  };
}

function serializeSolve(solve: Solve): PersistedSolve {
  return {
    id: solve.id,
    time: solve.time,
    scramble: solve.scramble,
    date: solve.date.toISOString(),
    updatedAt: solve.updatedAt ?? solve.date.toISOString(),
    penalty: solve.penalty,
    recommendedSolution: solve.recommendedSolution,
  };
}

function getAccountSolvesCacheKey(userId: string) {
  return `${ACCOUNT_SOLVES_CACHE_PREFIX}${userId}`;
}

function sortSolvesNewestFirst(solves: Solve[]) {
  return [...solves].sort((left, right) => right.date.getTime() - left.date.getTime());
}

function getSolveVersion(solve: Solve) {
  return Date.parse(solve.updatedAt ?? solve.date.toISOString()) || solve.date.getTime();
}

function solveKey(solve: Solve) {
  return JSON.stringify(serializeSolve(solve));
}

export function areSolveSetsEqual(left: Solve[], right: Solve[]) {
  if (left.length !== right.length) return false;

  const leftMap = new Map(left.map((solve) => [solve.id, solveKey(solve)]));
  return right.every((solve) => leftMap.get(solve.id) === solveKey(solve));
}

export function mergeSolveSets(...collections: Solve[][]) {
  const merged = new Map<string, Solve>();

  for (const collection of collections) {
    for (const solve of collection) {
      const existing = merged.get(solve.id);
      if (!existing || getSolveVersion(solve) >= getSolveVersion(existing)) {
        merged.set(solve.id, solve);
      }
    }
  }

  return sortSolvesNewestFirst(Array.from(merged.values()));
}

export function parseStoredSolves(rawValue: string | null) {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return sortSolvesNewestFirst(
      parsed.flatMap((value) => {
        const solve = parsePersistedSolve(value);
        return solve ? [solve] : [];
      })
    );
  } catch {
    return [];
  }
}

export function loadGuestSolves() {
  return parseStoredSolves(localStorage.getItem(GUEST_SOLVES_STORAGE_KEY));
}

export function saveGuestSolves(solves: Solve[]) {
  localStorage.setItem(
    GUEST_SOLVES_STORAGE_KEY,
    JSON.stringify(solves.map(serializeSolve))
  );
}

export function clearGuestSolves() {
  localStorage.removeItem(GUEST_SOLVES_STORAGE_KEY);
}

export function loadAccountCachedSolves(userId: string) {
  return parseStoredSolves(localStorage.getItem(getAccountSolvesCacheKey(userId)));
}

export function saveAccountCachedSolves(userId: string, solves: Solve[]) {
  localStorage.setItem(
    getAccountSolvesCacheKey(userId),
    JSON.stringify(solves.map(serializeSolve))
  );
}

async function getErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export async function listRemoteSolves() {
  const response = await fetch("/api/solves", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Unable to load saved solves."));
  }

  const payload = (await response.json()) as { solves?: unknown };
  return parseStoredSolves(JSON.stringify(payload.solves ?? []));
}

export async function syncRemoteSolves(solves: Solve[]) {
  const response = await fetch("/api/solves/sync", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      solves: solves.map(serializeSolve),
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Unable to sync saved solves."));
  }
}
