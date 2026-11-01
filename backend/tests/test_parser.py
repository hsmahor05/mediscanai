import pytest
from app.report_processing.parser import parse_line, normalize_unit


@pytest.mark.parametrize("line,key,val,unit,lo,hi,op", [
    ("Hemoglobin  11.2  g/dL  12.0 - 15.5", "hemoglobin", 11.2, "g/dL", 12.0, 15.5, None),
    ("Total Cholesterol  224 mg/dL  < 200", "total_cholesterol", 224, "mg/dL", None, 200, None),
    ("HDL Cholesterol 52 mg/dL > 50", "hdl", 52, "mg/dL", 50, None, None),
    ("TSH <0.01 mIU/L 0.4 - 4.0", "tsh", 0.01, "mIU/L", 0.4, 4.0, "<"),
    ("1. Fasting Blood Sugar 112 mg/dL 70 - 99", "glucose_fasting", 112, "mg/dL", 70, 99, None),
    ("Glucose 2 hr (OGTT)  158  mg/dL  < 140", "glucose_ogtt_2h", 158, "mg/dL", None, 140, None),
    ("Glucose  95  mg/dL", "glucose_unspecified", 95, "mg/dL", None, None, None),
    ("Platelet Count 2.6 lakhs/cumm 1.5 - 4.5", "platelets", 2.6, "lakhs/cumm", 1.5, 4.5, None),
    ("WBC 7.8 x10^3/µL 4.0-11.0", "wbc", 7.8, "x10^3/µL", 4.0, 11.0, None),
    ("SGPT (ALT) 26 U/L 7 - 55", "alt", 26, "U/L", 7, 55, None),
])
def test_parse_line(line, key, val, unit, lo, hi, op):
    r = parse_line(line)
    assert r is not None, line
    assert (r.key, r.value, r.unit_raw, r.ref_low, r.ref_high, r.operator) == (key, val, unit, lo, hi, op)


@pytest.mark.parametrize("line", ["Hemoglobin", "Patient: Demo Patient Age/Sex: 34 / F", "Cholesterol/HDL ratio 3.2", "", "Report date 12/03/2025"])
def test_non_test_lines_ignored(line):
    assert parse_line(line) is None


def test_fasting_not_confused_with_plain_glucose():
    assert parse_line("Glucose Fasting 100 mg/dL").key == "glucose_fasting"
    assert parse_line("Blood Sugar 100 mg/dL").key == "glucose_unspecified"


def test_unit_normalisation():
    assert normalize_unit("µIU/mL") == "uiu/ml" and normalize_unit("x10³/µL") == "10^3/ul"
