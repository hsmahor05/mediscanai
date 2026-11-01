# MediScan AI - ML module / model card

## Task
Estimate, from a **2-hour OGTT plasma glucose, BMI, age and (optional) diastolic blood pressure**, whether a patient belongs to the group that was **diagnosed with diabetes within 5 years** in the training data (`Outcome = 1`).

## Dataset
- **Pima Indians Diabetes Database**, National Institute of Diabetes and Digestive and Kidney Diseases (Smith et al., 1988).
- Copy used: `https://raw.githubusercontent.com/plotly/datasets/master/diabetes.csv`, stored at `ml/data/pima_diabetes.csv` (SHA-256 `698c203a14aa...`, full hash in `metrics.json`).
- 768 records (500 class 0 / 268 class 1); all female, age 21-81, Pima Indian heritage.
- **Licence:** widely redistributed as public domain (CC0) on data platforms, but **not independently verified** by this project. Check the original source before redistributing.
- Missing values: encoded as 0 in Glucose (5), BloodPressure (35), BMI (11) among the features used (also SkinThickness 227, Insulin 374, which are not used). Converted to NaN and median-imputed inside the pipeline.
- **Why only four features:** the app can obtain glucose from a report (only if it is a 2-hour OGTT value) and the user can type BMI, age and blood pressure. Insulin/skin-thickness are mostly missing and not on typical reports; pregnancies applies only to women and is dropped.

## Pipeline (`preprocess.py`, `train.py`, `evaluate.py`)
1. Zeros -> NaN for physiologically impossible values (no statistics computed here).
2. **Stratified 80/20 split first** (seed 42): 614 train / 154 test.
3. scikit-learn `Pipeline` per candidate: `SimpleImputer(median)` [+ `StandardScaler` for logistic regression] + classifier. Fitted on training folds only, so no leakage.
4. Candidates: Logistic Regression, Decision Tree (depth 4), Random Forest (300 trees, depth 6); `class_weight="balanced"`.
5. 5-fold stratified CV on the training split, scored by ROC-AUC. Selection rule: highest mean, but the simplest model within one standard deviation of the best is preferred.
6. The chosen model is evaluated **once** on the untouched test split and saved with Joblib. No refit on test data.

## Results (from the run recorded in `backend/app/ml/artifacts/metrics.json`)
| Model | CV ROC-AUC (mean +/- std) |
|---|---|
| **Logistic regression (selected)** | 0.835 +/- 0.019 |
| Random forest | 0.826 +/- 0.033 |
| Decision tree | 0.796 +/- 0.030 |

Held-out test set (n = 154, threshold 0.5): accuracy 0.701, precision 0.567, recall 0.630, F1 0.596, ROC-AUC 0.786, Brier 0.192.
Confusion matrix (rows actual 0/1, columns predicted 0/1): `[[74, 26], [20, 34]]`.
Class 1 (diabetes): precision 0.57, recall 0.63, F1 0.60 (support 54). Class 0: precision 0.79, recall 0.74, F1 0.76 (support 100).
Figures: `figures/confusion_matrix.png`, `figures/roc_curve.png`.

These numbers come from a single 154-record split; confidence intervals would be wide. Re-running `train.py` regenerates them; the website reads them live from `metrics.json`.

## Limitations
- Single, small, historical dataset from one population (women of Pima heritage aged 21+). The app therefore refuses to run the model for male or unspecified sex or age < 21.
- Dataset glucose is a 2-hour OGTT value. A fasting/random glucose is a different measurement and is rejected.
- Probabilities are uncalibrated model estimates, not clinical risk. Modest discrimination (AUC 0.79).
- Educational demonstration only; not clinically validated.

## Reproduce
```bash
cd mediscan-ai
python ml/preprocess.py     # (optional) re-download dataset + print summary
python ml/train.py          # trains, compares, evaluates, saves artifacts (+ figures)
python ml/evaluate.py       # re-evaluates the saved model on the same held-out split
```
Artifacts written to `backend/app/ml/artifacts/`: `model.joblib`, `metrics.json`, `feature_schema.json`. The scikit-learn version used for training is recorded in `metrics.json`; keep `requirements.txt` in sync (the backend logs a warning on mismatch).
