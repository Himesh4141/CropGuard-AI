from dataclasses import dataclass
from io import BytesIO
import warnings

from PIL import Image, UnidentifiedImageError


ALLOWED_CONTENT_TYPES: dict[str, str] = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}

FORMAT_SUFFIXES: dict[str, str] = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
}

MIN_IMAGE_DIMENSION = 64
MAX_IMAGE_DIMENSION = 12_000


@dataclass(frozen=True, slots=True)
class ValidatedImage:
    image_format: str
    suffix: str
    width: int
    height: int


def validate_image_bytes(
    *,
    content: bytes,
    declared_content_type: str | None,
) -> ValidatedImage:
    if declared_content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError("Only JPEG, PNG and WEBP images are supported")

    if not content:
        raise ValueError("Uploaded image is empty")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)

            with Image.open(BytesIO(content)) as image:
                image.verify()

            with Image.open(BytesIO(content)) as image:
                image_format = (image.format or "").upper()
                width, height = image.size
                image.load()

    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise ValueError("Uploaded file is not a valid supported image") from exc

    expected_format = ALLOWED_CONTENT_TYPES[declared_content_type]

    if image_format != expected_format:
        raise ValueError(
            "Image content does not match the declared file type"
        )

    if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
        raise ValueError(
            f"Image must be at least {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION} pixels"
        )

    if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
        raise ValueError(
            f"Image dimensions must not exceed {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION} pixels"
        )

    return ValidatedImage(
        image_format=image_format,
        suffix=FORMAT_SUFFIXES[image_format],
        width=width,
        height=height,
    )