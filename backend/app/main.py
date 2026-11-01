import logging
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

if __package__ is None or __package__ == "":
    backend_root = Path(__file__).resolve().parent.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))
    from app import config
    from app.api.routes import router
else:
    from . import config
    from .api.routes import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="MediScan AI API", version="1.0.0",
              description="Educational lab-report analyser. Not a medical device. " + config.DISCLAIMER)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["*"])
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    loc = ".".join(str(p) for p in first["loc"] if p != "body")
    return JSONResponse(status_code=422, content={"code": "validation_error", "message": f"Invalid request: {loc}: {first['msg']}"})


@app.exception_handler(Exception)
async def unhandled(req: Request, exc: Exception):
    logging.getLogger("mediscan").exception("Unhandled error")
    res = JSONResponse(status_code=500, content={"code": "internal_error", "message": "Something went wrong while processing the request."})
    origin = req.headers.get("origin")
    if origin:
        res.headers["Access-Control-Allow-Origin"] = origin
    return res


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
