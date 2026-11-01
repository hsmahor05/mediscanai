"""Dataset download + cleaning for the MediScan AI ML module.

Dataset: Pima Indians Diabetes Database (National Institute of Diabetes and
Digestive and Kidney Diseases; Smith et al., 1988). 768 records, all female
patients >= 21 years of age of Pima Indian heritage.
"""
from __future__ import annotations
import hashlib
from pathlib import Path
import urllib.request
import numpy as np
import pandas as pd

DATA_URL = "https://raw.githubusercontent.com/plotly/datasets/master/diabetes.csv"
DATA_PATH = Path(__file__).parent / "data" / "pima_diabetes.csv"

# Features chosen because a user can supply them in the app workflow:
#  - Glucose: 2-hour plasma glucose in an oral glucose tolerance test (mg/dL).
#             Must come from the report (an OGTT value) - NOT a fasting value.
#  - BMI, Age, BloodPressure: entered by the user (not found on lab reports).
FEATURES = ["Glucose", "BloodPressure", "BMI", "Age"]
REQUIRED_FEATURES = ["Glucose", "BMI", "Age"]
TARGET = "Outcome"
# In this dataset a value of 0 for these columns is physiologically impossible
# and encodes "missing".
ZERO_IS_MISSING = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]


def download(path: Path = DATA_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(DATA_URL, path)
    return path


def sha256(path: Path = DATA_PATH) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_raw(path: Path = DATA_PATH) -> pd.DataFrame:
    if not path.exists():
        download(path)
    return pd.read_csv(path)


def load_clean(path: Path = DATA_PATH) -> pd.DataFrame:
    """Return the dataset with impossible zeros replaced by NaN.

    No statistics are computed here: imputation happens inside the scikit-learn
    Pipeline so it is fitted on training folds only (no leakage).
    """
    df = load_raw(path).copy()
    for col in ZERO_IS_MISSING:
        df[col] = df[col].replace(0, np.nan)
    return df


def describe_dataset(path: Path = DATA_PATH) -> dict:
    raw = load_raw(path)
    clean = load_clean(path)
    return {
        "records": int(len(raw)),
        "class_counts": {str(k): int(v) for k, v in raw[TARGET].value_counts().sort_index().items()},
        "missing_encoded_as_zero": {c: int((raw[c] == 0).sum()) for c in ZERO_IS_MISSING},
        "features_used": FEATURES,
        "sha256": sha256(path),
        "age_range": [int(raw.Age.min()), int(raw.Age.max())],
        "missing_after_cleaning": {c: int(clean[c].isna().sum()) for c in FEATURES},
    }


if __name__ == "__main__":
    p = download()
    print("Downloaded to", p)
    print(describe_dataset(p))
