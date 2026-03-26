import { RecommendedSolution } from "@/lib/scramble";

interface ScrambleDisplayProps {
  scramble: string;
  solutionState: "loading" | "ready" | "error";
  solution?: RecommendedSolution;
  errorMessage?: string;
}

const ScrambleDisplay = ({
  scramble,
  solutionState,
  solution,
  errorMessage,
}: ScrambleDisplayProps) => {
  const scrambleMoves = scramble.trim().split(/\s+/).filter(Boolean);

  const statusClass =
    solutionState === "loading"
      ? "border-accent/50 text-accent"
      : solutionState === "ready"
        ? "border-primary/50 text-primary"
        : "border-destructive/50 text-destructive";

  return (
    <div className="rounded-2xl border-2 border-foreground/80 bg-card px-4 py-3 text-center shadow-[0_6px_0_rgba(0,0,0,0.08)]">
      <p className="text-[18px] uppercase tracking-[0.16em] text-muted-foreground">
        Scramble
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {scrambleMoves.map((move, index) => {
          return (
            <span
              key={`${move}-${index}`}
              className="inline-flex min-w-[2.6rem] justify-center rounded-md border-2 border-black/70 px-2 py-1 font-mono-timer text-base tracking-[0.03em] shadow-[inset_0_-2px_0_rgba(0,0,0,0.22)]"
            >
              {move}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default ScrambleDisplay;
