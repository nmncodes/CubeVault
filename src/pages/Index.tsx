import { useState, useCallback } from "react";
import { generateScramble, Solve } from "@/lib/scramble";
import ScrambleDisplay from "@/components/ScrambleDisplay";
import Timer from "@/components/Timer";
import SolveList from "@/components/SolveList";

const Index = () => {
  const [scramble, setScramble] = useState(() => generateScramble());
  const [solves, setSolves] = useState<Solve[]>([]);

  const handleSolve = useCallback(
    (time: number) => {
      const solve: Solve = {
        id: crypto.randomUUID(),
        time,
        scramble,
        date: new Date(),
      };
      setSolves((prev) => [solve, ...prev]);
      setScramble(generateScramble());
    },
    [scramble]
  );

  const handleDelete = useCallback((id: string) => {
    setSolves((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handlePenalty = useCallback(
    (id: string, penalty: "+2" | "DNF" | undefined) => {
      setSolves((prev) =>
        prev.map((s) => (s.id === id ? { ...s, penalty } : s))
      );
    },
    []
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Main timer area */}
      <div className="flex-1 flex flex-col px-4 py-6">
        <header className="text-center mb-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            CubeTimer
          </h1>
        </header>
        <ScrambleDisplay scramble={scramble} />
        <Timer onSolve={handleSolve} />
      </div>

      {/* Sidebar with solves */}
      <aside className="w-full md:w-72 lg:w-80 border-t md:border-t-0 md:border-l border-border bg-card/50 flex flex-col max-h-[40vh] md:max-h-screen md:h-screen">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Solves ({solves.length})
          </span>
          {solves.length > 0 && (
            <button
              onClick={() => setSolves([])}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <SolveList
            solves={solves}
            onDelete={handleDelete}
            onPenalty={handlePenalty}
          />
        </div>
      </aside>
    </div>
  );
};

export default Index;
