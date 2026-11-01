import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, CheckCheck, AlertCircle } from "lucide-react";
import type { SupportedTest, TestInput, TestResult } from "../types/api";
import { fmtNum } from "../utils/format";

interface Props { tests: TestResult[]; supported: SupportedTest[]; busy: boolean; onSubmit: (rows: TestInput[]) => void; }

const fromResult = (t: TestResult): TestInput => ({
  key: t.key, name: t.name, value: t.value, value_operator: t.value_operator, unit: t.unit, ref_low: t.ref_low, ref_high: t.ref_high,
  user_verified: t.user_verified, extraction_status: t.extraction_status, review_reasons: t.review_reasons,
});

export default function ReviewTable({ tests, supported, busy, onSubmit }: Props) {
  const [rows, setRows] = useState<TestInput[]>(() => tests.map(fromResult));
  useEffect(() => setRows(tests.map(fromResult)), [tests]);

  const set = (i: number, patch: Partial<TestInput>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch, user_verified: patch.user_verified ?? false } : x)));
  const numOrNull = (v: string) => (v === "" ? null : Number(v));
  const invalid = rows.some((r) => !Number.isFinite(r.value));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-2">Test</th><th className="pb-2 pr-2">Value</th><th className="pb-2 pr-2">Unit</th>
            <th className="pb-2 pr-2" title="Reference range printed on your report">Report range (low / high)</th><th className="pb-2 pr-2">Verified</th><th className="pb-2"><span className="sr-only">Remove</span></th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="py-2 pr-2">
                  <select aria-label={`Test type for row ${i + 1}`} className="input" value={r.key ?? "__other"} onChange={(e) => set(i, { key: e.target.value === "__other" ? null : e.target.value, review_reasons: [] })}>
                    {supported.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
                    <option value="__other">Other (no generic range)</option>
                  </select>
                  {r.key === null && <input aria-label={`Custom name for row ${i + 1}`} className="input mt-1" placeholder="Test name" value={r.name ?? ""} onChange={(e) => set(i, { name: e.target.value })} />}
                  {(r.review_reasons?.length ?? 0) > 0 && !r.user_verified && (
                    <p className="mt-1 flex gap-1 text-xs text-amber-800"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{r.review_reasons![0]}</p>
                  )}
                </td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    {r.value_operator && <span className="text-slate-500">{r.value_operator}</span>}
                    <input aria-label={`Value for row ${i + 1}`} className="input w-28" type="number" step="any" value={Number.isFinite(r.value) ? r.value : ""} onChange={(e) => set(i, { value: e.target.value === "" ? NaN : Number(e.target.value), value_operator: null })} />
                  </div>
                </td>
                <td className="py-2 pr-2"><input aria-label={`Unit for row ${i + 1}`} className="input w-28" value={r.unit ?? ""} onChange={(e) => set(i, { unit: e.target.value || null })} /></td>
                <td className="py-2 pr-2">
                  <div className="flex gap-1">
                    <input aria-label={`Range low for row ${i + 1}`} className="input w-20" type="number" step="any" placeholder="low" value={fmtNum(r.ref_low)} onChange={(e) => set(i, { ref_low: numOrNull(e.target.value) })} />
                    <input aria-label={`Range high for row ${i + 1}`} className="input w-20" type="number" step="any" placeholder="high" value={fmtNum(r.ref_high)} onChange={(e) => set(i, { ref_high: numOrNull(e.target.value) })} />
                  </div>
                </td>
                <td className="py-2 pr-2"><input type="checkbox" className="h-5 w-5 accent-brand-600" aria-label={`Mark row ${i + 1} as verified against my report`} checked={r.user_verified} onChange={(e) => setRows((x) => x.map((y, j) => j === i ? { ...y, user_verified: e.target.checked } : y))} /></td>
                <td className="py-2"><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove row ${i + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No tests yet. Add a row to enter a value from your report.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" onClick={() => setRows((r) => [...r, { key: "hemoglobin", value: NaN, unit: "g/dL", user_verified: false }])}><Plus className="h-4 w-4" aria-hidden />Add test</button>
        <button type="button" className="btn-secondary" onClick={() => setRows((r) => r.map((x) => ({ ...x, user_verified: true })))}><CheckCheck className="h-4 w-4" aria-hidden />Mark all as verified</button>
        <button type="button" className="btn-primary" disabled={busy || invalid} onClick={() => onSubmit(rows)}><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} aria-hidden />Update comparison</button>
        {invalid && <span role="alert" className="self-center text-sm text-red-700">Every row needs a numeric value.</span>}
      </div>
    </div>
  );
}
