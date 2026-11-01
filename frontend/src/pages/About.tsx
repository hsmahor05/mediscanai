import { Link } from "react-router-dom";
import Disclaimer from "../components/Disclaimer";

const TECH = [["Frontend", "React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide icons"], ["Backend", "Python, FastAPI, Pydantic"], ["Report processing", "PyMuPDF, Tesseract OCR, OpenCV, Pillow"], ["Machine learning", "scikit-learn, pandas, NumPy, Joblib, Matplotlib"], ["Testing", "pytest, Vitest, Testing Library"], ["Deployment targets", "Vercel (frontend), Render (backend, Docker)"]];

export default function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div><h1 className="text-3xl font-bold tracking-tight">About the project</h1><p className="mt-2 text-slate-600"><strong>MediScan AI</strong> - AI-powered lab report analyser using machine learning. An educational software-engineering project.</p></div>
      <Disclaimer />
      <section className="card p-6"><h2 className="text-lg font-bold">Objective</h2><p className="mt-2 text-sm text-slate-600">Build an end-to-end application that accepts laboratory reports (PDF or image), extracts test values, compares them with reference ranges, explains the terms, and demonstrates a genuine, reproducible machine-learning workflow, while keeping each kind of output (extracted value, range, rule-based flag, ML estimate, explanation) clearly separate.</p></section>
      <section className="card p-6"><h2 className="text-lg font-bold">Technologies</h2><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{TECH.map(([k, v]) => <div key={k}><dt className="font-semibold">{k}</dt><dd className="text-slate-600">{v}</dd></div>)}</dl></section>
      <section className="card p-6"><h2 className="text-lg font-bold">Architecture</h2><p className="mt-2 text-sm text-slate-600">A static React single-page app calls a FastAPI service over HTTPS. The service is split into routing (<code>api/</code>), report processing (<code>report_processing/</code>: validation, extraction, parsing, test catalogue), business logic (<code>services/</code>: comparison, pipeline orchestration) and a dedicated ML inference service. The trained scikit-learn pipeline is loaded from a Joblib file at startup. There is no database: uploads are processed in memory and discarded, because the workflow does not need persistence.</p></section>
      <section className="card p-6"><h2 className="text-lg font-bold">Machine-learning methodology and dataset</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li><strong>Dataset:</strong> Pima Indians Diabetes Database, originally from the US National Institute of Diabetes and Digestive and Kidney Diseases (Smith et al., 1988). 768 records, 8 clinical features plus a binary outcome. The copy used here is a public GitHub mirror (plotly/datasets); its SHA-256 is recorded in the model metadata.</li>
          <li><strong>Target:</strong> diabetes diagnosed within 5 years (1) or not (0). <strong>Features used:</strong> 2-hour OGTT glucose, BMI, age, diastolic blood pressure.</li>
          <li><strong>Missing values:</strong> several columns encode "missing" as 0 (glucose 5, blood pressure 35, BMI 11 records among the features used); these are converted to missing and imputed with the training median inside the pipeline.</li>
          <li><strong>Licence:</strong> commonly redistributed as public domain (CC0) on data-science platforms, but this project did not independently verify the licence; check the original source before redistributing.</li>
          <li><strong>Known limitations:</strong> small sample; only women aged 21+ of one population; 2-hour OGTT glucose rather than fasting glucose; modest performance.</li>
        </ul>
        <p className="mt-3 text-sm">Measured results are on <Link className="font-medium text-brand-700 underline" to="/how-it-works#model">the How It Works page</Link>, read live from the saved evaluation.</p></section>
      <section className="card p-6"><h2 className="text-lg font-bold">Project limitations</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Supports a fixed catalogue of common tests; other tests can be entered manually but get no generic range.</li>
          <li>Extraction was developed against digital PDFs and synthetic samples. Real reports vary widely in layout; OCR can misread digits, which is why OCR rows always require review.</li>
          <li>Generic reference ranges are simplified adult ranges and do not consider age, pregnancy, method or laboratory.</li>
          <li>The ML component is a small demonstration and is not clinically validated.</li>
          <li>Free hosting may sleep when idle, so the first request can be slow.</li>
        </ul></section>
      <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">This is an educational software project, not a clinically validated diagnostic system.</p>
    </div>
  );
}
