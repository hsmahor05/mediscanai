import sys
from pathlib import Path
import pytest
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "ml"))
SAMPLES = ROOT / "samples"


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_model_cache():
    from app.services.ml_service import get_model_service
    get_model_service.cache_clear()
    yield
    get_model_service.cache_clear()
