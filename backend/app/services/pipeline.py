"""Orchestrates extraction -> parsing -> comparison -> ML. Keeps routing code thin."""
from __future__ import annotations
import time
from .. import config
from ..report_processing import extract as ex
from ..report_processing.parser import parse_text
from ..schemas.models import AnalysisResponse, PipelineStep, Profile, SourceInfo, TestInput
from .analysis import build_result, summarise
from .ml_service import get_model_service


def _finish(tests_in: list[TestInput], profile: Profile, source: SourceInfo, steps: list[PipelineStep], unmatched: int, warnings: list[str]) -> AnalysisResponse:
    t0 = time.perf_counter()
    tests = [build_result(t, profile) for t in tests_in]
    seen, deduped = set(), []
    for t in tests:
        if t.key and t.key in seen:
            warnings.append(f"Duplicate '{t.name}' row found; showing every row so you can pick the right one.")
        if t.key: seen.add(t.key)
        deduped.append(t)
    summary = summarise(deduped)
    steps.append(PipelineStep(name="Validate and compare with reference ranges", status="done",
                              detail=f"{summary.total} tests compared; {summary.undetermined} could not be determined; {summary.needs_review} need review."))
    ml = get_model_service().predict(deduped, profile)
    steps.append(PipelineStep(name="Run machine-learning model", status="done" if ml.status == "ok" else "skipped",
                              detail="Prediction produced." if ml.status == "ok" else (ml.reasons[0] if ml.reasons else ml.status)))
    steps.append(PipelineStep(name="Prepare summary", status="done", detail=f"{(time.perf_counter() - t0) * 1000:.0f} ms"))
    return AnalysisResponse(source=source, tests=deduped, unmatched_line_count=unmatched, warnings=warnings, summary=summary, ml=ml,
                            pipeline=steps, disclaimer=config.DISCLAIMER)


def analyze_file(data: bytes, filename: str | None, profile: Profile) -> AnalysisResponse:
    steps: list[PipelineStep] = []
    kind = ex.validate_upload(data, filename)
    steps.append(PipelineStep(name="Receive and validate file", status="done", detail=f"{kind.upper()} file, {len(data) / 1024:.0f} KB"))
    t0 = time.perf_counter()
    res = ex.extract(data, kind)
    steps.append(PipelineStep(name="Extract text" if not res.ocr_used else "Run OCR", status="done",
                              detail=f"{'OCR (Tesseract + OpenCV)' if res.ocr_used else 'Embedded PDF text'}, {res.pages} page(s), {(time.perf_counter() - t0) * 1000:.0f} ms"))
    rows, unmatched = parse_text(res.text)
    steps.append(PipelineStep(name="Identify laboratory values and units", status="done",
                              detail=f"{len(rows)} candidate tests found; {unmatched} lines not recognised as tests."))
    warnings: list[str] = []
    if res.ocr_used:
        warnings.append("Values were read with OCR, which can misread digits. Please check every row against your original report.")
    if not rows:
        warnings.append("No supported laboratory tests were found. You can add values manually below.")
    tests = []
    for r in rows:
        reasons = ["Read by OCR; verify against your report."] if res.ocr_used else []
        tests.append(TestInput(key=r.key, name=r.raw_name, value=r.value, value_operator=r.operator, unit=r.unit_raw,
                               ref_low=r.ref_low, ref_high=r.ref_high, review_reasons=reasons))
    source = SourceInfo(kind=res.kind, pages=res.pages, ocr_used=res.ocr_used)
    return _finish(tests, profile, source, steps, unmatched, warnings)


def analyze_manual(tests: list[TestInput], profile: Profile) -> AnalysisResponse:
    steps = [PipelineStep(name="Receive values", status="done", detail=f"{len(tests)} user-provided test(s)")]
    return _finish(tests, profile, SourceInfo(kind="manual", pages=0, ocr_used=False), steps, 0, [])
