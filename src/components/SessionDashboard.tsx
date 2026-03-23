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
  mode?: "stats" | "graph" | "both";
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
      <div className="h-[210px] flex items-center justify-center text-sm uppercase tracking-[0.15em] text-muted-foreground">
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
            opacity={0.45}
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
            opacity={0.45}
          />
        );
      })}

      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.3}
        opacity={0.9}
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.3}
        opacity={0.9}
      />
      <text
        x={xAxisCenter}
        y={height - 6}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={11}
        letterSpacing="2"
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
        letterSpacing="2"
      >
        Time
      </text>

      <polyline
        points={trendPath}
        fill="none"
        stroke="#111111"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />

      {plottedPoints.map((point, index) => (
        <circle
          key={`${point.x}-${point.y}-${index}`}
          cx={point.px}
          cy={point.py}
          r={4}
          fill="#111111"
        />
      ))}
    </svg>
  );
};

const StatisticsPanel = ({ solves }: { solves: Solve[] }) => {
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

  const statItems: Array<{ label: string; value: string }> = [
    { label: "Best", value: formatMaybeTime(best) },
    { label: "Worst", value: formatMaybeTime(worst) },
    { label: "Average", value: formatMaybeTime(average) },
    { label: "Median", value: formatMaybeTime(median) },
    { label: "Avg 5", value: formatMaybeAo(avg5) },
    { label: "Avg 12", value: formatMaybeAo(avg12) },
  ];

  return (
    <div className="relative w-full rounded-2xl border-2 border-black bg-card p-4 pt-5">
      <span className="absolute -top-3 left-4 rounded-full border border-black bg-background px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
        Statistics
      </span>
      <div className="grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-3">
        {statItems.map((item, index) => {
          return (
          <div
            key={item.label}
            className="rounded-lg border px-3 py-2"
            style={{
              borderColor: "#0f172a",
              backgroundColor: "hsl(var(--background) / 0.38)",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.12em]">
              {item.label}
            </p>
            <p className="mt-0.5 font-mono-timer text-base text-foreground">
              {item.value}
            </p>
          </div>
          );
        })}
      </div>
    </div>
  );
};

const GraphPanel = ({ solves }: { solves: Solve[] }) => (
  <div className="relative rounded-2xl border-2 border-black bg-card p-4 pt-5">
    <span className="absolute -top-3 left-4 rounded-full border border-black bg-background px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
      Graph
    </span>
    <SolveScatterGraph solves={solves} />
  </div>
);

const SessionDashboard = ({ solves, mode = "both" }: SessionDashboardProps) => {
  if (mode === "stats") {
    return (
      <section className="flex justify-start">
        <StatisticsPanel solves={solves} />
      </section>
    );
  }

  if (mode === "graph") {
    return <GraphPanel solves={solves} />;
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <StatisticsPanel solves={solves} />
      <GraphPanel solves={solves} />
    </section>
  );
};

export default SessionDashboard;
