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
  const cubeTones = ["#ef4444", "#3b82f6", "#22c55e", "#f8fafc", "#facc15", "#f97316"];

  const best = solves.length > 0
    ? Math.min(...solves.map(getEffectiveTime).filter((t) => t > 0))
    : null;
  const statCards: Array<{ label: string; value: string }> = [
    {
      label: "Ao5",
      value: ao5 === null ? "-" : ao5 < 0 ? "DNF" : formatTime(Math.round(ao5)),
    },
    {
      label: "Ao12",
      value: ao12 === null ? "-" : ao12 < 0 ? "DNF" : formatTime(Math.round(ao12)),
    },
    {
      label: "Mean",
      value: mean === null ? "-" : formatTime(Math.round(mean)),
    },
    {
      label: "Best",
      value: best !== null && best !== Infinity ? formatTime(best) : "-",
    },
  ];

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
    <div className="h-full flex flex-col overflow-hidden rounded-none border-0 bg-transparent">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2 px-2 py-2 text-center text-[11px] uppercase tracking-[0.14em] font-mono-timer">
        {statCards.map((card, index) => {
          // const tone = cubeTones[index % cubeTones.length];
          return (
            <div
              key={card.label}
              className="rounded-md border px-2 py-2 bg-card"
              style={{
                borderColor: "#0f172a",
              }}
            >
              <span
                className="mb-1 block h-1 w-full rounded-full"
                // style={{ backgroundColor: tone, opacity: 0.82 }}
                aria-hidden
              />
              <span className="block text-[10px] text-muted-foreground">
                {card.label}
              </span>
              <span className="text-foreground">{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Solve list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {solves.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8 rounded-lg border border-dashed border-foreground/25 bg-card/70">
            No solves yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {solves.map((solve, i) => {
              const effective = getEffectiveTime(solve);
              const isDeleting = deletingIds.includes(solve.id);
              // const tone = cubeTones[i % cubeTones.length];
              return (
                <div
                  key={solve.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 group transition-colors duration-200 ${
                    isDeleting
                      ? "bg-destructive/20 border-destructive/70"
                      : "bg-card/80 hover:bg-muted border-black/75"
                  }`}
                  style={{
                    animationDelay: `${i * 40}ms`,
                    borderLeftWidth: "4px",
                    // borderLeftColor: tone,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full" />
                    <span className="text-sm w-6 text-right font-mono-timer text-foreground/80">
                      {solves.length - i}.
                    </span>
                    <div className="flex flex-col">
                      <span className="font-mono-timer text-sm font-medium text-foreground">
                        {solve.penalty === "DNF"
                          ? "DNF"
                          : solve.penalty === "+2"
                            ? formatTime(effective) + "+"
                            : formatTime(solve.time)}
                      </span>
                      {/* {solve.recommendedSolution && (
                        <span
                          className="text-[10px] text-muted-foreground max-w-48 truncate"
                          title={`${solve.recommendedSolution.method}: ${solve.recommendedSolution.algorithm}`}
                        >
                          alg {solve.recommendedSolution.moveCount} moves
                        </span>
                      )} */}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-100">
                    {solve.recommendedSolution && onViewSolution && (
                      <button
                        onClick={() => onViewSolution(solve)}
                        className="px-2 py-0.5 text-sm rounded border border-black text-muted-foreground hover:bg-black hover:text-white transition-colors"
                      >
                        View
                      </button>
                    )}
                    <button
                      onClick={() =>
                        onPenalty(solve.id, solve.penalty === "+2" ? undefined : "+2")
                      }
                      className={`px-1.5 py-0.5 text-sm rounded transition-colors ${
                        solve.penalty === "+2"
                          ? "bg-black text-white"
                          : "text-muted-foreground hover:bg-black/10 hover:text-foreground"
                      }`}
                    >
                      +2
                    </button>
                    <button
                      onClick={() =>
                        onPenalty(solve.id, solve.penalty === "DNF" ? undefined : "DNF")
                      }
                      className={`px-1.5 py-0.5 text-sm rounded transition-colors ${
                        solve.penalty === "DNF"
                          ? "bg-black text-white"
                          : "text-muted-foreground hover:bg-black/10 hover:text-foreground"
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
