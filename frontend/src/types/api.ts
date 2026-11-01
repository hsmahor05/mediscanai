export type Sex = "female" | "male";
export type Status = "below" | "within" | "above" | "undetermined";

export interface Profile { sex?: Sex | null; age?: number | null; bmi?: number | null; diastolic_bp?: number | null; }

export interface TestInput {
  key: string | null; name?: string | null; value: number; value_operator?: "<" | ">" | "<=" | ">=" | null;
  unit?: string | null; ref_low?: number | null; ref_high?: number | null; user_verified: boolean;
  extraction_status?: "ok" | "needs_review"; review_reasons?: string[];
}
export interface AppliedRange { low: number | null; high: number | null; source: "report" | "catalog"; }
export interface TestResult {
  id: string; key: string | null; name: string; value: number; value_operator: TestInput["value_operator"]; unit: string | null;
  ref_low: number | null; ref_high: number | null; applied_range: AppliedRange | null;
  extraction_status: "ok" | "needs_review"; review_reasons: string[]; user_verified: boolean;
  comparison_status: Status; comparison_note: string | null; explanation: string | null; converted_from: string | null;
}
export interface PipelineStep { name: string; status: "done" | "skipped" | "failed"; detail: string; }
export interface Summary { total: number; below: number; within: number; above: number; undetermined: number; needs_review: number; }
export interface MLEstimate { probability: number; band: "lower" | "higher"; inputs_used: Record<string, number>; imputed_features: string[]; }
export interface MLResult {
  status: "ok" | "not_applicable" | "needs_verification" | "incompatible_input" | "unavailable";
  reasons: string[]; estimate: MLEstimate | null; model_name: string | null; limitations: string[];
}
export interface AnalysisResponse {
  source: { kind: "pdf_text" | "pdf_ocr" | "image_ocr" | "manual"; pages: number; ocr_used: boolean };
  tests: TestResult[]; unmatched_line_count: number; warnings: string[]; summary: Summary; ml: MLResult; pipeline: PipelineStep[]; disclaimer: string;
}
export interface SupportedTest { key: string; name: string; unit: string; units_accepted: string[]; }
export interface ModelInfo {
  available: boolean; message?: string; chosen_model?: string; trained_at_utc?: string; random_seed?: number;
  dataset?: { records: number; class_counts: Record<string, number>; missing_encoded_as_zero: Record<string, number>; age_range: number[] };
  split?: { train: number; test: number };
  selection_rule?: string;
  cross_validation?: Record<string, { roc_auc_mean: number; roc_auc_std: number }>;
  test_metrics?: { accuracy: number; precision: number; recall: number; f1: number; roc_auc: number; brier_score: number; n_test: number; confusion_matrix: { matrix: number[][] } };
  limitations?: string[];
}
