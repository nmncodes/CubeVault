import { useCallback, useState } from "react";
import { Solve, formatTime, getAo, getEffectiveTime } from "@/lib/scramble";
import {
  getAverageTime,
  getBestTime,
  getBestWindowBestN,
  getMedianTime,
  getRecentBestN,
  getStdDeviation,
  getWorstTime,
} from "@/lib/session-stats";

interface SessionDashboardProps {
  solves: Solve[];
  onDelete: (id: string) => void;
  onPenalty: (id: string, penalty: "+2" | "DNF" | undefined) => void;
}

const formatMaybeTime = (value: number | null) =>
  value === null ? "--" : formatTime(Math.round(value));

const formatMaybeAo = (value: number | null) =>
  value === null ? "--" : value < 0 ? "DNF" : formatTime(Math.round(value));

const SolveScatterGraph = ({ solves }: { solves: Solve[] }) => {
  const points = solves
    .slice()
    .reverse()
    .map((solve, index) => ({ x: index + 1, y: getEffectiveTime(solve) }))
    .filter((point) => point.y > 0);

  if (points.length === 0) {
    return (
      <div className="h-[210px] flex items-center justify-center text-sm text-muted-foreground">
        Add solves to render graph
      </div>
    );
  }

  const width = 360;
  const height = 220;
  const padding = { left: 40, right: 16, top: 12, bottom: 30 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const yRange = Math.max(1, maxY - minY);
  const yPad = yRange * 0.2;
  const yMin = Math.max(0, minY - yPad);
  const yMax = maxY + yPad;

  const maxX = Math.max(...points.map((p) => p.x));
  const minX = Math.min(...points.map((p) => p.x));
  const xRange = Math.max(1, maxX - minX);

  const xToPx = (x: number) =>
    padding.left + ((x - minX) / xRange) * innerWidth;
  const yToPx = (y: number) =>
    padding.top + ((yMax - y) / Math.max(1, yMax - yMin)) * innerHeight;
  const plottedPoints = points.map((point) => ({
    ...point,
    px: xToPx(point.x),
    py: yToPx(point.y),
  }));
  const trendPath = plottedPoints.map((point) => `${point.px},${point.py}`).join(" ");
  const xAxisCenter = padding.left + innerWidth / 2;
  const yAxisCenter = padding.top + innerHeight / 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + t * innerHeight;
        return (
          <line
            key={`h-${t}`}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            opacity={0.7}
          />
        );
      })}

      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const x = padding.left + t * innerWidth;
        return (
          <line
            key={`v-${t}`}
            x1={x}
            y1={padding.top}
            x2={x}
            y2={height - padding.bottom}
            stroke="hsl(var(--border))"
            strokeWidth={1}
            opacity={0.7}
          />
        );
      })}

      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.2}
        opacity={0.8}
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.2}
        opacity={0.8}
      />
      <text
        x={xAxisCenter}
        y={height - 6}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={11}
      >
        Solves
      </text>
      <text
        x={14}
        y={yAxisCenter}
        transform={`rotate(-90 14 ${yAxisCenter})`}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={11}
      >
        Time
      </text>

      <polyline
        points={trendPath}
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />

      {plottedPoints.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={point.px}
          cy={point.py}
          r={4}
          fill="hsl(var(--primary))"
        />
      ))}
    </svg>
  );
};

