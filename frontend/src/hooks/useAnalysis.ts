import { useCallback, useState } from "react";
import { analyzeFile, analyzeManual, ApiError } from "../services/api";
import type { AnalysisResponse, Profile, TestInput } from "../types/api";

export type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export function useAnalysis() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => { setError(e instanceof ApiError ? e : new ApiError("Something unexpected went wrong.")); setPhase("error"); };

  const runFile = useCallback(async (file: File, profile: Profile) => {
    setPhase("uploading"); setUploadPct(0); setError(null); setResult(null);
    try {
      const r = await analyzeFile(file, profile, setUploadPct, () => setPhase("processing"));
      setResult(r); setPhase("done");
    } catch (e) { fail(e); }
  }, []);

  const runManual = useCallback(async (tests: TestInput[], profile: Profile, opts?: { goToProcessing?: boolean }) => {
    if (opts?.goToProcessing) setPhase("processing");
    setBusy(true); setError(null);
    try { setResult(await analyzeManual(tests, profile)); setPhase("done"); }
    catch (e) { fail(e); }
    finally { setBusy(false); }
  }, []);

  const reset = useCallback(() => { setPhase("idle"); setResult(null); setError(null); setUploadPct(0); }, []);
  return { phase, uploadPct, result, error, busy, runFile, runManual, reset };
}
