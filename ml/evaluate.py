"""Evaluation utilities. Can also re-evaluate the saved model:  python ml/evaluate.py"""
from __future__ import annotations
import json, sys
from pathlib import Path
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import (accuracy_score, brier_score_loss, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score, roc_curve, classification_report, ConfusionMatrixDisplay)
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).parent))
import preprocess as pp  # noqa: E402


def evaluate_model(model, X_te, y_te, out_dir: Path | None = None) -> dict:
    proba = model.predict_proba(X_te)[:, 1]
    pred = (proba >= 0.5).astype(int)
    cm = confusion_matrix(y_te, pred)
    report = classification_report(y_te, pred, output_dict=True, target_names=["no_diabetes(0)", "diabetes(1)"], zero_division=0)
    metrics = {
        "threshold": 0.5,
        "n_test": int(len(y_te)),
        "accuracy": float(accuracy_score(y_te, pred)),
        "precision": float(precision_score(y_te, pred, zero_division=0)),
        "recall": float(recall_score(y_te, pred)),
        "f1": float(f1_score(y_te, pred)),
        "roc_auc": float(roc_auc_score(y_te, proba)),
        "brier_score": float(brier_score_loss(y_te, proba)),
        "confusion_matrix": {"labels": [0, 1], "matrix": cm.tolist()},
        "per_class": {k: {m: float(v) for m, v in d.items()} for k, d in report.items() if isinstance(d, dict)},
        "note": "Positive class = diabetes diagnosed within 5 years. Metrics come from a single held-out split of 154 records; expect wide uncertainty.",
    }
    if out_dir is not None:
        out_dir.mkdir(parents=True, exist_ok=True)
        fig, ax = plt.subplots(figsize=(4, 3.6))
        ConfusionMatrixDisplay(cm, display_labels=["No (0)", "Yes (1)"]).plot(ax=ax, colorbar=False, cmap="Blues")
        ax.set_title("Confusion matrix (held-out test set)"); fig.tight_layout(); fig.savefig(out_dir / "confusion_matrix.png", dpi=150); plt.close(fig)
        fpr, tpr, _ = roc_curve(y_te, proba)
        fig, ax = plt.subplots(figsize=(4, 3.6))
        ax.plot(fpr, tpr, label=f"AUC = {metrics['roc_auc']:.3f}"); ax.plot([0, 1], [0, 1], "--", color="grey")
        ax.set_xlabel("False positive rate"); ax.set_ylabel("True positive rate"); ax.set_title("ROC curve (held-out test set)"); ax.legend()
        fig.tight_layout(); fig.savefig(out_dir / "roc_curve.png", dpi=150); plt.close(fig)
    return metrics


if __name__ == "__main__":
    meta_path = Path(__file__).resolve().parent.parent / "backend/app/ml/artifacts"
    meta = json.loads((meta_path / "metrics.json").read_text())
    model = joblib.load(meta_path / "model.joblib")
    df = pp.load_clean()
    _, X_te, _, y_te = train_test_split(df[pp.FEATURES], df[pp.TARGET], test_size=0.2, stratify=df[pp.TARGET], random_state=meta["random_seed"])
    m = evaluate_model(model, X_te, y_te, out_dir=Path(__file__).parent / "figures")
    print(json.dumps({k: m[k] for k in ("accuracy", "precision", "recall", "f1", "roc_auc")}, indent=2))
