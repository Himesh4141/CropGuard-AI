from pathlib import Path
from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import health as health_endpoint


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.parametrize("layout", ["repository", "packaged", "absolute"])
def test_ready_finds_configured_model_without_loading_it(tmp_path, monkeypatch, layout):
    repository = tmp_path / "repository"
    backend = repository / "backend"
    backend.mkdir(parents=True)
    monkeypatch.chdir(backend)
    monkeypatch.setattr(
        health_endpoint, "__file__", str(backend / "app/api/v1/endpoints/health.py")
    )
    relative = Path("ml/artifacts/field_robust_v2/model.onnx")
    root = backend if layout == "packaged" else repository
    artifact = root / relative
    artifact.parent.mkdir(parents=True)
    # Deliberately not a valid ONNX model: readiness must only check presence.
    artifact.write_bytes(b"presence-check-only")
    monkeypatch.setattr(
        health_endpoint.settings, "ml_model_path",
        artifact if layout == "absolute" else relative,
    )
    db = Mock()

    assert health_endpoint.ready(db) == {
        "status": "ready", "database": "reachable", "crop_model": "artifact_present"
    }
    db.execute.assert_called_once()


def test_ready_rejects_missing_model(tmp_path, monkeypatch):
    monkeypatch.setattr(health_endpoint.settings, "ml_model_path", tmp_path / "missing.onnx")
    with pytest.raises(HTTPException) as error:
        health_endpoint.ready(Mock())
    assert error.value.status_code == 503
    assert error.value.detail == "Configured crop model artifact is unavailable"
