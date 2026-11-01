import pytest
from app import config
from app.report_processing.extract import ocr_available
from conftest import SAMPLES

PROFILE = {"sex": "female", "age": 34, "bmi": 27.5}


def post_file(client, data, name="r.pdf", ctype="application/pdf", **form):
    return client.post("/api/analyze", files={"file": (name, data, ctype)}, data=form)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["model_loaded"] is True and "ocr_available" in body


def test_pdf_analysis_schema_and_values(client):
    r = post_file(client, (SAMPLES / "sample_report_general.pdf").read_bytes(), sex="female")
    assert r.status_code == 200
    b = r.json()
    assert b["source"]["kind"] == "pdf_text" and b["source"]["ocr_used"] is False
    assert {"tests", "summary", "ml", "pipeline", "disclaimer", "warnings"} <= b.keys()
    by = {t["key"]: t for t in b["tests"]}
    assert by["hemoglobin"]["value"] == 11.2 and by["hemoglobin"]["comparison_status"] == "below"
    assert by["wbc"]["value"] == 7.8 and by["wbc"]["converted_from"] == "/cumm"      # unit conversion
    assert by["platelets"]["value"] == 260.0
    assert by["glucose_fasting"]["comparison_status"] == "above"
    assert by["hdl"]["applied_range"]["source"] == "report"
    assert b["ml"]["status"] == "not_applicable"      # no OGTT value -> no fabricated prediction


def test_ogtt_report_runs_ml(client):
    r = post_file(client, (SAMPLES / "sample_report_ogtt.pdf").read_bytes(), **{k: str(v) for k, v in PROFILE.items()})
    b = r.json()
    assert b["ml"]["status"] == "ok"
    p = b["ml"]["estimate"]["probability"]
    assert 0 <= p <= 1 and "BloodPressure" in b["ml"]["estimate"]["imputed_features"]


@pytest.mark.parametrize("data,name,code,status", [
    (b"", "e.pdf", "empty_file", 400),
    (b"hello world not a report", "x.txt", "unsupported_type", 415),
    (b"%PDF-1.4\nthis is garbage", "bad.pdf", "corrupt_file", 422),
    (b"\x89PNG\r\n\x1a\nnot really a png", "bad.png", None, None),
])
def test_invalid_uploads(client, data, name, code, status):
    r = post_file(client, data, name)
    if code is None:   # corrupt image: 422 if OCR present, 503 if not - either way a clear error, never a fake result
        assert r.status_code in (422, 503) and "message" in r.json()
        return
    assert r.status_code == status and r.json()["code"] == code


def test_file_too_large(client, monkeypatch):
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 50)
    r = post_file(client, b"%PDF-1.4" + b"0" * 200)
    assert r.status_code == 413 and r.json()["code"] == "file_too_large"


def test_invalid_profile_rejected(client):
    r = post_file(client, (SAMPLES / "sample_report_general.pdf").read_bytes(), age="400")
    assert r.status_code == 422 and r.json()["code"] == "invalid_profile"


def test_image_without_ocr_returns_clear_error(client, monkeypatch):
    monkeypatch.setattr(config, "ENABLE_OCR", False)
    r = post_file(client, (SAMPLES / "sample_report_ogtt.png").read_bytes(), "a.png", "image/png")
    assert r.status_code == 503 and r.json()["code"] == "ocr_unavailable"


@pytest.mark.skipif(not ocr_available(), reason="Tesseract not installed")
def test_image_ocr_flags_for_review_and_gates_ml(client):
    r = post_file(client, (SAMPLES / "sample_report_ogtt.png").read_bytes(), "a.png", "image/png", **{k: str(v) for k, v in PROFILE.items()})
    b = r.json()
    assert r.status_code == 200 and b["source"]["ocr_used"] is True
    keys = {t["key"] for t in b["tests"]}
    assert "glucose_ogtt_2h" in keys
    assert all(t["extraction_status"] == "needs_review" for t in b["tests"])
    assert b["ml"]["status"] == "needs_verification"
    # after the user verifies the OGTT row, the model may run
    tests = [{"key": t["key"], "value": t["value"], "unit": t["unit"], "ref_low": t["ref_low"], "ref_high": t["ref_high"], "user_verified": True} for t in b["tests"]]
    r2 = client.post("/api/analyze/manual", json={"tests": tests, "profile": PROFILE})
    assert r2.json()["ml"]["status"] == "ok"


