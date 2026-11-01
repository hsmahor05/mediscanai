import { useState } from "react";
import { ArrowRight, Keyboard } from "lucide-react";
import UploadZone from "../components/UploadZone";
import ProfileForm from "../components/ProfileForm";
import ProcessingView from "../components/ProcessingView";
import ResultsDashboard from "../components/ResultsDashboard";
import Disclaimer from "../components/Disclaimer";
import { useAnalysis } from "../hooks/useAnalysis";
import type { Profile, TestInput } from "../types/api";

export default function Analyze() {
  const [file, setFile] = useState<File | null>(null);
  const [profile, setProfile] = useState<Profile>({ sex: null, age: null, bmi: null, diastolic_bp: null });
  const a = useAnalysis();
  const update = (rows: TestInput[]) => a.runManual(rows, profile);

  if (a.phase === "done" && a.result)
    return <div className="mx-auto max-w-6xl px-4 py-8"><ResultsDashboard result={a.result} profile={profile} setProfile={setProfile} busy={a.busy} onUpdate={update} onNew={() => { a.reset(); setFile(null); }} /></div>;

  if (a.phase !== "idle")
    return <div className="mx-auto max-w-6xl px-4 py-12"><ProcessingView phase={a.phase} uploadPct={a.uploadPct} error={a.error} onRetry={() => (file ? a.runFile(file, profile) : a.reset())} onReset={() => { a.reset(); setFile(null); }} /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Analyze a lab report</h1>
      <p className="mt-2 text-slate-600">Upload a PDF or image of a laboratory report. We read the values, compare them with reference ranges, and explain the terms. Please use sample or your own reports only; do not upload other people's records.</p>
      <div className="mt-6"><Disclaimer compact /></div>
      <div className="mt-6"><UploadZone file={file} onFile={setFile} /></div>

      <details className="card mt-6 p-5">
        <summary className="cursor-pointer font-semibold">Optional details <span className="font-normal text-slate-500">- needed for sex-specific ranges and the ML demo</span></summary>
        <p className="mb-4 mt-2 text-sm text-slate-500">These stay in your browser session and are only sent with your request. The ML model additionally requires a 2-hour OGTT glucose value in the report, female sex, age 21+ and BMI.</p>
        <ProfileForm profile={profile} onChange={setProfile} />
      </details>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={!file} onClick={() => file && a.runFile(file, profile)}>Start analysis <ArrowRight className="h-4 w-4" aria-hidden /></button>
        <button className="btn-secondary" onClick={() => a.runManual([], profile, { goToProcessing: true })}><Keyboard className="h-4 w-4" aria-hidden />Enter values manually instead</button>
      </div>
    </div>
  );
}
