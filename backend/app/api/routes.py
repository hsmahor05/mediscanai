import logging
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from .. import config
from ..report_processing.catalog import CATALOG
from ..report_processing.extract import ReportError, ocr_available
from ..schemas.models import AnalysisResponse, ManualRequest, Profile
from ..services import pipeline
from ..services.ml_service import get_model_service

log = logging.getLogger("mediscan.api")
router = APIRouter()

ERR = {400: "Bad request", 413: "Too large", 415: "Unsupported", 422: "Unprocessable", 503: "Unavailable"}


@router.get("/health")
def health():
    ms = get_model_service()
    return {"status": "ok", "model_loaded": ms.available, "ocr_available": ocr_available(), "max_upload_mb": config.MAX_UPLOAD_MB}


@router.post("/api/analyze", response_model=AnalysisResponse, responses={400: {}, 413: {}, 415: {}, 422: {}, 503: {}})
async def analyze(file: UploadFile = File(...), sex: str | None = Form(None), age: int | None = Form(None),
                  bmi: float | None = Form(None), diastolic_bp: float | None = Form(None)):
    try:
        profile = Profile(sex=sex or None, age=age, bmi=bmi, diastolic_bp=diastolic_bp)
    except ValidationError as e:
        return _err("invalid_profile", "One of the optional details is invalid: " + e.errors()[0]["loc"][-1].__str__(), 422)
    # Read at most limit+1 bytes so oversized uploads are rejected without loading everything.
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    try:
        result = pipeline.analyze_file(data, file.filename, profile)
    except ReportError as e:
        return _err(e.code, e.message, e.status)
    log.info("analyzed upload kind=%s tests=%d", result.source.kind, result.summary.total)  # no content logged
    return result


@router.post("/api/analyze/manual", response_model=AnalysisResponse)
def analyze_manual(req: ManualRequest):
    result = pipeline.analyze_manual(req.tests, req.profile)
    log.info("analyzed manual tests=%d", result.summary.total)
    return result


@router.get("/api/model-info")
def model_info():
    return get_model_service().info()


@router.get("/api/supported-tests")
def supported_tests():
    return [{"key": t.key, "name": t.name, "unit": t.unit, "units_accepted": sorted(set([t.unit.lower(), *t.conversions.keys()]))} for t in CATALOG.values()]


def _err(code: str, message: str, status: int):
    return JSONResponse(status_code=status, content={"code": code, "message": message})
