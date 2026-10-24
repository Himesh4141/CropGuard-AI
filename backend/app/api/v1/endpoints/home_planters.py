"""Private image-to-species endpoint. No farm, field or diagnosis records."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.home_plant_identity import (
    RecognitionUnavailable,
    identify_with_plantnet,
)
from app.services.photo_enhancement import InvalidPlantPhoto

router = APIRouter()


class PlantIdentityResponse(BaseModel):
    status: str
    plant: str
    confidence: float = Field(ge=0, le=1)
    scientific_name: str | None = None
    common_name: str | None = None
    message: str
    flower_match: str | None = None
    candidates: list[dict[str, str | float | None]] = Field(default_factory=list)


@router.post("/identify", response_model=PlantIdentityResponse)
async def identify_home_plant(
    image: Annotated[UploadFile, File()],
    _actor: Annotated[User, Depends(get_current_user)],
    photo_prepared: Annotated[bool, Form()] = False,
) -> dict:
    try:
        if not settings.plantnet_api_key:
            raise HTTPException(
                status_code=503,
                detail="Plant recognition has not been configured on the server yet",
            )
        allowed = {
            "image/jpeg": (b"\xff\xd8\xff",),
            "image/png": (b"\x89PNG\r\n\x1a\n",),
            "image/webp": (b"RIFF",),
        }
        kind = image.content_type or ""
        if kind not in allowed:
            raise HTTPException(
                status_code=415, detail="Only JPG, PNG and WebP images are accepted"
            )
        limit = min(settings.max_upload_mb, 8) * 1024 * 1024
        photo = await image.read(limit + 1)
        if len(photo) > limit:
            raise HTTPException(status_code=413, detail="Plant photograph is too large")
        if not photo or not any(photo.startswith(marker) for marker in allowed[kind]):
            raise HTTPException(status_code=415, detail="Invalid plant photograph")
        if kind == "image/webp" and photo[8:12] != b"WEBP":
            raise HTTPException(status_code=415, detail="Invalid WebP image")
        return await run_in_threadpool(
            identify_with_plantnet,
            photo,
            kind,
            settings.plantnet_api_key,
            photo_prepared,
        )
    except InvalidPlantPhoto as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except RecognitionUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        await image.close()
