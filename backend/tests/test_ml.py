import json
import pandas as pd
import pytest
import joblib
import preprocess as pp
import train
from app import config
from app.schemas.models import Profile, TestResult
from app.services.ml_service import ModelService


def _glucose(v=150.0, unit="mg/dL", verified=True, op=None):
    return TestResult(id="x", key="glucose_ogtt_2h", name="g", value=v, value_operator=op, unit=unit, applied_range=None, extraction_status="ok",
                      review_reasons=[], user_verified=verified, comparison_status="undetermined", comparison_note=None, explanation=None)


def test_dataset_schema():
    df = pp.load_clean()
    assert len(df) == 768 and set(pp.FEATURES + [pp.TARGET]) <= set(df.columns)
    assert df.Glucose.min() > 0 and df.BMI.min() > 0          # zeros converted to NaN
    assert df[pp.TARGET].isin([0, 1]).all()


def test_training_is_reproducible(tmp_path):
    a = train.main(seed=7, out=tmp_path / "a", figures=None)
    b = train.main(seed=7, out=tmp_path / "b", figures=None)
    assert a["test_metrics"]["roc_auc"] == b["test_metrics"]["roc_auc"]
    assert a["chosen_model"] == b["chosen_model"]
    assert (tmp_path / "a" / "model.joblib").exists()


def test_no_leakage_imputer_inside_pipeline():
    m = joblib.load(config.ARTIFACT_DIR / "model.joblib")
    assert m.steps[0][0] == "imputer"


def test_saved_metrics_match_reevaluation():
    from sklearn.model_selection import train_test_split
    from evaluate import evaluate_model
    meta = json.loads((config.ARTIFACT_DIR / "metrics.json").read_text())
    df = pp.load_clean()
    _, X_te, _, y_te = train_test_split(df[pp.FEATURES], df[pp.TARGET], test_size=0.2, stratify=df[pp.TARGET], random_state=meta["random_seed"])
    m = evaluate_model(joblib.load(config.ARTIFACT_DIR / "model.joblib"), X_te, y_te)
    assert m["roc_auc"] == pytest.approx(meta["test_metrics"]["roc_auc"])
    assert m["accuracy"] == pytest.approx(meta["test_metrics"]["accuracy"])


def test_prediction_compatible_input_and_monotonic():
    s = ModelService(); prof = Profile(sex="female", age=40, bmi=30)
    lo, hi = s.predict([_glucose(90)], prof), s.predict([_glucose(190)], prof)
    assert lo.status == hi.status == "ok"
    assert hi.estimate.probability > lo.estimate.probability


@pytest.mark.parametrize("profile,tests,status", [
    (Profile(sex="female", age=40, bmi=30), [], "not_applicable"),
    (Profile(sex="female", age=40, bmi=30), [_glucose(verified=False)], "ok"),            # extraction_status ok -> allowed
    (Profile(sex="male", age=40, bmi=30), [_glucose()], "incompatible_input"),
    (Profile(age=40, bmi=30), [_glucose()], "incompatible_input"),                          # sex unknown
    (Profile(sex="female", age=18, bmi=30), [_glucose()], "incompatible_input"),
    (Profile(sex="female", age=40), [_glucose()], "incompatible_input"),                    # BMI missing
    (Profile(sex="female", age=40, bmi=300 / 10), [_glucose(900)], "incompatible_input"),   # out of supported range
    (Profile(sex="female", age=40, bmi=30), [_glucose(unit="mmol/L")], "incompatible_input"),
    (Profile(sex="female", age=40, bmi=30), [_glucose(op=">")], "incompatible_input"),
])
def test_ml_gating(profile, tests, status):
    assert ModelService().predict(tests, profile).status == status


def test_unverified_review_row_blocks_prediction():
    g = _glucose(verified=False); g.extraction_status = "needs_review"
    assert ModelService().predict([g], Profile(sex="female", age=40, bmi=30)).status == "needs_verification"
