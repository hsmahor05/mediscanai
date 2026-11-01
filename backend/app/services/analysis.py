"""Normalise tests, compare with reference ranges, summarise."""
from __future__ import annotations
import uuid
from ..report_processing.catalog import CATALOG, range_for
from ..report_processing.parser import normalize_unit
from ..schemas.models import AppliedRange, Profile, Summary, TestInput, TestResult


def _fmt(x: float) -> float:
    return float(f"{x:.6g}")


def build_result(t: TestInput, profile: Profile) -> TestResult:
    cat = CATALOG.get(t.key) if t.key else None
    # Only the OCR-origin reason is carried between runs; every other reason is recomputed from the current values.
    reasons = [r for r in t.review_reasons if r.startswith("Read by OCR")]
    value, ref_low, ref_high = t.value, t.ref_low, t.ref_high
    unit_norm = normalize_unit(t.unit)
    shown_unit, converted_from = t.unit, None
    unit_confirmed = False

    if cat:
        canon_norm = normalize_unit(cat.unit)
        if unit_norm is None:
            reasons.append("No unit found; confirm the unit before relying on the comparison.")
        elif unit_norm == canon_norm:
            unit_confirmed = True; shown_unit = cat.unit
        elif unit_norm in cat.conversions:
            f = cat.conversions[unit_norm]
            converted_from = t.unit
            value = _fmt(value * f)
            ref_low = _fmt(ref_low * f) if ref_low is not None else None
            ref_high = _fmt(ref_high * f) if ref_high is not None else None
            shown_unit, unit_confirmed = cat.unit, True
        else:
            reasons.append(f"Unit '{t.unit}' is not one this test normally uses ({cat.unit}).")
        lo, hi = cat.plausible
        if not (lo <= value <= hi):
            reasons.append("Value is outside the plausible range for this test; check for an extraction error.")
        if cat.key == "glucose_unspecified":
            reasons.append("Glucose type (fasting / random / 2-hour OGTT) was not stated; choose the correct type.")
    else:
        reasons.append("Test not recognised; no generic range is available.")

    # Which range applies? Report range first, then catalog.
    applied, note = None, None
    if ref_low is not None or ref_high is not None:
        applied = AppliedRange(low=ref_low, high=ref_high, source="report")
    elif cat and unit_confirmed:
        rng, why = range_for(cat, profile.sex)
        if rng: applied = AppliedRange(low=rng[0], high=rng[1], source="catalog")
        else: note = why
    elif cat and not unit_confirmed:
        note = "A generic range is only applied when the unit is confirmed."
    else:
        note = "No reference range available."

    status = "undetermined"
    if applied and (not unit_confirmed and applied.source == "catalog"):
        applied = None
    if applied:
        v, op, lo, hi = value, t.value_operator, applied.low, applied.high
        if op is None:
            if lo is not None and v < lo: status = "below"
            elif hi is not None and v > hi: status = "above"
            else: status = "within"
        else:
            # "<5" / ">200" style results: decisive only when clearly outside the range
            if op in ("<", "<=") and lo is not None and v <= lo: status = "below"
            elif op in (">", ">=") and hi is not None and v >= hi: status = "above"
            else: note = "Result is reported as an inequality; it cannot be placed precisely against the range."
    elif note is None:
        note = "No reference range available."

    status_flag = "needs_review" if reasons else "ok"
    return TestResult(
        id=uuid.uuid4().hex[:8], key=t.key if cat else None,
        name=cat.name if cat else (t.name or "Unnamed test"),
        value=value, value_operator=t.value_operator, unit=shown_unit,
        ref_low=ref_low, ref_high=ref_high, applied_range=applied,
        extraction_status=status_flag, review_reasons=reasons, user_verified=t.user_verified,
        comparison_status=status, comparison_note=note if status == "undetermined" else None,
        explanation=cat.explanation if cat else None, converted_from=converted_from,
    )


def summarise(tests: list[TestResult]) -> Summary:
    c = lambda s: sum(1 for t in tests if t.comparison_status == s)
    return Summary(total=len(tests), below=c("below"), within=c("within"), above=c("above"), undetermined=c("undetermined"),
                   needs_review=sum(1 for t in tests if t.extraction_status == "needs_review" and not t.user_verified))
