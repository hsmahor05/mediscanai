# MediScan AI - AI-Powered Lab Report Analyser

An **educational** full-stack project: upload a lab report (PDF/JPG/PNG), extract test values, compare them with reference ranges, read plain-language explanations, and see a genuine, reproducible scikit-learn model used only where its inputs are compatible.

> **MediScan AI is an educational project that helps organize and explain laboratory report information. It is not a medical device or a substitute for professional medical advice, diagnosis, or treatment. Please discuss medical concerns and abnormal results with a qualified healthcare professional.**

## 1-3. Introduction, problem, objectives
Lab reports are dense and easy to misread. This project demonstrates a pipeline that (a) digitises a report, (b) lets a person verify what was read, (c) compares values with reference ranges, and (d) shows how ML can be integrated *responsibly*, keeping extracted values, ranges, rule-based flags, ML estimates and explanations clearly separate. It never labels a person healthy/unhealthy.

## 4. Features
- Drag-and-drop upload (PDF/JPG/PNG), type/size/signature validation, progress, clear errors, retry.
- Digital-PDF text extraction (PyMuPDF) and OCR (Tesseract + OpenCV) with a manual-entry fallback when OCR is unavailable.
- Catalogue of 24 common tests with aliases; unit conversion (e.g. `/cumm`, `lakhs/cumm`, mmol/L); report-printed ranges preferred over generic ranges; "Unable to determine" when no range exists.
- Review/correct table (change test type, value, unit, range; mark verified; add/remove rows) with re-comparison.
- Charts (Recharts), explanations, print summary, real pipeline log.
- ML estimate behind a strict compatibility gate (see below).

## 5. Technology stack
React 18, TypeScript, Vite, Tailwind CSS 3, React Router, Recharts, Lucide | Python 3.12, FastAPI, Pydantic | scikit-learn, pandas, NumPy, Joblib, Matplotlib | PyMuPDF, Tesseract, OpenCV, Pillow | pytest, Vitest, Testing Library.
No database: uploads are processed in memory and discarded (nothing needs persistence).

## 6. Architecture and workflow
```
React SPA (Vercel) --HTTPS--> FastAPI (Render, Docker)
                               |- api/routes.py              routing + HTTP errors
                               |- report_processing/         validate -> extract text/OCR -> parse -> test catalogue
                               |- services/analysis.py       unit conversion + range comparison
                               |- services/ml_service.py     input validation, gating, inference, limitations
                               |- services/pipeline.py       orchestration + real stage log
                               '- ml/artifacts/              model.joblib, metrics.json, feature_schema.json
```
Flow: upload -> validate -> text/OCR -> parse -> (user review) -> compare -> ML gate -> results.

## 7-8. Dataset and ML methodology
Pima Indians Diabetes Database (768 women aged 21+, NIDDK, Smith et al. 1988), via a GitHub mirror; licence widely cited as CC0 but **not independently verified**. Full details, the feature-choice rationale, pipeline, and measured results are in [`ml/README.md`](ml/README.md).
**Compatibility gate:** the model runs only if the report has a *2-hour OGTT glucose* (mg/dL, verified if OCR-read), and the user supplies sex = female, age >= 21 and BMI. Otherwise the app explains why it did not run. Measured held-out result (n=154): accuracy 0.70, recall 0.63, precision 0.57, ROC-AUC 0.79 - modest, and presented that way.

## 9. API
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | status, `model_loaded`, `ocr_available` |
| POST | `/api/analyze` | multipart: `file` (+ optional `sex`, `age`, `bmi`, `diastolic_bp`) -> `AnalysisResponse` |
| POST | `/api/analyze/manual` | JSON `{tests:[...], profile:{...}}` -> `AnalysisResponse` (also used to re-compare corrected values) |
| GET | `/api/model-info` | dataset facts, CV results, held-out metrics, limitations |
| GET | `/api/supported-tests` | test catalogue (keys, canonical units) |

Errors are `{ "code": "...", "message": "..." }` with 400/413/415/422/503. Interactive docs: `http://localhost:8000/docs`.

## 10-11. Prerequisites and local setup
Python 3.12, Node 20+, Tesseract (optional but needed for images/scans). macOS: `brew install tesseract`; Ubuntu: `sudo apt install tesseract-ocr`.
```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000

# frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev            # http://localhost:5173
```
## 12. Environment variables
See [`.env.example`](.env.example): `CORS_ORIGINS`, `MAX_UPLOAD_MB`, `MAX_PDF_PAGES`, `ENABLE_OCR`, `MODEL_ARTIFACT_DIR` (backend); `VITE_API_BASE_URL`, `VITE_MAX_UPLOAD_MB` (frontend). No secrets are required.

## 13. Train / load the model
The trained artifacts are committed, so the backend works immediately. To retrain: `python ml/train.py` (from the repo root, with the backend venv active), then restart the backend. If artifacts are missing the API still runs and the ML card says the model is unavailable.

## 14. Sample data
`python scripts/make_sample_reports.py` regenerates the **synthetic** reports in `samples/` (general PDF, OGTT PDF, OGTT PNG).

## 15. Tests
```bash
cd backend && pytest -q                                   # 53 tests: API, validation, parser, OCR, ML, gating
cd frontend && npm test && npm run build                  # 15 unit/component tests + production build
# live integration (backend started with CORS_ORIGINS=http://localhost:3000):
cd frontend && INTEGRATION_API=1 VITE_API_BASE_URL=http://localhost:8000 npx vitest run src/test/integration.test.tsx
```

## 16. Deployment
**Backend on Render (Docker, so Tesseract is available):** push the repo to GitHub -> Render *New + > Blueprint* (uses `render.yaml`) or create a Web Service with root directory `backend`, runtime Docker. Set `CORS_ORIGINS` to your Vercel URL. Health check path `/health`. Docs: https://render.com/docs/deploy-fastapi.
**Frontend on Vercel:** import the repo, root directory `frontend`, framework Vite (build `npm run build`, output `dist`), env var `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`. `vercel.json` provides the SPA rewrite. Docs: https://vercel.com/kb/guide/deploying-react-with-vercel.
Then update `CORS_ORIGINS` on Render with the final Vercel URL and redeploy.
**Free-tier caveats:** Render free services sleep after inactivity (first request may take ~1 minute) and have limited CPU/RAM; OCR of large images is slow there.
**Troubleshooting:** CORS error in the browser console -> `CORS_ORIGINS` missing the exact Vercel origin (no trailing slash). "Could not reach the server" -> wrong `VITE_API_BASE_URL` (needs a rebuild after changing) or the service is waking up. `/health` shows `ocr_available:false` -> Tesseract not installed (use the Dockerfile). Model warnings about scikit-learn version -> reinstall pinned `requirements.txt` or retrain.

## 17. Known limitations
Fixed test catalogue; extraction tuned on digital PDFs/synthetic samples, so real-world layouts will need review; OCR can misread digits (every OCR row requires verification); generic ranges are simplified adult ranges; ML is a narrow-population demonstration with modest accuracy; deployment files were written to platform docs but not deployed from this environment; layout was checked by build/tests, not by visual inspection on real devices.

## 18. Medical safety and privacy
Educational only; not a medical device. No accounts, no storage of uploads, logs contain no report content, no compliance claims (HIPAA/GDPR) are made. Use the synthetic samples for demonstrations. See also [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md).
