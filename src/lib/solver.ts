import { RecommendedSolution } from "@/lib/scramble";
import { API_BASE_URL } from "@/lib/api";

type SolverApiResponse = {
  method: string;
  algorithm: string;
  moveCount: number;
  states: string[];
  backend?: string;
};

function getSolverEndpoint() {
  const configuredOrigin = import.meta.env.VITE_SOLVER_API_ORIGIN;
  if (typeof configuredOrigin !== "string" || configuredOrigin.trim().length === 0) {
    return `${API_BASE_URL}/api/solve`;
  }

  return `${configuredOrigin.trim().replace(/\/+$/, "")}/api/solve`;
}

export async function fetchSolutionForScramble(
  scramble: string,
  signal?: AbortSignal
): Promise<RecommendedSolution> {
  const response = await fetch(getSolverEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ scramble, method: "Kociemba" }),
    signal,
  });

  const data = (await response.json().catch(() => null)) as
    | (Partial<SolverApiResponse> & { error?: string })
    | null;

  if (!response.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) ||
      `Solver request failed (${response.status})`;
    throw new Error(message);
  }

  if (
    !data ||
    typeof data.method !== "string" ||
    typeof data.algorithm !== "string" ||
    typeof data.moveCount !== "number" ||
    !Array.isArray(data.states) ||
    !data.states.every((state) => typeof state === "string")
  ) {
    throw new Error("Solver returned an invalid response.");
  }

  return {
    method: data.method,
    algorithm: data.algorithm,
    moveCount: data.moveCount,
    states: data.states,
    backend: data.backend,
    generatedAt: new Date().toISOString(),
  };
}
