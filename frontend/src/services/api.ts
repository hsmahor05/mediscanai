import type { AnalysisResponse, ModelInfo, Profile, SupportedTest, TestInput } from "../types/api";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  code: string; status: number;
  constructor(message: string, code = "error", status = 0) { super(message); this.name = "ApiError"; this.code = code; this.status = status; }
}

const NETWORK_MSG = "Could not reach the analysis server. Check that the backend is running (or wait a moment if it is waking up) and try again.";

function toApiError(status: number, text: string): ApiError {
  try {
    const b = JSON.parse(text);
    if (b && typeof b.message === "string") return new ApiError(b.message, b.code ?? "http_error", status);
    if (b && typeof b.detail === "string") return new ApiError(b.detail, "http_error", status);
  } catch { /* non-JSON error body */ }
  return new ApiError(`The server returned an unexpected error (${status}).`, "http_error", status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(`${API_BASE}${path}`, init); } catch { throw new ApiError(NETWORK_MSG, "network_error"); }
  const text = await res.text();
  if (!res.ok) throw toApiError(res.status, text);
  try { return JSON.parse(text) as T; } catch { throw new ApiError("The server sent a response that could not be read.", "bad_response", res.status); }
}

export function analyzeFile(file: File, profile: Profile, onUploadProgress?: (pct: number) => void, onUploadDone?: () => void): Promise<AnalysisResponse> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    (Object.entries(profile) as [string, unknown][]).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== "") fd.append(k, String(v)); });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/analyze`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onUploadProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.upload.onload = () => onUploadDone?.();
    xhr.onerror = () => reject(new ApiError(NETWORK_MSG, "network_error"));
    xhr.ontimeout = () => reject(new ApiError("The server took too long to respond. Please try again.", "timeout"));
    xhr.timeout = 120_000;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new ApiError("The server sent a response that could not be read.", "bad_response", xhr.status)); }
      } else reject(toApiError(xhr.status, xhr.responseText));
    };
    xhr.send(fd);
  });
}

export const analyzeManual = (tests: TestInput[], profile: Profile) =>
  request<AnalysisResponse>("/api/analyze/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tests, profile }) });

export const getModelInfo = () => request<ModelInfo>("/api/model-info");
export const getSupportedTests = () => request<SupportedTest[]>("/api/supported-tests");
export const getHealth = () => request<{ status: string; model_loaded: boolean; ocr_available: boolean; max_upload_mb: number }>("/health");
