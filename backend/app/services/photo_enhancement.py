"""Optional conservative exposure normalization for home-plant identity.

This module does not fabricate missing fine detail or perform disease diagnosis.
Single-provider-request design: it adjusts only dark/low-contrast photographs,
and sends the original bytes untouched otherwise. No farm or field data access.
"""

from __future__ import annotations

from io import BytesIO

MAX_IMAGE_PIXELS = 18_000_000


class InvalidPlantPhoto(ValueError):
    """An uploaded file isn't safely decodable as a supported photograph."""


def gentle_enhance_photo(
    photo: bytes, mime: str, *, enhance: bool = True
) -> tuple[bytes, str, bool]:
    """Return (photo bytes, content type, was adjusted).

    Pillow is required by CropGuard's ML stack. If it is unavailable on a
    minimal backend installation, the existing provider workflow still works.
    Safety/format failures deliberately raise InvalidPlantPhoto.
    """
    try:
        from PIL import Image, ImageEnhance, ImageOps, ImageStat, UnidentifiedImageError
    except ImportError:
        return photo, mime, False

    try:
        with Image.open(BytesIO(photo)) as image:
            width, height = image.size
            if width < 96 or height < 96 or width * height > MAX_IMAGE_PIXELS:
                raise InvalidPlantPhoto(
                    "Image dimensions are outside the supported range"
                )
            expected = {
                "image/jpeg": {"JPEG"},
                "image/png": {"PNG"},
                "image/webp": {"WEBP"},
            }
            if image.format not in expected.get(mime, set()):
                raise InvalidPlantPhoto(
                    "Image content does not match its declared format"
                )
            oriented = ImageOps.exif_transpose(image).convert("RGBA")
            background = Image.new("RGBA", oriented.size, "white")
            rgb = Image.alpha_composite(background, oriented).convert("RGB")
    except InvalidPlantPhoto:
        raise
    except (
        OSError,
        ValueError,
        UnidentifiedImageError,
        Image.DecompressionBombError,
    ) as exc:
        raise InvalidPlantPhoto("The image file could not be decoded") from exc

    if not enhance:
        return photo, mime, False

    sample = rgb.copy()
    sample.thumbnail((384, 384))
    luminance = ImageStat.Stat(sample.convert("L"))
    mean = luminance.mean[0]
    std = luminance.stddev[0]
    need_dark = mean < 93
    need_bright = mean > 198
    # Variegated green/yellow leaves may have similar luminance but richly
    # different colors; low luminance variance alone isn't a flat photograph.
    rgb_stat = ImageStat.Stat(sample)
    channel_spread = max(rgb_stat.mean) - min(rgb_stat.mean)
    need_contrast = std < 32 and channel_spread < 24
    if not (need_dark or need_bright or need_contrast):
        return photo, mime, False

    # At extremely low exposure there is no recoverable signal. Apply bounded
    # gains only; don't hallucinate lesions through aggressive sharpening.
    ratio = (
        min(1.42, 117 / max(mean, 58))
        if need_dark
        else max(0.87, 177 / mean)
        if need_bright
        else 1.0
    )
    rgb = ImageEnhance.Brightness(rgb).enhance(ratio)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.10 if need_contrast else 1.025)
    if max(rgb.size) > 1600:
        rgb.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    out = BytesIO()
    rgb.save(out, "JPEG", quality=89, optimize=True)
    encoded = out.getvalue()
    if len(encoded) > 8 * 1024 * 1024:
        return photo, mime, False
    return encoded, "image/jpeg", True
