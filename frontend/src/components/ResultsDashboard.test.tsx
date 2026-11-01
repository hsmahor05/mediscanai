import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import ResultsDashboard from "./ResultsDashboard";
import type { AnalysisResponse } from "../types/api";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("[]") })));

// Hand-written fixture used ONLY to test rendering; the app itself never uses fixtures.
const result: AnalysisResponse = {
  source: { kind: "pdf_text", pages: 1, ocr_used: false }, unmatched_line_count: 0, warnings: ["Example warning"],
  summary: { total: 2, below: 1, within: 1, above: 0, undetermined: 0, needs_review: 0 },
  tests: [
    { id: "a", key: "hemoglobin", name: "Hemoglobin", value: 11.2, value_operator: null, unit: "g/dL", ref_low: 12, ref_high: 15.5, applied_range: { low: 12, high: 15.5, source: "report" }, extraction_status: "ok", review_reasons: [], user_verified: false, comparison_status: "below", comparison_note: null, explanation: "Carries oxygen.", converted_from: null },
    { id: "b", key: "hdl", name: "HDL Cholesterol", value: 55, value_operator: null, unit: "mg/dL", ref_low: null, ref_high: null, applied_range: null, extraction_status: "ok", review_reasons: [], user_verified: false, comparison_status: "undetermined", comparison_note: "No reference range available.", explanation: null, converted_from: null },
  ],
  ml: { status: "not_applicable", reasons: ["No 2-hour OGTT glucose value was found."], estimate: null, model_name: "logistic_regression", limitations: ["Educational demo."] },
  pipeline: [{ name: "Receive and validate file", status: "done", detail: "PDF" }], disclaimer: "x",
};

describe("ResultsDashboard", () => {
  it("renders statuses, never invents a range, and explains why ML did not run", () => {
    render(<MemoryRouter><ResultsDashboard result={result} profile={{}} setProfile={() => {}} busy={false} onUpdate={() => {}} onNew={() => {}} /></MemoryRouter>);
    expect(screen.getAllByText("Below range").length).toBeGreaterThan(0);
    expect(screen.getByText("Unable to determine", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText(/No 2-hour OGTT glucose value/)).toBeInTheDocument();
    expect(screen.getByText(/not a medical device/i)).toBeInTheDocument();
    expect(screen.getByText("Example warning")).toBeInTheDocument();
  });
});
