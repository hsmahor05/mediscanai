import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TestResult } from "../types/api";
import { deviationPct, STATUS_COLOR, STATUS_LABEL } from "../utils/format";

export default function DeviationChart({ tests }: { tests: TestResult[] }) {
  const data = tests.map((t) => ({ name: t.name.replace(/ \(.*\)/, ""), dev: deviationPct(t), status: t.comparison_status }))
    .filter((d): d is { name: string; dev: number; status: TestResult["comparison_status"] } => d.dev !== null)
    .map((d) => ({ ...d, dev: Math.round(d.dev * 10) / 10 }));
  if (data.length === 0) return <p className="text-sm text-slate-500">No values with a usable reference range to chart yet.</p>;
  return (
    <figure>
      <div style={{ height: Math.max(220, data.length * 34 + 60) }} role="img" aria-label="Bar chart of how far each value lies outside its reference range">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" unit="%" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
            <ReferenceLine x={0} stroke="#475569" />
            <Tooltip formatter={(v: number, _n, p) => [`${v}% (${STATUS_LABEL[(p.payload as { status: TestResult["comparison_status"] }).status]})`, "Distance outside range"]} />
            <Bar dataKey="dev" radius={3}>{data.map((d, i) => <Cell key={i} fill={STATUS_COLOR[d.status]} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-slate-500">Zero means within the applicable range. Bars show how far a value lies below (left) or above (right) the nearest range limit, as a percentage of that limit. Tests without a usable range are omitted.</figcaption>
    </figure>
  );
}