def test_manual_valid(client):
    body = {"tests": [{"key": "hemoglobin", "value": 10.5, "unit": "g/dL"}, {"key": "glucose_fasting", "value": 6.2, "unit": "mmol/L"}], "profile": {"sex": "female"}}
    b = client.post("/api/analyze/manual", json=body).json()
    by = {t["key"]: t for t in b["tests"]}
    assert by["hemoglobin"]["comparison_status"] == "below" and by["hemoglobin"]["applied_range"]["source"] == "catalog"
    assert 110 < by["glucose_fasting"]["value"] < 113 and by["glucose_fasting"]["converted_from"] == "mmol/L"


def test_sex_specific_range_needs_sex(client):
    b = client.post("/api/analyze/manual", json={"tests": [{"key": "hemoglobin", "value": 12.5, "unit": "g/dL"}]}).json()
    t = b["tests"][0]
    assert t["comparison_status"] == "undetermined" and "sex" in t["comparison_note"].lower()


def test_no_invented_range_for_unknown_or_unitless(client):
    b = client.post("/api/analyze/manual", json={"tests": [{"name": "Mystery marker", "value": 5}, {"key": "wbc", "value": 8}]}).json()
    assert all(t["comparison_status"] == "undetermined" for t in b["tests"])
    assert all(t["extraction_status"] == "needs_review" for t in b["tests"])


@pytest.mark.parametrize("payload", [
    {"tests": [{"key": "hemoglobin"}]},                              # missing value
    {"tests": [{"key": "hemoglobin", "value": "abc"}]},              # non-numeric
    {"tests": [{"key": "hemoglobin", "value": 5, "value_operator": "~"}]},
    {"profile": {}},                                                  # missing tests
])
def test_manual_invalid(client, payload):
    r = client.post("/api/analyze/manual", json=payload)
    assert r.status_code == 422 and r.json()["code"] == "validation_error"


def test_model_info_exposes_real_metrics(client):
    b = client.get("/api/model-info").json()
    assert b["available"] and b["chosen_model"] == "logistic_regression"
    assert 0.5 < b["test_metrics"]["roc_auc"] < 1 and b["dataset"]["records"] == 768


def test_model_missing_is_handled(client, monkeypatch, tmp_path):
    monkeypatch.setattr(config, "ARTIFACT_DIR", tmp_path)
    assert client.get("/api/model-info").json()["available"] is False
    b = client.post("/api/analyze/manual", json={"tests": [{"key": "glucose_ogtt_2h", "value": 150, "unit": "mg/dL", "user_verified": True}], "profile": PROFILE}).json()
    assert b["ml"]["status"] == "unavailable" and b["ml"]["estimate"] is None
    assert client.get("/health").json()["model_loaded"] is False


def test_resubmitting_does_not_accumulate_stale_reasons(client):
    first = client.post("/api/analyze/manual", json={"tests": [{"key": "wbc", "value": 8}]}).json()["tests"][0]
    assert any("No unit" in r for r in first["review_reasons"])
    body = {"tests": [{"key": "wbc", "value": 8, "unit": "10^3/uL", "review_reasons": first["review_reasons"]}]}
    second = client.post("/api/analyze/manual", json=body).json()["tests"][0]
    assert second["review_reasons"] == [] and second["comparison_status"] == "within"      # fixing the unit clears the old reason
    again = client.post("/api/analyze/manual", json={"tests": [{"key": "wbc", "value": 8, "review_reasons": ["Read by OCR; verify against your report."]}]}).json()["tests"][0]
    assert sum("Read by OCR" in r for r in again["review_reasons"]) == 1
