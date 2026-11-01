import type { Status, TestResult } from "../types/api";

export const STATUS_LABEL: Record<Status, string> = { below: "Below range", within: "Within range", above: "Above range", undetermined: "Unable to determine" };
export const STATUS_STYLE: Record<Status, string> = {
  below: "bg-sky-50 text-sky-800 ring-sky-200", within: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  above: "bg-amber-50 text-amber-900 ring-amber-200", undetermined: "bg-slate-100 text-slate-700 ring-slate-200",
};
export const STATUS_COLOR: Record<Status, string> = { below: "#0284c7", within: "#059669", above: "#d97706", undetermined: "#94a3b8" };

export const fmtNum = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(Number(n.toPrecision(6))));

export function fmtRange(r: TestResult["applied_range"]): string {
  if (!r) return "Not available";
  if (r.low !== null && r.high !== null) return `${fmtNum(r.low)} - ${fmtNum(r.high)}`;
  if (r.high !== null) return `< ${fmtNum(r.high)}`;
  if (r.low !== null) return `> ${fmtNum(r.low)}`;
  return "Not available";
}

/** % distance outside the applicable range (0 when within). Null if it cannot be computed. */
export function deviationPct(t: TestResult): number | null {
  const r = t.applied_range;
  if (!r || t.comparison_status === "undetermined") return null;
  if (t.comparison_status === "within") return 0;
  if (t.comparison_status === "below" && r.low) return ((t.value - r.low) / r.low) * 100;
  if (t.comparison_status === "above" && r.high) return ((t.value - r.high) / r.high) * 100;
  return null;
}
