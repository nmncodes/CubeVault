const MOVES = ["U", "D", "R", "L", "F", "B"];
const MODIFIERS = ["", "'", "2"];

export function generateScramble(length = 20): string {
  const scramble: string[] = [];
  let lastFace = "";
  let secondLastFace = "";

  for (let i = 0; i < length; i++) {
    let face: string;
    do {
      face = MOVES[Math.floor(Math.random() * MOVES.length)];
    } while (
      face === lastFace ||
      (face === secondLastFace && isOpposite(face, lastFace))
    );

    const modifier = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(face + modifier);
    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble.join(" ");
}

function isOpposite(a: string, b: string): boolean {
  const pairs: Record<string, string> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };
  return pairs[a] === b;
}

export function formatTime(ms: number): string {
  if (ms < 0) return "DNF";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  }
  return seconds.toFixed(2);
}

export interface Solve {
  id: string;
  time: number;
  scramble: string;
  date: Date;
  updatedAt?: string;
  penalty?: "+2" | "DNF";
  recommendedSolution?: RecommendedSolution;
}

export interface RecommendedSolution {
  method: string;
  algorithm: string;
  moveCount: number;
  states: string[];
  backend?: string;
  generatedAt: string;
}

export function getMean(solves: Solve[]): number | null {
  const validTimes = solves.map(getEffectiveTime).filter((time) => time > 0);
  if (validTimes.length === 0) return null;
  return validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
}

export function getAo(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null;
  const recent = solves.slice(0, n).map((s) => {
    if (s.penalty === "DNF") return Infinity;
    return s.time + (s.penalty === "+2" ? 2000 : 0);
  });

  const dnfCount = recent.filter((t) => t === Infinity).length;
  if (dnfCount > 1) return -1; // DNF average

  const sorted = [...recent].sort((a, b) => a - b);
  // Remove best and worst
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

export function getEffectiveTime(solve: Solve): number {
  if (solve.penalty === "DNF") return -1;
  return solve.time + (solve.penalty === "+2" ? 2000 : 0);
}
