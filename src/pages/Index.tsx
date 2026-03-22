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
  const [aboutOpen, setAboutOpen] = useState(false);

  const minimalThemeVars: CSSProperties = {
    "--background": "0 0% 100%",
    "--foreground": "0 0% 8%",
    "--card": "0 0% 100%",
    "--card-foreground": "0 0% 8%",
    "--popover": "0 0% 100%",
    "--popover-foreground": "0 0% 8%",
    "--primary": "0 0% 8%",
    "--primary-foreground": "0 0% 100%",
    "--secondary": "0 0% 96%",
    "--secondary-foreground": "0 0% 12%",
    "--muted": "0 0% 97%",
    "--muted-foreground": "0 0% 38%",
    "--accent": "0 0% 8%",
    "--accent-foreground": "0 0% 100%",
    "--destructive": "0 0% 15%",
    "--destructive-foreground": "0 0% 100%",
    "--border": "0 0% 85%",
    "--input": "0 0% 85%",
    "--ring": "0 0% 25%",
    "--timer-ready": "131 64% 38%",
    "--timer-running": "0 76% 52%",
    "--timer-idle": "0 0% 10%",
    "--sidebar-background": "0 0% 100%",
    "--sidebar-foreground": "0 0% 8%",
    "--sidebar-primary": "0 0% 8%",
    "--sidebar-primary-foreground": "0 0% 100%",
    "--sidebar-accent": "0 0% 96%",
    "--sidebar-accent-foreground": "0 0% 8%",
    "--sidebar-border": "0 0% 85%",
    "--sidebar-ring": "0 0% 25%",
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
      style={minimalThemeVars}
      className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col md:flex-row"
    >
      {/* Main timer area */}
      <div className="flex-1 flex flex-col px-4 py-6 gap-5">
        <header className="rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                CubeVault
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Train speed, review optimal solutions, and track progress with a
                focused 3x3 timer workflow.
              </p>
            </div>
            <Link to="/contribute">
              <Button
                variant="outline"
                className="gap-2 border-black text-black hover:bg-black hover:text-white"
              >
                <Github size={14} />
                Contribute
              </Button>
            </Link>
          </div>
        </header>

        <ScrambleDisplay
          scramble={scramble}
          solutionState={solutionState}
          solution={currentSolution}
          errorMessage={solutionError}
        />
        <Timer onSolve={handleSolve} />
        {solves[0]?.recommendedSolution && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => handleOpenReplay(solves[0])}
              className="inline-flex items-center gap-2 rounded-md border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white transition-colors"
            >
              <Eye size={20} />
              See optimal solution?
            </button>
          </div>
        )}

        <SessionDashboard
          solves={solves}
          onDelete={handleDelete}
          onPenalty={handlePenalty}
        />

        <section className="grid gap-3 xl:grid-cols-2">
          <Card className="border-border bg-card">
            <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserRound size={16} />
                    CubeVault / About Me
                  </CardTitle>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 px-2 text-muted-foreground hover:text-foreground"
                    >
                      {aboutOpen ? "Hide" : "Show"}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${aboutOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
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
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <Card className="border-border bg-card">
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
                <Link to="/contribute">
                  <Button
                    size="sm"
                    className="gap-2 bg-black text-white hover:bg-neutral-800"
                  >
                    <Github size={14} />
                    Open Contribute Page
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Sidebar with solves */}
      <aside className="w-full md:w-72 lg:w-80 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col max-h-[40vh] md:max-h-screen md:h-screen">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Solves ({solves.length})
          </span>
          <div className="flex items-center gap-2">
            {solves.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Export solves as JSON"
              >
                <Download size={12} />
                Export
              </button>
            )}
            {solves.length > 0 && (
              <button
                onClick={() => setSolves([])}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
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
