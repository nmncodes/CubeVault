import { useState, useRef, useCallback, useEffect } from "react";
import { formatTime } from "@/lib/scramble";

type TimerState = "idle" | "holding" | "ready" | "running";

interface TimerProps {
  onSolve: (time: number) => void;
}

const Timer = ({ onSolve }: TimerProps) => {
  const [display, setDisplay] = useState("0.00");
  const [state, setState] = useState<TimerState>("idle");
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const stateRef = useRef<TimerState>("idle");

  stateRef.current = state;

  const updateDisplay = useCallback(() => {
    const elapsed = performance.now() - startTimeRef.current;
    setDisplay(formatTime(elapsed));
    rafRef.current = requestAnimationFrame(updateDisplay);
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = performance.now();
    setState("running");
    rafRef.current = requestAnimationFrame(updateDisplay);
  }, [updateDisplay]);

  const stopTimer = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const elapsed = performance.now() - startTimeRef.current;
    const rounded = Math.round(elapsed);
    setDisplay(formatTime(rounded));
    setState("idle");
    onSolve(rounded);
  }, [onSolve]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();

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
      if (e.code !== "Space") return;
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
  }, [startTimer, stopTimer]);

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
      ? "text-[hsl(var(--timer-ready))] animate-pulse-ready"
      : state === "holding"
        ? "text-[hsl(var(--timer-running))]"
        : state === "running"
          ? "text-foreground"
          : "text-[hsl(var(--timer-idle))]";

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 select-none cursor-pointer min-h-[40vh]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <span
        className={`font-mono-timer text-7xl sm:text-8xl md:text-9xl font-bold transition-colors duration-150 ${colorClass}`}
        style={{ lineHeight: 1 }}
      >
        {display}
      </span>
      <p className="mt-6 text-muted-foreground text-sm">
        {state === "idle" && "Hold space to start"}
        {state === "holding" && "Hold..."}
        {state === "ready" && "Release to start!"}
        {state === "running" && "Tap or press space to stop"}
      </p>
    </div>
  );
};

export default Timer;
