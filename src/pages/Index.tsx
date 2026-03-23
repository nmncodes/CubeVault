import { useState, useCallback, useEffect, CSSProperties } from "react";
import { ChevronDown, Download, Eye, Github, Info, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import {
  generateScramble,
  Solve,
  getEffectiveTime,
  RecommendedSolution,
} from "@/lib/scramble";
import { fetchSolutionForScramble } from "@/lib/solver";
import ScrambleDisplay from "@/components/ScrambleDisplay";
import Timer from "@/components/Timer";
import SolveList from "@/components/SolveList";
import SolutionReplayDialog from "@/components/SolutionReplayDialog";
import SessionDashboard from "@/components/SessionDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const STORAGE_KEY = "cubevault.solves.v1";
type SolutionState = "loading" | "ready" | "error";

function parseStoredSolution(value: unknown): RecommendedSolution | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.method !== "string" ||
    typeof candidate.algorithm !== "string" ||
    typeof candidate.moveCount !== "number" ||
    typeof candidate.generatedAt !== "string"
  ) {
    return undefined;
  }

  return {
    method: candidate.method,
    algorithm: candidate.algorithm,
    moveCount: candidate.moveCount,
    states:
      Array.isArray(candidate.states) &&
      candidate.states.every((state) => typeof state === "string")
        ? candidate.states
        : [],
    backend: typeof candidate.backend === "string" ? candidate.backend : undefined,
    generatedAt: candidate.generatedAt,
  };
}

function parseStoredSolves(rawValue: string | null): Solve[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const candidate = item as Record<string, unknown>;
      if (
        typeof candidate.id !== "string" ||
        typeof candidate.time !== "number" ||
        typeof candidate.scramble !== "string" ||
        typeof candidate.date !== "string"
      ) {
        return [];
      }

      const date = new Date(candidate.date);
      if (Number.isNaN(date.getTime())) return [];

      const penalty =
        candidate.penalty === "+2" || candidate.penalty === "DNF"
          ? candidate.penalty
          : undefined;

      return [
        {
          id: candidate.id,
          time: candidate.time,
          scramble: candidate.scramble,
          date,
          penalty,
          recommendedSolution: parseStoredSolution(candidate.recommendedSolution),
        },
      ];
    });
  } catch {
    return [];
  }
}

