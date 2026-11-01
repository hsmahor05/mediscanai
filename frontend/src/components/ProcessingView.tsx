import { CheckCircle2, Loader2, MinusCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import type { Phase } from "../hooks/useAnalysis";
import type { ApiError } from "../services/api";
import type { PipelineStep } from "../types/api";

const STAGES = ["Receiving the report", "Extracting text or running OCR", "Identifying laboratory values and units", "Validating extracted information", "Comparing with reference ranges", "Running the ML model when compatible", "Preparing the summary"];

interface Props { phase: Phase; uploadPct: number; error: ApiError | null; onRetry: () => void; onReset: () => void; }

export default function ProcessingView({ phase, uploadPct, error, onRetry, onReset }: Props) {
  if (phase === "error" && error) {
    return (
      <div role="alert" className="card mx-auto max-w-2xl p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
        <h2 className="mt-3 text-xl font-bold">We could not analyze this report</h2>
        <p className="mt-2 text-slate-600">{error.message}</p>
        {error.code === "ocr_unavailable" && <p className="mt-2 text-sm text-slate-500">You can still enter your values by hand using the manual entry option.</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn-primary" onClick={onRetry}><RefreshCw className="h-4 w-4" aria-hidden />Try again</button>
          <button className="btn-secondary" onClick={onReset}>Choose a different file</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card mx-auto max-w-2xl p-8" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden />
        <h2 className="text-xl font-bold">{phase === "uploading" ? "Uploading your report" : "Analyzing your report"}</h2>
      </div>
      {phase === "uploading" ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={uploadPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${uploadPct}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">{uploadPct}% sent to the server</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-slate-600">The server is working through these stages. A per-stage log with real timings appears with your results.</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/3 animate-pulse rounded-full bg-brand-500" /></div>
          <ol className="mt-4 space-y-2 text-sm text-slate-500">{STAGES.map((s, i) => <li key={s} className="flex gap-2"><span className="w-5 text-right tabular-nums">{i + 1}.</span>{s}</li>)}</ol>
        </div>
      )}
      <p className="mt-6 text-xs text-slate-400">First request after a period of inactivity can take up to a minute on free hosting.</p>
    </div>
  );
}

export function PipelineLog({ steps }: { steps: PipelineStep[] }) {
  const icon = (s: PipelineStep["status"]) => s === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="done" /> : s === "skipped" ? <MinusCircle className="h-4 w-4 text-slate-400" aria-label="skipped" /> : <XCircle className="h-4 w-4 text-red-600" aria-label="failed" />;
  return (
    <ol className="space-y-3">{steps.map((s) => (
      <li key={s.name} className="flex gap-3 text-sm"><span className="mt-0.5">{icon(s.status)}</span><div><p className="font-medium">{s.name}</p><p className="text-slate-500">{s.detail}</p></div></li>
    ))}</ol>
  );
}
