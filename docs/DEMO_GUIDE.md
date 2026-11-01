# College demonstration guide (about 8-10 minutes)

All sample reports in `samples/` are **synthetic demonstration data**, not real patients.

**Before you start:** backend on :8000, frontend on :5173 (see README). Open `/health` once to confirm `model_loaded: true` and `ocr_available: true`.

1. **Open the website (1 min).** Show Home: workflow strip, feature cards, the visible educational-use disclaimer. Click *Analyze My Report*.
2. **Upload a sample report (1 min).** Drag in `samples/sample_report_general.pdf`. Point out file name/size, the remove/replace buttons. Open *Optional details*, choose Female. Click *Start analysis* (upload progress bar, then the processing screen).
3. **Review extracted values (2 min).** On the results page: summary tiles, the values table with units, ranges ("printed on your report"), and status badges. Note converted units (WBC `/cumm` -> 10^3/uL, platelets `lakhs/cumm`). Expand *What is this?* on a row. Stress that "above range" is a comparison, not a diagnosis. Show *What the server did* (real stage log).
4. **Correct an extraction error (1 min).** Open *Review and correct*, change the Hemoglobin value (e.g. 11.2 -> 13.0), tick Verified, click *Update comparison*: status changes from Below to Within.
5. **Reference-range logic (30 s).** Add a test with the type "Other" to show "Unable to determine / Not available": the app never invents a range.
6. **Genuine ML prediction (2 min).** Click *New report*, upload `samples/sample_report_ogtt.pdf`, set Female, age 34, BMI 27.5 and analyse. The ML card shows an estimate. Explain *why* the first report earlier said "not applicable" (no 2-hour OGTT value). Change the OGTT glucose in the review table and update to show the estimate move.
7. **Explain the model (2 min).** Open *How It Works -> model section*: dataset (Pima, 768 records), split-first/no-leakage pipeline, 3 models compared by 5-fold CV, held-out metrics (accuracy 0.70, ROC-AUC 0.79), confusion matrix. Be upfront that performance is modest and the population is narrow.
8. **Error handling (1 min).** Try uploading a `.txt` file (instant client-side error); then stop the backend and click *Start analysis* to show the "could not reach the server" message with *Try again*. Optionally upload `samples/sample_report_ogtt.png` to show OCR rows flagged *Needs review* and the ML card waiting for verification.

**Likely questions:** *Why not use fasting glucose in the model?* (different measurement than the training data). *Is it accurate?* (modest; see held-out metrics; not clinical). *Why no database?* (not needed; privacy). *What if OCR is missing?* (manual entry fallback).
