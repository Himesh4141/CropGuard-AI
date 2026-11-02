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
    MAX_IDENTIFICATION_PHOTOS,
    PlantPhotoTooLarge,
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
    common_names: list[str] = Field(default_factory=list, max_length=5)
    genus: str | None = Field(default=None, max_length=120)
    family: str | None = Field(default=None, max_length=120)
    message: str
    flower_match: str | None = None
    candidates: list[dict[str, str | float | None]] = Field(default_factory=list)


@router.post("/identify", response_model=PlantIdentityResponse)
async def identify_home_plant(
    image: Annotated[UploadFile, File()],
    _actor: Annotated[User, Depends(get_current_user)],
    photo_prepared: Annotated[bool, Form()] = False,
    additional_images: Annotated[list[UploadFile] | None, File()] = None,
) -> dict:
    images = [image, *(additional_images or [])]
    try:
        if len(images) > MAX_IDENTIFICATION_PHOTOS:
            raise HTTPException(status_code=422, detail="Use up to 3 photos of the same plant")
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
        limit = min(settings.max_upload_mb, 8) * 1024 * 1024
        total = 0
        photos: list[tuple[bytes, str]] = []
        for upload in images:
            kind = upload.content_type or ""
            if kind not in allowed:
                raise HTTPException(status_code=415, detail="Only JPG, PNG and WebP images are accepted")
            photo = await upload.read(limit - total + 1)
            total += len(photo)
            if total > limit:
                raise HTTPException(status_code=413, detail="Combined plant photographs are too large")
            if not photo or not any(photo.startswith(marker) for marker in allowed[kind]):
                raise HTTPException(status_code=415, detail="Invalid plant photograph")
            if kind == "image/webp" and photo[8:12] != b"WEBP":
                raise HTTPException(status_code=415, detail="Invalid WebP image")
            photos.append((photo, kind))
        photo, kind = photos[0]
        if len(photos) > 1:
            return await run_in_threadpool(
                identify_with_plantnet, photo, kind, settings.plantnet_api_key,
                photo_prepared, photos[1:],
            )
        # Preserve the original four-argument call for existing clients/tests.
        return await run_in_threadpool(
            identify_with_plantnet,
            photo,
            kind,
            settings.plantnet_api_key,
            photo_prepared,
        )
    except PlantPhotoTooLarge as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    except InvalidPlantPhoto as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except RecognitionUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        for upload in images:
            await upload.close()
