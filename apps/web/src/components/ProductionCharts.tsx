import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GapResult } from "@/components/OperationsDashboard";

function dhakaLabel(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(
    new Date(`${date}T00:00:00+06:00`),
  );
}

function dhakaDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function dhakaSlot(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

export default function ProductionCharts({
  result,
  lineFilter,
}: {
  result: GapResult;
  lineFilter: string;
}) {
  const points = result.points
    .filter((point) => lineFilter === "all" || point.line === lineFilter)
    .slice(-48)
    .map((point) => ({
      ...point,
      label: dhakaLabel(point.start),
      date: dhakaDate(point.start),
      slot: dhakaSlot(point.start),
      actual: point.actual ?? undefined,
    }));
  const daily = result.daily ?? [];
  const filteredDaily = Object.values(points.reduce<Record<string, { label: string; target: number; actual: number }>>((days, point) => {
    const day = days[point.date] ?? { label: dayLabel(point.date), target: 0, actual: 0 };
    day.target += point.target;
    day.actual += point.actual ?? 0;
    days[point.date] = day;
    return days;
  }, {}));
  const trend: Array<{ label: string; target: number; actual?: number }> = lineFilter === "all" && daily.length >= 2
    ? daily.map((day) => ({ ...day, label: dayLabel(day.date), actual: day.actual_units, target: day.target_units }))
    : filteredDaily.length >= 2 ? filteredDaily : points;
  const fallbackLines = Object.values(points.reduce<Record<string, { line: string; target_units: number; actual_units: number; gap_units: number }>>((summary, point) => {
    const line = summary[point.line] ?? { line: point.line, target_units: 0, actual_units: 0, gap_units: 0 };
    line.target_units += point.target;
    line.actual_units += point.actual ?? 0;
    line.gap_units += point.gap ?? 0;
    summary[point.line] = line;
    return summary;
  }, {})).sort((left, right) => right.gap_units - left.gap_units);
  const lines = (result.by_line ?? fallbackLines).filter((line) => lineFilter === "all" || line.line === lineFilter).slice(0, 8);
  const dates = [...new Set(points.map((point) => point.date))];
  const slots = [...new Set(points.map((point) => point.slot))].slice(0, 12);

  return (
    <section className="chart-grid" aria-label="Production charts from submitted intervals">
      <article className="chart-card chart-card-wide">
        <div className="chart-heading">
          <div>
            <span className="eyebrow">TARGET VS ACTUAL</span>
            <h3>{daily.length >= 2 ? "Daily production trend" : "Interval production trend"}</h3>
          </div>
          <span className="chart-note">Pieces · {trend.length} observed points</span>
        </div>
        <div className="chart-canvas" role="img" aria-label="Target and actual production trend in pieces">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend} margin={{ top: 12, right: 12, left: -10, bottom: 4 }} accessibilityLayer>
              <defs>
                <linearGradient id="actualArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0b7562" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#0b7562" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e7edef" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} width={42} />
              <Tooltip
                formatter={(value, name) => [`${Array.isArray(value) ? value.join("–") : value ?? "—"} pcs`, name === "actual" ? "Actual" : "Target"]}
                contentStyle={{ borderRadius: 10, borderColor: "#d8e1e3" }}
              />
              <Legend formatter={(value) => value === "actual" ? "Actual output" : "Target output"} />
              <Area type="monotone" dataKey="target" stroke="#9a6a10" strokeWidth={2} fill="none" dot={false} />
              <Area type="monotone" dataKey="actual" stroke="#0b7562" strokeWidth={2.5} fill="url(#actualArea)" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-heading">
          <div><span className="eyebrow">LINE PRIORITY</span><h3>Output by line</h3></div>
          <span className="chart-note">Sorted by shortfall</span>
        </div>
        <div className="chart-canvas" role="img" aria-label="Target and actual production by line">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lines} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 4 }} accessibilityLayer>
              <CartesianGrid horizontal={false} stroke="#e7edef" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis dataKey="line" type="category" width={88} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value, name) => [`${Array.isArray(value) ? value.join("–") : value ?? "—"} pcs`, name === "actual_units" ? "Actual" : "Target"]}
                contentStyle={{ borderRadius: 10, borderColor: "#d8e1e3" }}
              />
              <Legend formatter={(value) => value === "actual_units" ? "Actual" : "Target"} />
              <Bar dataKey="target_units" fill="#d7b66f" radius={[0, 4, 4, 0]} />
              <Bar dataKey="actual_units" fill="#0b7562" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="chart-card chart-card-wide">
        <div className="chart-heading">
          <div><span className="eyebrow">GAP PATTERN</span><h3>Time-slot coverage and shortfall</h3></div>
          <span className="chart-note">Gold = a shortfall · Grey = no submitted interval</span>
        </div>
        <div className="heatmap-wrap">
          <table className="gap-heatmap">
            <caption className="sr-only">Submitted production intervals grouped by Dhaka date and time slot</caption>
            <thead><tr><th scope="col">Date</th>{slots.map((slot) => <th scope="col" key={slot}>{slot}</th>)}</tr></thead>
            <tbody>{dates.map((date) => <tr key={date}><th scope="row">{dayLabel(date)}</th>{slots.map((slot) => {
              const point = points.find((item) => item.date === date && item.slot === slot);
              const intensity = point?.gap && point.target ? Math.min(4, Math.max(1, Math.ceil(point.gap / point.target * 4))) : 0;
              const label = point ? `${date} ${slot}: ${point.actual ?? "unknown"} actual of ${point.target} target` : `${date} ${slot}: no submitted interval`;
              return <td key={slot}><span className={`heat-cell heat-${intensity}`} aria-label={label} title={label}>{point?.gap ?? ""}</span></td>;
            })}</tr>)}</tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
