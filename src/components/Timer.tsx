import { useState, useRef, useCallback, useEffect } from "react";
import { formatTime } from "@/lib/scramble";

type TimerState = "idle" | "holding" | "ready" | "running";

interface TimerProps {
  onSolve: (time: number) => void;
  hotkeysEnabled?: boolean;
}

const Timer = ({ onSolve, hotkeysEnabled = true }: TimerProps) => {
  const [display, setDisplay] = useState("0.00");
  const [state, setState] = useState<TimerState>("idle");
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const stateRef = useRef<TimerState>("idle");
  const onSolveRef = useRef(onSolve);

  stateRef.current = state;

  useEffect(() => {
    onSolveRef.current = onSolve;
  }, [onSolve]);

  const updateDisplay = useCallback(() => {
    const elapsed = performance.now() - startTimeRef.current;
    setDisplay(formatTime(elapsed));
    rafRef.current = requestAnimationFrame(updateDisplay);
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    setState("running");
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateDisplay);
  }, [updateDisplay]);

  const stopTimer = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const elapsed = performance.now() - startTimeRef.current;
    const rounded = Math.round(elapsed);
    setDisplay(formatTime(rounded));
    setState("idle");
    onSolveRef.current(rounded);
  }, []);

  useEffect(() => {
    if (!hotkeysEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();
      if (e.repeat) return;

      if (stateRef.current === "running") {
        stopTimer();
        return;
      }

      if (stateRef.current === "idle") {
        setState("holding");
        holdTimerRef.current = setTimeout(() => {
          setState("ready");
        }, 300);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      e.preventDefault();

      if (stateRef.current === "ready") {
        startTimer();
      } else if (stateRef.current === "holding") {
        clearTimeout(holdTimerRef.current);
        setState("idle");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      clearTimeout(holdTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [hotkeysEnabled, startTimer, stopTimer]);

  // Touch support
  const handleTouchStart = useCallback(() => {
    if (stateRef.current === "running") {
      stopTimer();
      return;
    }
    if (stateRef.current === "idle") {
      setState("holding");
      holdTimerRef.current = setTimeout(() => {
        setState("ready");
      }, 300);
    }
  }, [stopTimer]);

  const handleTouchEnd = useCallback(() => {
    if (stateRef.current === "ready") {
      startTimer();
    } else if (stateRef.current === "holding") {
      clearTimeout(holdTimerRef.current);
      setState("idle");
    }
  }, [startTimer]);

  const colorClass =
    state === "ready"
      ? "text-[hsl(var(--timer-ready))]"
      : state === "holding"
        ? "text-[hsl(var(--timer-running))]"
        : state === "running"
          ? "text-[hsl(var(--timer-idle))]"
          : "text-[hsl(var(--timer-idle))]";

  return (
    <div
      className="relative flex flex-col items-center justify-center flex-1 select-none cursor-pointer min-h-[34vh] md:min-h-[36vh] rounded-[1.5rem] border-2 border-foreground/85 bg-card px-4 py-4 shadow-[0_8px_0_rgba(0,0,0,0.1)]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="pointer-events-none absolute inset-x-8 top-4 h-2 rounded-full bg-[linear-gradient(90deg,#ef4444_0%,#3b82f6_20%,#22c55e_40%,#f8fafc_60%,#facc15_80%,#f97316_100%)] opacity-90" />
      <div className="pointer-events-none absolute inset-x-8 bottom-4 h-2 rounded-full bg-[linear-gradient(90deg,#f97316_0%,#facc15_20%,#f8fafc_40%,#22c55e_60%,#3b82f6_80%,#ef4444_100%)] opacity-90" />
      <div className="relative flex flex-col items-center">
        <span
          className={`font-mono-timer text-[4.4rem] sm:text-[5.6rem] md:text-[7.2rem] lg:text-[8.2rem] xl:text-[9rem] font-bold tracking-[0.04em] transition-colors duration-150 ${colorClass} ${state === "ready" ? "animate-pulse-ready" : ""}`}
          style={{ lineHeight: 1 }}
        >
          {display}
        </span>
        <p className="mt-3 rounded-full border border-foreground/30 bg-muted px-3 py-1 text-muted-foreground text-xs md:text-sm uppercase tracking-[0.18em]">
          {state === "idle" && "Hold Space"}
          {state === "holding" && "Hold..."}
          {state === "ready" && "Release To Launch"}
          {state === "running" && "Tap / Space To Stop"}
        </p>
      </div>
    </div>
  );
};

export default Timer;
