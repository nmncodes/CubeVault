import { useCallback, useState } from "react";
import { Solve, formatTime, getEffectiveTime, getAo, getMean } from "@/lib/scramble";
import { Trash2 } from "lucide-react";

interface SolveListProps {
  solves: Solve[];
  onDelete: (id: string) => void;
  onPenalty: (id: string, penalty: "+2" | "DNF" | undefined) => void;
  onViewSolution?: (solve: Solve) => void;
}

const SolveList = ({
  solves,
  onDelete,
  onPenalty,
  onViewSolution,
}: SolveListProps) => {
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const ao5 = getAo(solves, 5);
  const ao12 = getAo(solves, 12);
  const mean = getMean(solves);

  const best = solves.length > 0
    ? Math.min(...solves.map(getEffectiveTime).filter((t) => t > 0))
    : null;

  const handleDeleteWithTransition = useCallback(
    (id: string) => {
      let shouldScheduleDelete = false;
      setDeletingIds((prev) => {
        if (prev.includes(id)) return prev;
        shouldScheduleDelete = true;
        return [...prev, id];
      });

      if (!shouldScheduleDelete) return;

      window.setTimeout(() => {
        onDelete(id);
        setDeletingIds((prev) => prev.filter((value) => value !== id));
      }, 220);
    },
    [onDelete]
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden h-full flex flex-col">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-px bg-border text-center text-xs font-mono-timer">
        <div className="bg-card px-2 py-2">
          <span className="text-muted-foreground block">ao5</span>
          <span className="text-foreground">
            {ao5 === null ? "-" : ao5 < 0 ? "DNF" : formatTime(Math.round(ao5))}
          </span>
        </div>
        <div className="bg-card px-2 py-2">
          <span className="text-muted-foreground block">ao12</span>
          <span className="text-foreground">
            {ao12 === null ? "-" : ao12 < 0 ? "DNF" : formatTime(Math.round(ao12))}
          </span>
        </div>
        <div className="bg-card px-2 py-2">
          <span className="text-muted-foreground block">mean</span>
          <span className="text-foreground">
            {mean === null ? "-" : formatTime(Math.round(mean))}
          </span>
        </div>
        <div className="bg-card px-2 py-2">
          <span className="text-muted-foreground block">best</span>
          <span className="text-primary">
            {best !== null && best !== Infinity ? formatTime(best) : "-"}
          </span>
        </div>
      </div>

      {/* Solve list */}
      <div className="flex-1 overflow-y-auto">
        {solves.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No solves yet
          </p>
        ) : (
          <div className="divide-y divide-border">
            {solves.map((solve, i) => {
              const effective = getEffectiveTime(solve);
              const isDeleting = deletingIds.includes(solve.id);
              return (
                <div
                  key={solve.id}
                  className={`flex items-center justify-between px-3 py-2 group transition-colors duration-200 ${
                    isDeleting ? "bg-destructive/20" : "hover:bg-secondary/50"
                  }`}
                  style={{
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs w-6 text-right font-mono-timer">
                      {solves.length - i}.
                    </span>
                    <div className="flex flex-col">
                      <span className="font-mono-timer text-sm font-medium">
                        {solve.penalty === "DNF"
                          ? "DNF"
                          : solve.penalty === "+2"
                            ? formatTime(effective) + "+"
                            : formatTime(solve.time)}
                      </span>
                      {solve.recommendedSolution && (
                        <span
                          className="text-[10px] text-muted-foreground max-w-48 truncate"
                          title={`${solve.recommendedSolution.method}: ${solve.recommendedSolution.algorithm}`}
                        >
                          alg {solve.recommendedSolution.moveCount} moves
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                    {solve.recommendedSolution && onViewSolution && (
                      <button
                        onClick={() => onViewSolution(solve)}
                        className="px-1.5 py-0.5 text-xs rounded text-muted-foreground hover:text-primary transition-colors"
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() =>
                        onPenalty(solve.id, solve.penalty === "+2" ? undefined : "+2")
                      }
                      className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                        solve.penalty === "+2"
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      +2
                    </button>
                    <button
                      onClick={() =>
                        onPenalty(solve.id, solve.penalty === "DNF" ? undefined : "DNF")
                      }
                      className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                        solve.penalty === "DNF"
                          ? "bg-destructive text-destructive-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => handleDeleteWithTransition(solve.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SolveList;
