import { Link } from "react-router-dom";
import { Brain, Info } from "lucide-react";
import type { MLResult } from "../types/api";
import { useModelInfo } from "../hooks/useModelInfo";

const TITLES: Record<MLResult["status"], string> = {
  ok: "Model estimate available", not_applicable: "ML model not applicable to this report", needs_verification: "Waiting for you to verify the glucose value",
  incompatible_input: "Inputs are not compatible with the model", unavailable: "ML model unavailable",
};

export default function MLCard({ ml }: { ml: MLResult }) {
  const { info } = useModelInfo();
  const m = info?.test_metrics;
  return (
    <section className="card p-6" aria-labelledby="ml-h">
      <h2 id="ml-h" className="flex items-center gap-2 text-lg font-bold"><Brain className="h-5 w-5 text-brand-600" aria-hidden />Machine-learning analysis</h2>
      <p className="mt-1 text-sm text-slate-500">A separate, experimental feature. It is not a lab flag and not a diagnosis.</p>
      <div className={`mt-4 rounded-xl p-4 ${ml.status === "ok" ? "bg-brand-50" : "bg-slate-50"}`}>
        <p className="font-semibold">{TITLES[ml.status]}</p>
        {ml.reasons.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{ml.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        {ml.estimate && (
          <div className="mt-3">
            <div className="flex items-end justify-between text-sm"><span>Model-estimated likelihood (uncalibrated)</span><span className="text-2xl font-bold tabular-nums">{Math.round(ml.estimate.probability * 100)}%</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200" role="img" aria-label={`Model estimate ${Math.round(ml.estimate.probability * 100)} percent`}>
              <div className="h-full rounded-full bg-brand-600" style={{ width: `${ml.estimate.probability * 100}%` }} />
            </div>
            <p className="mt-3 text-sm text-slate-700">
              For the inputs given, the model places this profile in the <strong>{ml.estimate.band}</strong>-likelihood group relative to the patients it was trained on
              (women of Pima Indian heritage, where the outcome was a diabetes diagnosis within 5 years). This describes a statistical pattern in that dataset, not your health.
            </p>
            <p className="mt-2 text-xs text-slate-600">Inputs used: {Object.entries(ml.estimate.inputs_used).map(([k, v]) => `${k} = ${v}`).join(", ")}.
              {ml.estimate.imputed_features.length > 0 && ` Not provided and filled with the training median: ${ml.estimate.imputed_features.join(", ")}.`}</p>
          </div>
        )}
      </div>
      {m && <p className="mt-4 text-sm text-slate-600">On the held-out test set ({m.n_test} records) this model scored accuracy {(m.accuracy * 100).toFixed(0)}%, recall {(m.recall * 100).toFixed(0)}%, precision {(m.precision * 100).toFixed(0)}% and ROC-AUC {m.roc_auc.toFixed(2)}: useful for a demonstration, far from clinical-grade. <Link className="font-medium text-brand-700 underline" to="/how-it-works#model">Details</Link></p>}
      <details className="mt-3 text-sm text-slate-600"><summary className="flex cursor-pointer items-center gap-1 font-medium"><Info className="h-4 w-4" aria-hidden />Model limitations</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{ml.limitations.map((l) => <li key={l}>{l}</li>)}</ul></details>
    </section>
  );
}
