"""Dedicated ML inference service: validation, feature preparation, prediction, limitations."""
from __future__ import annotations
import json, logging
from functools import lru_cache
import joblib
try:
    import pandas as pd
except ImportError:
    pd = None
try:
    import sklearn
except ImportError:
    sklearn = None
from .. import config
from ..schemas.models import MLEstimate, MLResult, Profile, TestResult

log = logging.getLogger("mediscan.ml")

LIMITATIONS = [
    "Trained on the Pima Indians Diabetes Database: 768 women aged 21+ of Pima Indian heritage. It may not generalise to other populations, ages or sexes.",
    "The glucose input must be a 2-hour oral glucose tolerance test (OGTT) value. Fasting or random glucose are different measurements and are NOT accepted.",
    "Held-out performance is modest (see model info); the probability is an uncalibrated model estimate, not a clinical risk probability.",
    "This is an educational demonstration. It is not a diagnosis and does not replace testing or advice from a healthcare professional.",
]


class ModelService:
    def __init__(self):
        self.model = None
        self.meta: dict = {}
        self.schema: dict = {}
        self.error: str | None = None
        self._load()

    def _load(self):
        d = config.ARTIFACT_DIR
        try:
            self.model = joblib.load(d / "model.joblib")
            self.meta = json.loads((d / "metrics.json").read_text())
            self.schema = json.loads((d / "feature_schema.json").read_text())
            if sklearn is not None and self.meta.get("sklearn_version") != sklearn.__version__:
                log.warning("scikit-learn version differs from training (%s vs %s)", self.meta.get("sklearn_version"), sklearn.__version__)
        except FileNotFoundError:
            self.error = "Model artifacts not found. Run `python ml/train.py` to create them."
        except Exception as exc:
            self.error = f"Model could not be loaded ({type(exc).__name__}). Retrain with `python ml/train.py`."
        if self.error:
            log.error(self.error); self.model = None

    @property
    def available(self) -> bool:
        return self.model is not None and pd is not None

    def info(self) -> dict:
        if not self.available:
            return {"available": False, "message": self.error}
        m = self.meta
        return {
            "available": True, "chosen_model": m["chosen_model"], "trained_at_utc": m["trained_at_utc"], "random_seed": m["random_seed"],
            "dataset": {k: m["dataset"][k] for k in ("records", "class_counts", "missing_encoded_as_zero", "age_range")},
            "split": m["split"], "selection_rule": m["selection_rule"],
            "cross_validation": {k: {"roc_auc_mean": v["roc_auc_mean"], "roc_auc_std": v["roc_auc_std"]} for k, v in m["cross_validation"].items()},
            "test_metrics": m["test_metrics"], "feature_schema": self.schema, "limitations": LIMITATIONS,
        }

    def predict(self, tests: list[TestResult], profile: Profile) -> MLResult:
        base = dict(model_name=self.meta.get("chosen_model"), limitations=LIMITATIONS)
        if not self.available:
            return MLResult(status="unavailable", reasons=[self.error or "Model unavailable."], **base)

        g = next((t for t in tests if t.key == "glucose_ogtt_2h"), None)
        if g is None:
            return MLResult(status="not_applicable", reasons=[
                "No 2-hour OGTT glucose value was found. The model was trained on that specific measurement, so fasting or random glucose cannot be used."], **base)
        if g.extraction_status == "needs_review" and not g.user_verified:
            return MLResult(status="needs_verification", reasons=["Please verify the OGTT glucose value in the review table before the model is run."], **base)
        if g.value_operator is not None:
            return MLResult(status="incompatible_input", reasons=["The glucose result is an inequality (e.g. '>200'); an exact number is required."], **base)
        if g.unit != "mg/dL":
            return MLResult(status="incompatible_input", reasons=["Glucose must be in mg/dL (mmol/L values are converted automatically)."], **base)

        problems = []
        if profile.sex != "female":
            problems.append("The model was trained only on female patients; select 'female' in the details form to run it." if profile.sex is None
                            else "The model was trained only on female patients, so it is not applicable for this profile.")
        if profile.age is None: problems.append("Age is required.")
        elif profile.age < 21: problems.append("The model was trained on adults aged 21 and over.")
        if profile.bmi is None: problems.append("BMI is required.")
        raw = {"Glucose": g.value, "BMI": profile.bmi, "Age": profile.age, "BloodPressure": profile.diastolic_bp}
        for f in self.schema["features"]:
            v = raw[f["name"]]
            if v is not None and not (f["min"] <= v <= f["max"]):
                problems.append(f"{f['label']} of {v:g} is outside the supported range ({f['min']}-{f['max']} {f['unit']}).")
        if problems:
            return MLResult(status="incompatible_input", reasons=problems, **base)

        row = pd.DataFrame([[raw[n] if raw[n] is not None else float("nan") for n in self.schema["feature_order"]]], columns=self.schema["feature_order"])
        p = float(self.model.predict_proba(row)[0, 1])
        used = {k: float(v) for k, v in raw.items() if v is not None}
        imputed = [k for k, v in raw.items() if v is None]
        return MLResult(status="ok", reasons=[], estimate=MLEstimate(probability=round(p, 4), band="higher" if p >= 0.5 else "lower",
                        inputs_used=used, imputed_features=imputed), **base)


@lru_cache(maxsize=1)
def get_model_service() -> ModelService:
    return ModelService()
