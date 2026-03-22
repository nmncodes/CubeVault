import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MiniCube from "@/components/MiniCube";
import ThreeCubePlayer from "@/components/ThreeCubePlayer";
import { parseAlgorithm } from "@/lib/cube-visualizer";
import { formatTime, Solve } from "@/lib/scramble";
import { cn } from "@/lib/utils";

interface SolutionReplayDialogProps {
  open: boolean;
  solve: Solve | null;
  onOpenChange: (open: boolean) => void;
}

const PLAYBACK_INTERVAL_MS = 800;

const SolutionReplayDialog = ({
  open,
  solve,
  onOpenChange,
}: SolutionReplayDialogProps) => {
  const solution = solve?.recommendedSolution;
  const moves = useMemo(
    () => parseAlgorithm(solution?.algorithm ?? ""),
    [solution?.algorithm]
  );
  const states = useMemo(() => {
    if (!solution?.states?.length) return [];
    if (solution.states.length !== moves.length + 1) return [];
    return solution.states;
  }, [moves.length, solution?.states]);

  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const maxStep = Math.max(0, states.length - 1);

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      return;
    }
    setStep(0);
    setPlaying(false);
  }, [open, solution?.generatedAt]);

  useEffect(() => {
    if (!playing || !open || maxStep === 0) return;

    const interval = window.setInterval(() => {
      setStep((current) => {
        if (current >= maxStep) return maxStep;
        return current + 1;
      });
    }, PLAYBACK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [maxStep, open, playing]);

  useEffect(() => {
    if (step >= maxStep) setPlaying(false);
  }, [maxStep, step]);

  const currentMove = step === 0 ? "Start" : moves[step - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-mono-timer">
            Optimal Replay
          </DialogTitle>
          <DialogDescription>
            {solve ? `Solve: ${formatTime(solve.time)}` : "Replay"}
            {solution ? ` | ${solution.method} | ${solution.moveCount} moves` : ""}
          </DialogDescription>
        </DialogHeader>

        {!solution && (
          <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
            No solution attached to this solve.
          </div>
        )}

        {solution && states.length === 0 && (
          <div className="rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground">
            This solve only has an algorithm string. New solves will include full
            visual replay states.
          </div>
        )}

        {solution && states.length > 0 && (
          <div className="space-y-4">
            <ThreeCubePlayer
              scramble={solve?.scramble ?? ""}
              solutionAlgorithm={solution.algorithm}
              targetStep={step}
            />

            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setStep(0)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent/20"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent/20"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPlaying((current) => !current)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent/20"
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => setPlaying(false)}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent/20"
                >
                  <Square size={14} />
                </button>
                <button
                  onClick={() =>
                    setStep((current) => Math.min(maxStep, current + 1))
                  }
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent/20"
                >
                  <ChevronRight size={14} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={maxStep}
                  value={step}
                  onChange={(event) => setStep(Number(event.target.value))}
                  className="ml-2 h-2 w-40 accent-primary"
                />
                <span className="font-mono-timer text-sm text-muted-foreground">
                  Step {step}/{maxStep} | {currentMove}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-sm font-mono-timer">
                {moves.map((move, index) => (
                  <span
                    key={`${move}-${index}`}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-muted-foreground",
                      index === step - 1 && "bg-primary/20 text-primary"
                    )}
                  >
                    {move}
                  </span>
                ))}
              </div>
            </div>

            <div className="max-h-[58vh] overflow-y-auto rounded-lg border border-border bg-card/20 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {states.map((state, index) => {
                  const move = index === 0 ? "Start" : moves[index - 1];
                  const isDouble = move.includes("2");

                  return (
                    <button
                      key={`step-${index}`}
                      onClick={() => setStep(index)}
                      className={cn(
                        "rounded-xl border bg-card/60 p-3 text-left transition-colors",
                        step === index
                          ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                          : "border-border hover:bg-secondary/40"
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono-timer text-base">
                          {index === 0 ? "Start" : `${index}: ${move}`}
                        </span>
                        {isDouble && (
                          <span className="font-mono-timer text-xs text-muted-foreground">
                            2x
                          </span>
                        )}
                      </div>
                      <MiniCube state={state} className="mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SolutionReplayDialog;
