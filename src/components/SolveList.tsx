import { Solve, formatTime, getEffectiveTime, getAo } from "@/lib/scramble";
import { Trash2 } from "lucide-react";

interface SolveListProps {
  solves: Solve[];
  onDelete: (id: string) => void;
  onPenalty: (id: string, penalty: "+2" | "DNF" | undefined) => void;
}

const SolveList = ({ solves, onDelete, onPenalty }: SolveListProps) => {
  const ao5 = getAo(solves, 5);
  const ao12 = getAo(solves, 12);

  const best = solves.length > 0
    ? Math.min(...solves.map(getEffectiveTime).filter((t) => t > 0))
    : null;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden h-full flex flex-col">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-border text-center text-xs font-mono-timer">
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
              return (
                <div
                  key={solve.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors duration-100 group"
                  style={{
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs w-6 text-right font-mono-timer">
                      {solves.length - i}.
                    </span>
                    <span className="font-mono-timer text-sm font-medium">
                      {solve.penalty === "DNF"
                        ? "DNF"
                        : solve.penalty === "+2"
                          ? formatTime(effective) + "+"
                          : formatTime(solve.time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
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
                      onClick={() => onDelete(solve.id)}
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
