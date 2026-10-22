/**
 * Gentle, bounded photo enhancement for inexpensive phone cameras.
 * This cannot reconstruct missing detail or diagnose a disease.
 * Original image remains available in caller state; only the temporary
 * enhanced copy is supplied to the recognition/observation pipeline.
 */
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_INPUT = 10 * 1024 * 1024;
const MAX_EDGE = 1440;

type PhotoPreparation = { file: File; improved: boolean; message: string };

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export async function preparePlantPhoto(file: File): Promise<PhotoPreparation> {
  if (!ACCEPTED.has(file.type) || !file.size || file.size > MAX_INPUT) {
    throw new Error("Select a JPG, PNG or WebP image under 10 MB.");
  }

  const image = new Image();
  const src = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The image could not be decoded."));
      image.src = src;
    });
    if (image.naturalWidth < 96 || image.naturalHeight < 96) {
      throw new Error("The photograph has too few pixels to analyze.");
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { file, improved: false, message: "Using the original image." };
    // JPEG has no alpha; white avoids introducing artificial black borders
    // when a user uploads a transparent PNG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const rgba = pixels.data;
    let sum = 0, sumSquares = 0, samples = 0, dark = 0, blown = 0, saturationSum = 0;
    // Sample evenly for exposure statistics, process every RGB pixel if needed.
    const stride = Math.max(1, Math.floor((canvas.width * canvas.height) / 8000));
    for (let i = 0; i < canvas.width * canvas.height; i += stride) {
      const j = i * 4;
      // Typed arrays are bounds-safe at runtime, but strict TypeScript indexing
      // marks reads as potentially undefined. The sampled indices are valid;
      // defaults retain a safe value for any unexpected canvas buffer.
      const red = rgba[j] ?? 0;
      const green = rgba[j + 1] ?? 0;
      const blue = rgba[j + 2] ?? 0;
      const l = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      sum += l; sumSquares += l * l; samples++;
      const maxRgb = Math.max(red, green, blue);
      const minRgb = Math.min(red, green, blue);
      saturationSum += (maxRgb - minRgb) / Math.max(maxRgb, 1);
      if (l < 28) dark++;
      if (l > 245) blown++;
    }
    const mean = sum / Math.max(samples, 1);
    const deviation = Math.sqrt(Math.max(0, sumSquares / samples - mean * mean));
    const tooDark = mean < 95 && blown / samples < 0.16;
    const tooBright = mean > 194 && dark / samples < 0.10;
    const lowContrast = deviation < 32 && saturationSum / samples < 0.19;
    // Good photos retain their untouched original detail/resolution.
    if (!tooDark && !tooBright && !lowContrast && file.size <= 7 * 1024 * 1024 && image.naturalWidth * image.naturalHeight <= 18_000_000) {
      return { file, improved: false, message: "Original photograph analyzed." };
    }
    const gain = tooDark ? Math.min(1.48, 118 / Math.max(55, mean))
      : tooBright ? Math.max(0.86, 170 / mean) : 1;
    const contrast = lowContrast ? 1.11 : tooDark || tooBright ? 1.03 : 1;
    for (let i = 0; i < rgba.length; i += 4) {
      // Same transform for all channels maintains relative color relationships.
      for (let ch = 0; ch < 3; ch++) {
        const channel = rgba[i + ch] ?? 0;
        rgba[i + ch] = clamp(((channel - mean) * contrast + mean) * gain);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob || !blob.size || blob.size > MAX_INPUT) {
      return { file, improved: false, message: "Original photograph analyzed." };
    }
    const prepared = new File([blob], "cropguard-adjusted-photo.jpg", { type: "image/jpeg" });
    return {
      file: prepared,
      improved: true,
      message: tooDark || tooBright || lowContrast
        ? "CropGuard automatically adjusted exposure/contrast before analysis. Blurred or missing detail cannot be reconstructed."
        : "CropGuard automatically optimized the photo size without requiring another capture.",
    };
  } finally {
    image.src = "";
    URL.revokeObjectURL(src);
  }
}
