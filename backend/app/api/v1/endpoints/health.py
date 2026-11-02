"""Liveness intentionally avoids DB/ML; readiness checks real dependencies.

Does not warm/change the existing farmer ONNX model or touch the database schema.
"""
from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.ml.onnx_classifier import OnnxMultiCropDiseaseClassifier

router = APIRouter()

@router.get("/health")
def health() -> dict[str, str]:
    """Safe liveness endpoint for Render cold-start/monitoring; no DB access."""
    return {"status": "healthy", "service": "cropguard-api", "database": "not_checked"}

@router.get("/ready")
def ready(db: Session = Depends(get_db)) -> dict[str, str]:
    """Report degraded readiness without claiming ML accuracy or initializing a model."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Database is not ready") from exc
    # Use the inference path resolver: Render starts inside backend, while the
    # repository model lives in its sibling ml directory. Do not load ONNX here.
    model = OnnxMultiCropDiseaseClassifier._resolve_artifact(
        Path(__file__).resolve().parents[4], settings.ml_model_path
    )
    if not model.is_file():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Configured crop model artifact is unavailable")
    return {"status": "ready", "database": "reachable", "crop_model": "artifact_present"}