const Index = () => {
  const [scramble, setScramble] = useState(() => generateScramble());
  const [solves, setSolves] = useState<Solve[]>(() =>
    parseStoredSolves(localStorage.getItem(STORAGE_KEY))
  );
  const [solutionState, setSolutionState] = useState<SolutionState>("loading");
  const [currentSolution, setCurrentSolution] = useState<RecommendedSolution>();
  const [solutionError, setSolutionError] = useState<string>();
  const [replaySolve, setReplaySolve] = useState<Solve | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const cubePalette = [
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#f8fafc",
    "#facc15",
    "#f97316",
  ];

  const vaultThemeVars: CSSProperties = {
    "--background": "220 18% 95%",
    "--foreground": "222 22% 9%",
    "--card": "0 0% 100%",
    "--card-foreground": "222 22% 9%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "222 22% 9%",
    "--primary": "0 84% 60%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "142 71% 45%",
    "--secondary-foreground": "0 0% 100%",
    "--muted": "220 14% 92%",
    "--muted-foreground": "220 11% 36%",
    "--accent": "217 91% 60%",
    "--accent-foreground": "0 0% 100%",
    "--destructive": "24 95% 55%",
    "--destructive-foreground": "0 0% 100%",
    "--border": "222 15% 20%",
    "--input": "222 15% 20%",
    "--ring": "48 98% 55%",
    "--timer-ready": "142 71% 45%",
    "--timer-running": "0 84% 60%",
    "--timer-idle": "222 22% 9%",
    "--sidebar-background": "220 24% 97%",
    "--sidebar-foreground": "222 22% 9%",
    "--sidebar-primary": "0 84% 60%",
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": "217 91% 60%",
    "--sidebar-accent-foreground": "0 0% 100%",
    "--sidebar-border": "222 14% 24%",
    "--sidebar-ring": "48 98% 55%",
    "--font-serif-color": "#141922",
  } as CSSProperties;

  useEffect(() => {
    const controller = new AbortController();
    setSolutionState("loading");
    setCurrentSolution(undefined);
    setSolutionError(undefined);

    fetchSolutionForScramble(scramble, controller.signal)
      .then((solution) => {
        setCurrentSolution(solution);
        setSolutionState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSolutionState("error");
        setSolutionError(
          error instanceof Error ? error.message : "Unknown solver error"
        );
      });

    return () => controller.abort();
  }, [scramble]);

  const handleSolve = useCallback(
    (time: number) => {
      const solve: Solve = {
        id: crypto.randomUUID(),
        time,
        scramble,
        date: new Date(),
        recommendedSolution:
          solutionState === "ready" ? currentSolution : undefined,
      };
      setSolves((prev) => [solve, ...prev]);
      setScramble(generateScramble());
    },
    [currentSolution, scramble, solutionState]
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

  const handleOpenReplay = useCallback((solve: Solve) => {
    if (!solve.recommendedSolution) return;
    setReplaySolve(solve);
    setReplayOpen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(solves));
  }, [solves]);

  const handleExport = useCallback(() => {
    if (solves.length === 0) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      solveCount: solves.length,
      solves: solves.map((solve) => ({
        ...solve,
        date: solve.date.toISOString(),
        effectiveTime: getEffectiveTime(solve),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    anchor.href = url;
    anchor.download = `cubevault-solves-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [solves]);

  return (
    <div
      style={vaultThemeVars}
      className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f7f8fa_0%,#eceff3_100%)] text-[hsl(var(--foreground))] flex flex-col md:flex-row"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#ef4444_0%,#22c55e_20%,#3b82f6_40%,#f8fafc_60%,#facc15_80%,#f97316_100%)]"
      />
      {/* Main timer area */}
      <div className="relative z-10 flex-1 flex flex-col px-4 py-6 md:px-6 gap-5">
        <header className="rounded-[1.5rem] border-2 border-foreground/85 bg-card px-6 py-5 shadow-[0_10px_0_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-[0.12em] text-foreground">
                CubeVault
              </h1>
              <p className="mt-2 text-base text-muted-foreground max-w-2xl">
                Rubik-style timer board with clear cube-color visual language.
              </p>
              <div className="mt-3 flex items-center gap-2">
                {cubePalette.map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="h-6 w-6 rounded-md border-2 border-black/60 shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ))}
              </div>
            </div>
            <a href="https://github.com/nmncodes/CubeVault" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="gap-2 border-black bg-card text-foreground hover:bg-black hover:text-white"
              >
                <Github size={14} />
                Repository
              </Button>
            </a>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[1.6rem] border-2 border-foreground/85 bg-card/95 px-4 py-5 md:px-6 md:py-6 shadow-[0_10px_0_rgba(0,0,0,0.1)]">
          <div className="relative space-y-4">
            <ScrambleDisplay
              scramble={scramble}
              solutionState={solutionState}
              solution={currentSolution}
              errorMessage={solutionError}
            />
            <Timer onSolve={handleSolve} hotkeysEnabled={!replayOpen} />
            {solves[0]?.recommendedSolution && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => handleOpenReplay(solves[0])}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-card px-5 py-2 text-sm text-foreground hover:bg-black hover:text-white transition-colors"
                >
                  <Eye size={16} />
                  Replay Optimal Path
                </button>
              </div>
            )}
          </div>
        </section>

        <SessionDashboard solves={solves} mode="stats" />

        <SessionDashboard solves={solves} mode="graph" />


        <section className="grid gap-3 xl:grid-cols-2">
          <Card className="border-2 border-black bg-card shadow-[0_8px_0_rgba(0,0,0,0.08)]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserRound size={16} />
                    About CubeVault 
                  </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 px-2 text-muted-foreground hover:bg-black/10 hover:text-foreground"
                    >
                    </Button>
                </div>
              </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    CubeVault is your speedcubing lab. The focus is low-latency
                    timing, clean stats, and replay-driven learning.
                  </p>
                  <p>
                    Replace this block with your personal story, cubing goals, and
                    links. It is intentionally kept easy to edit in{" "}
                    <code className="font-mono-timer">src/pages/Index.tsx</code>.
                  </p>
                </CardContent>
          </Card>

          <Card className="border-2 border-black bg-card shadow-[0_8px_0_rgba(0,0,0,0.08)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info size={16} />
                Want To Contribute?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Help shape the roadmap: replay polish, advanced stats, import/export,
                and profile features.
              </p>
              <div className="flex flex-wrap gap-2">
                <a href="https://github.com/nmncodes/CubeVault" target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    className="gap-2 border border-black bg-card text-foreground hover:bg-black hover:text-white"
                  >
                    <Github size={14} />
                    Open Contribute Page
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>

      {/* Sidebar with solves */}
      <aside className="relative z-10 w-full md:w-80 lg:w-[22rem] border-t md:border-t-0 md:border-l-2 border-foreground/80 bg-sidebar flex flex-col max-h-[42vh] md:max-h-none md:self-stretch">
        <div className="relative px-4 py-3 border-b border-foreground/25 flex items-center justify-between bg-sidebar">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#22c55e_20%,#3b82f6_40%,#f8fafc_60%,#facc15_80%,#f97316_100%)]"
          />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
            Session Log ({solves.length})
          </span>
          <div className="flex items-center gap-2">
            {solves.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.12em]"
                title="Export solves as JSON"
              >
                <Download size={12} />
                Export
              </button>
            )}
            {solves.length > 0 && (
              <button
                onClick={() => setSolves([])}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors uppercase tracking-[0.12em]"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <SolveList
            solves={solves}
            onDelete={handleDelete}
            onPenalty={handlePenalty}
            onViewSolution={handleOpenReplay}
          />
        </div>
      </aside>
      <SolutionReplayDialog
        open={replayOpen}
        solve={replaySolve}
        onOpenChange={setReplayOpen}
      />
    </div>
  );
};

export default Index;
