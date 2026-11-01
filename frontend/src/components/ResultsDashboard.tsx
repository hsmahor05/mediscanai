import { Fragment, useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Printer, RotateCcw, ScanLine } from "lucide-react";
import type { AnalysisResponse, Profile, SupportedTest, TestInput } from "../types/api";
import { getSupportedTests } from "../services/api";
import { fmtNum, fmtRange } from "../utils/format";
import Disclaimer from "./Disclaimer";
import DeviationChart from "./DeviationChart";
import MLCard from "./MLCard";
import ProfileForm from "./ProfileForm";
import { PipelineLog } from "./ProcessingView";
import ReviewTable from "./ReviewTable";
import StatusBadge from "./StatusBadge";

interface Props { result: AnalysisResponse; profile: Profile; setProfile: (p: Profile) => void; busy: boolean; onUpdate: (rows: TestInput[]) => void; onNew: () => void; }

const SOURCE_LABEL = { pdf_text: "Text read directly from a digital PDF", pdf_ocr: "Scanned PDF read with OCR", image_ocr: "Image read with OCR", manual: "Values entered manually" } as const;

export default function ResultsDashboard({ result, profile, setProfile, busy, onUpdate, onNew }: Props) {
  const [supported, setSupported] = useState<SupportedTest[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const s = result.summary;
  const [reviewOpen, setReviewOpen] = useState(s.needs_review > 0 || result.tests.length === 0);
  useEffect(() => { getSupportedTests().then(setSupported).catch(() => setSupported([])); }, []);

  const tiles: [string, number, string][] = [["Tests found", s.total, "text-slate-900"], ["Within range", s.within, "text-emerald-700"], ["Below range", s.below, "text-sky-700"], ["Above range", s.above, "text-amber-700"], ["Unable to determine", s.undetermined, "text-slate-600"], ["Need review", s.needs_review, "text-amber-800"]];

  return (
    <div className="space-y-6 rise">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analysis results</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><ScanLine className="h-4 w-4" aria-hidden />{SOURCE_LABEL[result.source.kind]}{result.source.pages > 0 && ` - ${result.source.pages} page(s)`}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="btn-secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print summary</button>
          <button className="btn-secondary" onClick={onNew}><RotateCcw className="h-4 w-4" aria-hidden />New report</button>
        </div>
      </div>

      <Disclaimer compact />

      {result.warnings.length > 0 && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" aria-hidden />Please check</p>
          <ul className="mt-1 list-disc space-y-1 pl-6">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, n, c]) => <div key={label} className="card p-4"><p className={`text-3xl font-bold tabular-nums ${c}`}>{n}</p><p className="mt-1 text-xs font-medium text-slate-500">{label}</p></div>)}
      </div>

      <section className="card p-6 print:hidden" aria-labelledby="review-h">
        <button className="flex w-full items-center justify-between text-left" aria-expanded={reviewOpen} onClick={() => setReviewOpen(!reviewOpen)}>
          <span><span id="review-h" className="block text-lg font-bold">Review and correct extracted values</span>
            <span className="text-sm text-slate-500">Automatic extraction can make mistakes. Compare each row with your report, fix anything wrong, tick Verified, then update.</span></span>
          <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${reviewOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {reviewOpen && (
          <div className="mt-5 space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Details (used for sex-specific ranges and the ML model)</h3>
              <ProfileForm profile={profile} onChange={setProfile} />
            </div>
            <ReviewTable tests={result.tests} supported={supported} busy={busy} onSubmit={onUpdate} />
          </div>
        )}
      </section>

      <section className="card p-6" aria-labelledby="values-h">
        <h2 id="values-h" className="text-lg font-bold">Laboratory values and reference ranges</h2>
        {result.tests.length === 0 ? <p className="mt-3 text-sm text-slate-500">No values yet. Use the review section above to add them.</p> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="pb-2">Test</th><th className="pb-2">Your value</th><th className="pb-2">Reference range</th><th className="pb-2">Status</th><th className="pb-2"><span className="sr-only">Explanation</span></th></tr></thead>
              <tbody>
                {result.tests.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-3 font-medium">{t.name}{t.extraction_status === "needs_review" && !t.user_verified && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">Needs review</span>}</td>
                      <td className="py-3 pr-3 tabular-nums">{t.value_operator ?? ""}{fmtNum(t.value)} <span className="text-slate-500">{t.unit}</span>{t.converted_from && <span className="block text-xs text-slate-400">converted from {t.converted_from}</span>}</td>
                      <td className="py-3 pr-3 tabular-nums">{fmtRange(t.applied_range)}{t.applied_range && <span className="block text-xs text-slate-400">{t.applied_range.source === "report" ? "printed on your report" : "generic adult range"}</span>}</td>
                      <td className="py-3 pr-3"><StatusBadge status={t.comparison_status} />{t.comparison_note && <span className="mt-1 block max-w-[240px] text-xs text-slate-500">{t.comparison_note}</span>}</td>
                      <td className="py-3 text-right print:hidden">{t.explanation && <button className="text-xs font-medium text-brand-700 underline" aria-expanded={open === t.id} onClick={() => setOpen(open === t.id ? null : t.id)}>What is this?</button>}</td>
                    </tr>
                    {open === t.id && <tr><td colSpan={5} className="bg-slate-50 px-4 py-3 text-sm text-slate-700">{t.explanation}<p className="mt-1 text-xs text-slate-500">General education only. Whether a result matters depends on your history, symptoms and other tests, so please discuss it with a clinician.</p></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">"Below / within / above range" only compares a number with a range. It is not a diagnosis. Ranges vary by laboratory, method, age and sex, so the range printed on your report is used whenever it was found.</p>
      </section>

      <section className="card p-6" aria-labelledby="chart-h"><h2 id="chart-h" className="mb-4 text-lg font-bold">Visual overview</h2><DeviationChart tests={result.tests} /></section>

      <MLCard ml={result.ml} />

      <section className="card p-6 print:hidden" aria-labelledby="log-h"><h2 id="log-h" className="mb-4 text-lg font-bold">What the server did</h2><PipelineLog steps={result.pipeline} /></section>
    </div>
  );
}
