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
  return (
    <div className="px-4 py-4 text-center rounded-lg border border-border bg-card">
      <p className="font-mono-timer text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide text-foreground select-none leading-relaxed">
        {scramble}
      </p>
      {/* <div className="mt-3 text-sm text-muted-foreground">
        {solutionState === "loading" && (
          <span>Preparing optimal solution..</span>
        )}
        {solutionState === "ready" && solution && (
          <span title={`${solution.method} solution ready`}>
            Optimal Solution will be available once you finish your solve.
          </span>
        )}
        {solutionState === "error" && (
          <span title={errorMessage}>Solver unavailable for this scramble.</span>
        )}
      </div> */}
    </div>
  );
};

export default ScrambleDisplay;
