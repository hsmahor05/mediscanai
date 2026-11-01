import { useEffect, useState } from "react";
import { getModelInfo } from "../services/api";
import type { ModelInfo } from "../types/api";

export function useModelInfo() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getModelInfo().then((i) => alive && setInfo(i)).catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);
  return { info, error };
}
