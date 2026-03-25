import { useState, useCallback, useEffect, CSSProperties } from "react";
import {
  CircleUserRound,
  Cloud,
  CloudOff,
  Download,
  Eye,
  Github,
  Info,
  Loader2,
  RefreshCcw,
  UserRound,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useSolveStore } from "@/hooks/use-solves";
import { useAuth } from "@/hooks/use-auth";
type SolutionState = "loading" | "ready" | "error";

function getStorageBadge(storageMode: ReturnType<typeof useSolveStore>["storageMode"]) {
  switch (storageMode) {
    case "cloud":
      return {
        label: "Cloud Sync",
        icon: Cloud,
        variant: "secondary" as const,
      };
    case "syncing":
      return {
        label: "Syncing",
        icon: RefreshCcw,
        variant: "outline" as const,
      };
    case "sync-error":
      return {
        label: "Needs Sync",
        icon: CloudOff,
        variant: "destructive" as const,
      };
    default:
      return {
        label: "Guest Mode",
        icon: CloudOff,
        variant: "outline" as const,
      };
  }
}

const Index = () => {
  const [scramble, setScramble] = useState(() => generateScramble());
  const [solutionState, setSolutionState] = useState<SolutionState>("loading");
  const [currentSolution, setCurrentSolution] = useState<RecommendedSolution>();
  const [solutionError, setSolutionError] = useState<string>();
  const [replaySolve, setReplaySolve] = useState<Solve | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const [accountPending, setAccountPending] = useState(false);
  const { toast } = useToast();
  const { user, providers, isAuthConfigured, isLoading: authLoading, signInWithOAuth, signOut } =
    useAuth();
  const {
    solves,
    isLoading: solvesLoading,
    storageMode,
    addSolve,
    deleteSolve,
    setPenalty,
    clearSolves,
  } = useSolveStore();
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
        updatedAt: new Date().toISOString(),
        recommendedSolution:
          solutionState === "ready" ? currentSolution : undefined,
      };
      void addSolve(solve);
      setScramble(generateScramble());
    },
    [addSolve, currentSolution, scramble, solutionState]
  );

  const handleDelete = useCallback((id: string) => {
    void deleteSolve(id);
  }, [deleteSolve]);

  const handlePenalty = useCallback(
    (id: string, penalty: "+2" | "DNF" | undefined) => {
      void setPenalty(id, penalty);
    },
    [setPenalty]
  );

  const handleOpenReplay = useCallback((solve: Solve) => {
    if (!solve.recommendedSolution) return;
    setReplaySolve(solve);
    setReplayOpen(true);
  }, []);

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

  const storageBadge = getStorageBadge(storageMode);
  const StorageBadgeIcon = storageBadge.icon;
  const isLoggedIn = Boolean(user);

  const handleAccountClick = useCallback(async () => {
    if (accountPending || authLoading) return;

    if (!isAuthConfigured) {
      toast({
        title: "Login is not configured",
        description:
          "Check /api/auth-meta and set AUTH_SECRET, OAuth keys, and DATABASE_URL in Vercel.",
      });
      return;
    }

    try {
      setAccountPending(true);

      if (user) {
        await signOut();
        return;
      }

      const providerId = providers[0]?.id;
      if (!providerId) {
        toast({
          title: "No OAuth provider found",
          description:
            "Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET (or GitHub) in Vercel environment variables.",
        });
        return;
      }

      await signInWithOAuth(providerId);
    } catch (error) {
      toast({
        title: "Login request failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to start login flow. Check deployment logs for /api/auth.",
      });
    } finally {
      setAccountPending(false);
    }
  }, [
    accountPending,
    authLoading,
    isAuthConfigured,
    providers,
    signInWithOAuth,
    signOut,
    toast,
    user,
  ]);

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
      <div className="relative z-10 flex-1 flex flex-col px-4 py-5 md:px-6 gap-4">
        <header className="rounded-[1.5rem] border-2 border-foreground/85 bg-card px-6 py-4 shadow-[0_9px_0_rgba(0,0,0,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-[0.12em] text-foreground">
                  CubeVault
                </h1>
                <button
                  type="button"
                  onClick={() => void handleAccountClick()}
                  disabled={accountPending || authLoading}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] transition-colors ${
                    isLoggedIn
                      ? "border-foreground/70 bg-card text-foreground hover:bg-black hover:text-white"
                      : isAuthConfigured
                        ? "border-foreground/30 bg-card/50 text-muted-foreground hover:border-foreground/60 hover:text-foreground"
                        : "border-foreground/20 bg-card/40 text-muted-foreground"
                  }`}
                  title={
                    isLoggedIn
                      ? `Signed in as ${user?.email ?? "account"}. Click to sign out.`
                      : isAuthConfigured
                        ? "Sign in"
                        : "Auth not configured"
                  }
                >
                  {accountPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CircleUserRound size={14} />
                  )}
                  {isLoggedIn && <span>ACC - logged in</span>}
                </button>
              </div>
              <p className="mt-2 text-base text-muted-foreground max-w-2xl">
                Rubik-style timer board with clear cube-color visual language.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cubePalette.map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="h-6 w-6 rounded-md border-2 border-black/60 shadow-[inset_0_-2px_0_rgba(0,0,0,0.28)]"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ))}
                <Badge
                  variant={storageBadge.variant}
                  className="gap-1 border border-black/20 bg-card px-2.5 py-1 uppercase tracking-[0.12em]"
                >
                  {storageMode === "syncing" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <StorageBadgeIcon size={12} />
                  )}
                  {storageBadge.label}
                </Badge>
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

        <section className="relative overflow-hidden rounded-[1.6rem] border-2 border-foreground/85 bg-card/95 px-4 py-4 md:px-6 md:py-5 shadow-[0_9px_0_rgba(0,0,0,0.1)]">
          <div className="relative space-y-3">
            <ScrambleDisplay
              scramble={scramble}
              solutionState={solutionState}
              solution={currentSolution}
              errorMessage={solutionError}
            />
            <Timer onSolve={handleSolve} hotkeysEnabled={!replayOpen} />
            {solvesLoading && (
              <div className="flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-muted px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Loading saved solves
                </span>
              </div>
            )}
            {solves[0]?.recommendedSolution && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => handleOpenReplay(solves[0])}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-card px-5 py-2 text-sm text-foreground hover:bg-black hover:text-white transition-colors"
                >
                  <Eye size={16} />
                  Solution
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
              <CardTitle className="text-base flex items-center gap-2">
                <Info size={16} />
                Want To Add Something?
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
                    Contribute
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
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em]">
              Session Log ({solves.length})
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {storageMode === "guest" && "Saved only on this device"}
              {storageMode === "syncing" && "Syncing account storage"}
              {storageMode === "cloud" && "Saved to your account"}
              {storageMode === "sync-error" && "Using local cache until sync recovers"}
            </span>
          </div>
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
                onClick={() => void clearSolves()}
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
