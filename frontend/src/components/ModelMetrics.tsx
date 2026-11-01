import { useModelInfo } from "../hooks/useModelInfo";

export default function ModelMetrics() {
  const { info, error } = useModelInfo();
  if (error) return <p role="alert" className="rounded-lg bg-slate-100 p-4 text-sm text-slate-700">Live model metrics could not be loaded ({error}). Start the backend to see them.</p>;
  if (!info) return <p className="text-sm text-slate-500">Loading model details from the backend...</p>;
  if (!info.available || !info.test_metrics || !info.cross_validation || !info.dataset) return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{info.message ?? "Model unavailable."}</p>;
  const m = info.test_metrics, cm = m.confusion_matrix.matrix;
  const cv = Object.entries(info.cross_validation);
  return (
    <div className="space-y-6 text-sm">
      <p className="text-slate-600">Everything below is read live from the trained model's saved evaluation (<code>metrics.json</code>); nothing is hard-coded in the website. Dataset: {info.dataset.records} records ({Object.entries(info.dataset.class_counts).map(([k, v]) => `class ${k}: ${v}`).join(", ")}); split: {info.split?.train} train / {info.split?.test} test; seed {info.random_seed}.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[420px]"><caption className="mb-2 text-left font-semibold">Model comparison (5-fold cross-validation, training data only)</caption>
        <thead><tr className="text-left text-xs uppercase text-slate-500"><th className="pb-1">Model</th><th className="pb-1">ROC-AUC (mean +/- std)</th><th className="pb-1">Selected</th></tr></thead>
        <tbody>{cv.map(([k, v]) => <tr key={k} className="border-t border-slate-100"><td className="py-1.5">{k.replace(/_/g, " ")}</td><td className="tabular-nums">{v.roc_auc_mean.toFixed(3)} +/- {v.roc_auc_std.toFixed(3)}</td><td>{k === info.chosen_model ? "Yes" : ""}</td></tr>)}</tbody></table></div>
      <div className="grid gap-6 md:grid-cols-2">
        <table className="w-full"><caption className="mb-2 text-left font-semibold">Held-out test metrics (n = {m.n_test})</caption><tbody>
          {([["Accuracy", m.accuracy], ["Precision", m.precision], ["Recall", m.recall], ["F1-score", m.f1], ["ROC-AUC", m.roc_auc], ["Brier score", m.brier_score]] as [string, number][]).map(([k, v]) => <tr key={k} className="border-t border-slate-100"><td className="py-1.5">{k}</td><td className="tabular-nums">{v.toFixed(3)}</td></tr>)}</tbody></table>
        <div><p className="mb-2 font-semibold">Confusion matrix (rows = actual, columns = predicted)</p>
          <table className="w-full text-center"><thead><tr className="text-xs text-slate-500"><th></th><th>Pred. 0</th><th>Pred. 1</th></tr></thead><tbody>
            {cm.map((row, i) => <tr key={i}><th className="text-xs text-slate-500">Actual {i}</th>{row.map((c, j) => <td key={j} className={`border border-white py-3 text-lg font-bold tabular-nums ${i === j ? "bg-brand-100" : "bg-slate-100"}`}>{c}</td>)}</tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
