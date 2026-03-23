export type CubeFaceName = "U" | "R" | "F" | "L" | "B" | "D";

const FACE_ORDER: CubeFaceName[] = ["U", "R", "F", "L", "B", "D"];
const SOLVED_STATE =
  "yyyyyyyyygggggggggrrrrrrrrrbbbbbbbbbooooooooowwwwwwwww";

const STICKER_COLORS: Record<string, string> = {
  y: "#facc15",
  w: "#f8fafc",
  r: "#ef4444",
  o: "#f97316",
  b: "#22c55e",
  g: "#3b82f6",
};

export function parseAlgorithm(algorithm: string): string[] {
  return algorithm
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function inverseMove(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return trimmed;
  if (trimmed.endsWith("2")) return trimmed;
  if (trimmed.endsWith("'")) return trimmed.slice(0, -1);
  return `${trimmed}'`;
}

export function invertAlgorithm(algorithm: string | string[]): string[] {
  const moves = Array.isArray(algorithm) ? algorithm : parseAlgorithm(algorithm);
  return [...moves].reverse().map((move) => inverseMove(move));
}

function normalizeState(rawState: string): string {
  if (rawState.length !== 54) return SOLVED_STATE;
  return rawState.toLowerCase();
}

export function splitCubeState(rawState: string): Record<CubeFaceName, string[]> {
  const state = normalizeState(rawState);
  const result = {} as Record<CubeFaceName, string[]>;

  FACE_ORDER.forEach((face, index) => {
    result[face] = state.slice(index * 9, index * 9 + 9).split("");
  });

  return result;
}

export function stickerColor(sticker: string): string {
  return STICKER_COLORS[sticker.toLowerCase()] || "#6b7280";
}