const SessionDashboard = ({
  solves,
  onDelete,
  onPenalty,
}: SessionDashboardProps) => {
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const displayedSolves = solves.slice(0, 12);

  const best = getBestTime(solves);
  const worst = getWorstTime(solves);
  const average = getAverageTime(solves);
  const median = getMedianTime(solves);
  const stdDeviation = getStdDeviation(solves);

  const avg5 = getAo(solves, 5);
  const threeOfFive = getRecentBestN(solves, 5, 3);
  const bestThreeOfFive = getBestWindowBestN(solves, 5, 3);

  const avg12 = getAo(solves, 12);
  const tenOfTwelve = getRecentBestN(solves, 12, 10);
  const bestTenOfTwelve = getBestWindowBestN(solves, 12, 10);

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
    <section className="grid gap-3 lg:grid-cols-[1.28fr_1.1fr_1fr]">
      <div className="relative rounded-md border border-border/80 bg-card/65 p-3 pt-4">
        <span className="absolute -top-3 left-4 rounded-md border border-border bg-background px-3 py-0.5 text-[13px] font-semibold text-primary">
          Times
        </span>
        <div className="max-h-[250px] overflow-y-auto space-y-1">
          {displayedSolves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No times yet
            </p>
          ) : (
            displayedSolves.map((solve, index) => {
              const effective = getEffectiveTime(solve);
              const isDeleting = deletingIds.includes(solve.id);
              const label =
                solve.penalty === "DNF"
                  ? "DNF"
                  : solve.penalty === "+2"
                    ? `${formatTime(effective)}+`
                    : formatTime(solve.time);

              return (
                <div
                  key={solve.id}
                  className={`grid grid-cols-[2.1rem_1fr_auto] items-center rounded-sm px-2 py-1.5 text-sm transition-colors duration-200 ${
                    isDeleting ? "bg-destructive/20" : "bg-secondary/25"
                  }`}
                >
                  <span className="font-mono-timer text-muted-foreground">
                    {solves.length - index}.
                  </span>
                  <span className="font-mono-timer font-semibold">{label}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <button
                      onClick={() =>
                        onPenalty(solve.id, solve.penalty === "+2" ? undefined : "+2")
                      }
                      className="hover:text-foreground transition-colors"
                    >
                      +2
                    </button>
                    <button
                      onClick={() =>
                        onPenalty(solve.id, solve.penalty === "DNF" ? undefined : "DNF")
                      }
                      className="hover:text-foreground transition-colors"
                    >
                      DNF
                    </button>
                    <button
                      onClick={() => handleDeleteWithTransition(solve.id)}
                      className="hover:text-destructive transition-colors"
                    >
                      X
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="relative rounded-md border border-border/80 bg-card/65 p-3 pt-4">
        <span className="absolute -top-3 left-4 rounded-md border border-border bg-background px-3 py-0.5 text-[13px] font-semibold text-primary">
          Statistics
        </span>
        <div className="space-y-1 text-[14px]">
          <div className="flex justify-between">
            <span>Best:</span>
            <span className="font-mono-timer">{formatMaybeTime(best)}</span>
          </div>
          <div className="flex justify-between">
            <span>Worst:</span>
            <span className="font-mono-timer">{formatMaybeTime(worst)}</span>
          </div>
          <div className="flex justify-between">
            <span>Average:</span>
            <span className="font-mono-timer">{formatMaybeTime(average)}</span>
          </div>
          <div className="flex justify-between">
            <span>Median:</span>
            <span className="font-mono-timer">{formatMaybeTime(median)}</span>
          </div>
          <div className="flex justify-between">
            <span>S Deviation:</span>
            <span className="font-mono-timer">{formatMaybeTime(stdDeviation)}</span>
          </div>
          <hr className="my-2 border-border/80" />
          <div className="flex justify-between">
            <span>Avg 5:</span>
            <span className="font-mono-timer">{formatMaybeAo(avg5)}</span>
          </div>
          <div className="flex justify-between">
            <span>3 of 5:</span>
            <span className="font-mono-timer">{formatMaybeTime(threeOfFive)}</span>
          </div>
          <div className="flex justify-between">
            <span>Best 3 of 5:</span>
            <span className="font-mono-timer">
              {formatMaybeTime(bestThreeOfFive)}
            </span>
          </div>
          <hr className="my-2 border-border/80" />
          <div className="flex justify-between">
            <span>Avg 12:</span>
            <span className="font-mono-timer">{formatMaybeAo(avg12)}</span>
          </div>
          <div className="flex justify-between">
            <span>10 of 12:</span>
            <span className="font-mono-timer">{formatMaybeTime(tenOfTwelve)}</span>
          </div>
          <div className="flex justify-between">
            <span>Best 10 of 12:</span>
            <span className="font-mono-timer">
              {formatMaybeTime(bestTenOfTwelve)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative rounded-md border border-border/80 bg-card/65 p-3 pt-4">
        <span className="absolute -top-3 left-4 rounded-md border border-border bg-background px-3 py-0.5 text-[13px] font-semibold text-primary">
          Graph
        </span>
        <SolveScatterGraph solves={solves} />
      </div>
    </section>
  );
};

export default SessionDashboard;
