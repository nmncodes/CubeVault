import { Solve, getEffectiveTime } from "@/lib/scramble";

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getValidTimes(solves: Solve[]): number[] {
  return solves.map(getEffectiveTime).filter((time) => time > 0);
}

export function getBestTime(solves: Solve[]): number | null {
  const valid = getValidTimes(solves);
  return valid.length ? Math.min(...valid) : null;
}

export function getWorstTime(solves: Solve[]): number | null {
  const valid = getValidTimes(solves);
  return valid.length ? Math.max(...valid) : null;
}

export function getAverageTime(solves: Solve[]): number | null {
  return mean(getValidTimes(solves));
}

export function getMedianTime(solves: Solve[]): number | null {
  const sorted = [...getValidTimes(solves)].sort((a, b) => a - b);
  if (!sorted.length) return null;

  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function getStdDeviation(solves: Solve[]): number | null {
  const valid = getValidTimes(solves);
  const avg = mean(valid);
  if (valid.length === 0 || avg === null) return null;

  const variance =
    valid.reduce((sum, value) => sum + (value - avg) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

function getWindowBestNAverage(
  solves: Solve[],
  startIndex: number,
  windowSize: number,
  keepCount: number
): number | null {
  const window = solves.slice(startIndex, startIndex + windowSize);
  const valid = window
    .map(getEffectiveTime)
    .filter((time) => time > 0)
    .sort((a, b) => a - b);

  if (valid.length < keepCount) return null;
  return mean(valid.slice(0, keepCount));
}

export function getRecentBestN(
  solves: Solve[],
  windowSize: number,
  keepCount: number
): number | null {
  if (solves.length < windowSize) return null;
  return getWindowBestNAverage(solves, 0, windowSize, keepCount);
}

export function getBestWindowBestN(
  solves: Solve[],
  windowSize: number,
  keepCount: number
): number | null {
  if (solves.length < windowSize) return null;

  let best: number | null = null;
  for (let i = 0; i <= solves.length - windowSize; i++) {
    const value = getWindowBestNAverage(solves, i, windowSize, keepCount);
    if (value === null) continue;
    if (best === null || value < best) best = value;
  }
  return best;
}
