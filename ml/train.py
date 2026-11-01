"""Train, compare, select and save the diabetes-risk estimator.

Usage (from repo root):  python ml/train.py [--seed 42] [--out backend/app/ml/artifacts]
"""
from __future__ import annotations
import argparse, json, sys, datetime as dt
from pathlib import Path
import joblib
import numpy as np
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

sys.path.insert(0, str(Path(__file__).parent))
import preprocess as pp  # noqa: E402
from evaluate import evaluate_model  # noqa: E402

DEFAULT_OUT = Path(__file__).resolve().parent.parent / "backend" / "app" / "ml" / "artifacts"
SIMPLICITY_ORDER = ["logistic_regression", "decision_tree", "random_forest"]


def build_candidates(seed: int) -> dict[str, Pipeline]:
    imp = lambda: SimpleImputer(strategy="median")  # fitted on training data only
    return {
        "logistic_regression": Pipeline([("imputer", imp()), ("scaler", StandardScaler()),
                                         ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=seed))]),
        "decision_tree": Pipeline([("imputer", imp()),
                                   ("clf", DecisionTreeClassifier(max_depth=4, min_samples_leaf=15, class_weight="balanced", random_state=seed))]),
        "random_forest": Pipeline([("imputer", imp()),
                                   ("clf", RandomForestClassifier(n_estimators=300, max_depth=6, min_samples_leaf=5, class_weight="balanced", random_state=seed, n_jobs=1))]),
    }


def main(seed: int = 42, out: Path = DEFAULT_OUT, data: Path = pp.DATA_PATH, figures: Path | None = Path(__file__).parent / "figures") -> dict:
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    df = pp.load_clean(data)
    X, y = df[pp.FEATURES], df[pp.TARGET]

    # 1) Split FIRST - preprocessing is fitted only on training data.
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)

    # 2) Cross-validated model comparison on the training set only.
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    cv_results = {}
    for name, pipe in build_candidates(seed).items():
        s = cross_val_score(pipe, X_tr, y_tr, cv=cv, scoring="roc_auc")
        cv_results[name] = {"roc_auc_mean": float(s.mean()), "roc_auc_std": float(s.std()), "folds": [float(v) for v in s]}

    # 3) Selection: best CV ROC-AUC, but prefer the simplest model within 1 std of the best.
    best = max(cv_results, key=lambda n: cv_results[n]["roc_auc_mean"])
    threshold = cv_results[best]["roc_auc_mean"] - cv_results[best]["roc_auc_std"]
    chosen = next(n for n in SIMPLICITY_ORDER if cv_results[n]["roc_auc_mean"] >= threshold)

    # 4) Fit the chosen model on the training set; evaluate ONCE on the held-out test set.
    model = build_candidates(seed)[chosen].fit(X_tr, y_tr)
    test_metrics = evaluate_model(model, X_te, y_te, out_dir=figures)

    # 5) Ship the exact model that was evaluated (no silent refit on test data).
    joblib.dump(model, out / "model.joblib")
    schema = {
        "features": [
            {"name": "Glucose", "label": "2-hour OGTT plasma glucose", "unit": "mg/dL", "required": True, "min": 40, "max": 500},
            {"name": "BMI", "label": "Body mass index", "unit": "kg/m2", "required": True, "min": 10, "max": 70},
            {"name": "Age", "label": "Age", "unit": "years", "required": True, "min": 21, "max": 100},
            {"name": "BloodPressure", "label": "Diastolic blood pressure", "unit": "mmHg", "required": False, "min": 30, "max": 150},
        ],
        "feature_order": pp.FEATURES,
        "target": "Outcome (1 = diabetes diagnosed within 5 years of baseline, 0 = not)",
        "population": "Female, age >= 21, Pima Indian heritage",
    }
    (out / "feature_schema.json").write_text(json.dumps(schema, indent=2))
    meta = {
        "trained_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "random_seed": seed,
        "sklearn_version": sklearn.__version__,
        "numpy_version": np.__version__,
        "chosen_model": chosen,
        "selection_rule": "highest 5-fold CV ROC-AUC on the training split; simplest model within 1 std of the best is preferred",
        "dataset": pp.describe_dataset(data),
        "split": {"train": int(len(X_tr)), "test": int(len(X_te)), "test_size": 0.2, "stratified": True},
        "cross_validation": cv_results,
        "test_metrics": test_metrics,
    }
    (out / "metrics.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps({"chosen": chosen, "cv_roc_auc": {k: round(v["roc_auc_mean"], 3) for k, v in cv_results.items()},
                      "test": {k: round(test_metrics[k], 3) for k in ("accuracy", "precision", "recall", "f1", "roc_auc")}}, indent=2))
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--data", type=Path, default=pp.DATA_PATH)
    a = ap.parse_args()
    main(a.seed, a.out, a.data)
