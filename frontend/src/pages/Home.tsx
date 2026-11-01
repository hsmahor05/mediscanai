import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Brain, FileUp, ScanLine, Scale } from "lucide-react";
import Disclaimer from "../components/Disclaimer";

const FEATURES = [
  { icon: ScanLine, title: "Reads your report", text: "Extracts text from digital PDFs directly and uses Tesseract OCR for scans and photos, then identifies test names, values, units and printed ranges." },
  { icon: Scale, title: "Compares with ranges", text: "Uses the range printed on your report when it can be found, and clearly labelled generic ranges otherwise. Never invents a range." },
  { icon: Brain, title: "Real ML, honestly scoped", text: "A scikit-learn model trained on a public dataset, with measured performance. It only runs when your inputs match what it was trained on." },
  { icon: BookOpen, title: "Plain-language explanations", text: "Short educational notes on what each test measures, with reminders that interpretation needs a clinician." },
];
const FLOW = ["Upload PDF or image", "Extract text / OCR", "Find values & units", "You review & correct", "Compare with ranges", "ML if compatible"];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="rise">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">Educational project - not a medical device</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">Understand your lab report, one value at a time.</h1>
            <p className="mt-4 text-lg text-slate-600">Upload a laboratory report and MediScan AI extracts the values, checks them against reference ranges, and explains the terms in plain language, with you in control of every correction.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/analyze" className="btn-primary px-6 py-3 text-base">Analyze My Report <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link to="/how-it-works" className="btn-secondary px-6 py-3 text-base">How it works</Link>
            </div>
          </div>
          <div className="card rise p-6" aria-hidden>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Illustration of the result layout</p>
            {[["Hemoglobin", "11.2 g/dL", "Below range", "bg-sky-50 text-sky-800"], ["Fasting glucose", "98 mg/dL", "Within range", "bg-emerald-50 text-emerald-800"], ["LDL cholesterol", "138 mg/dL", "Above range", "bg-amber-50 text-amber-900"]].map(([n, v, s, c]) => (
              <div key={n} className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"><div><p className="font-semibold">{n}</p><p className="text-sm text-slate-500">{v}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c}`}>{s}</span></div>
            ))}
            <p className="mt-4 text-xs text-slate-400">Example values for illustration only, not real analysis.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">What it does</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: I, title, text }) => (
            <div key={title} className="card p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><I className="h-5 w-5" aria-hidden /></span><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm text-slate-600">{text}</p></div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold tracking-tight">The workflow</h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {FLOW.map((f, i) => <li key={f} className="relative rounded-xl bg-slate-50 p-4 text-sm"><span className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>{f}</li>)}
          </ol>
          <Link to="/how-it-works" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Read the full explanation <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-14">
        <Disclaimer />
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6"><div className="flex items-center gap-3"><FileUp className="h-6 w-6 text-brand-600" aria-hidden /><p className="font-semibold">Ready to try it with a sample or your own report?</p></div><Link to="/analyze" className="btn-primary">Analyze My Report</Link></div>
      </section>
    </>
  );
}
