import os
from pathlib import Path

MAX_UPLOAD_MB = float(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
ENABLE_OCR = os.getenv("ENABLE_OCR", "true").lower() == "true"
ARTIFACT_DIR = Path(os.getenv("MODEL_ARTIFACT_DIR", Path(__file__).parent / "ml" / "artifacts"))
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "10"))
DISCLAIMER = (
    "MediScan AI is an educational project that helps organize and explain laboratory report information. "
    "It is not a medical device or a substitute for professional medical advice, diagnosis, or treatment. "
    "Please discuss medical concerns and abnormal results with a qualified healthcare professional."
)
