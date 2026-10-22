/**
 * Photo precheck is a camera-quality heuristic, NOT a plant identification or
 * disease diagnosis. All thresholds are UX heuristics, not calibrated against
 * a clinical/agronomic gold-standard dataset. Original bytes are not modified.
 */
export type PhotoQualityStatus = "ready" | "review" | "retake";

export interface PhotoQualityResult {
  status: PhotoQualityStatus;
  width: number;
  height: number;
  hints: string[];
  blurMayBePresent: boolean;
}

export interface PhotoMetrics {
  width: number;
  height: number;
  averageLuminance: number;
  darkFraction: number;
  brightFraction: number;
  glareFraction: number;
  focusVariance: number;
}

/** Pure, testable rule engine. Never infer species, disease, or plant count. */
export function evaluatePhotoMetrics(metrics: PhotoMetrics): PhotoQualityResult {
  const hints: string[] = [];
  const minSide = Math.min(metrics.width, metrics.height);
  let status: PhotoQualityStatus = "ready";
  const requestReview = () => { if (status === "ready") status = "review"; };
  const requestRetake = () => { status = "retake"; };

  if (minSide < 240) {
    hints.push("This photo is very small. Move closer and capture a higher-resolution leaf image.");
    requestRetake();
  } else if (minSide < 480) {
    hints.push("The image resolution is limited. Move closer if the leaf spots are hard to see.");
    requestReview();
  }
  if (metrics.averageLuminance < 24 || metrics.darkFraction > 0.95) {
    hints.push("This photo is extremely dark. Move into indirect daylight and try again.");
    requestRetake();
  } else if (metrics.averageLuminance < 55 || metrics.darkFraction > 0.66) {
    hints.push("The image may be too dark to assess reliably. Try softer daylight.");
    requestReview();
  }
  if (metrics.averageLuminance > 249 || metrics.brightFraction > 0.96) {
    hints.push("Most detail appears washed out. Turn away from direct light and retake.");
    requestRetake();
  } else if (metrics.averageLuminance > 222 || metrics.glareFraction > 0.16) {
    hints.push("Strong highlights may hide leaf details. Avoid direct sun or flash glare.");
    requestReview();
  }
  const blurMayBePresent = metrics.focusVariance < 65;
  if (blurMayBePresent) {
    hints.push("Fine details may be soft. Tap the leaf to focus, hold still and retake if needed.");
    requestReview();
  }
  if (!hints.length) hints.push("Basic exposure and detail checks passed. This does not confirm the plant or diagnosis.");
  return { status, width: metrics.width, height: metrics.height, hints, blurMayBePresent };
}

export function measurePhotoPixels(data: Uint8ClampedArray, width: number, height: number): PhotoMetrics {
  if (width < 3 || height < 3 || data.length !== width * height * 4) {
    throw new Error("Invalid image dimensions or pixel data");
  }
  const luma = new Float32Array(width * height);
  let sum = 0;
  let dark = 0;
  let bright = 0;
  let glare = 0;
  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    const r = data[p] ?? 0;
    const g = data[p + 1] ?? 0;
    const b = data[p + 2] ?? 0;
    const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luma[i] = value;
    sum += value;
    if (value < 48) dark++;
    if (value > 240) bright++;
    if (r > 246 && g > 246 && b > 246) glare++;
  }
  let focusSum = 0;
  let focusSquares = 0;
  let focusCount = 0;
  // Laplacian variance is an approximate focus hint; low-texture leaves can
  // appear "soft" even when sharp, so it NEVER hard-rejects a photograph.
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = y * width + x;
      const value = 4 * luma[i]! - luma[i - 1]! - luma[i + 1]! - luma[i - width]! - luma[i + width]!;
      focusSum += value;
      focusSquares += value * value;
      focusCount++;
    }
  }
  const mean = focusCount ? focusSum / focusCount : 0;
  return {
    width,
    height,
    averageLuminance: sum / luma.length,
    darkFraction: dark / luma.length,
    brightFraction: bright / luma.length,
    glareFraction: glare / luma.length,
    focusVariance: Math.max(0, focusSquares / Math.max(focusCount, 1) - mean * mean),
  };
}

/** Browser local-only image decode; no network request and no image retention. */
export async function inspectCropPhoto(file: File): Promise<PhotoQualityResult> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    const scale = Math.min(1, 320 / Math.max(width, height));
    const sampledWidth = Math.max(3, Math.round(width * scale));
    const sampledHeight = Math.max(3, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = sampledWidth;
    canvas.height = sampledHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, 0, 0, sampledWidth, sampledHeight);
    const pixels = ctx.getImageData(0, 0, sampledWidth, sampledHeight);
    const metrics = measurePhotoPixels(pixels.data, sampledWidth, sampledHeight);
    return evaluatePhotoMetrics({ ...metrics, width, height });
  } catch {
    // Some mobile WebViews cannot decode newer image formats. Allow the
    // backend to validate rather than falsely classifying it as a bad leaf.
    return {
      status: "review", width: 0, height: 0, blurMayBePresent: false,
      hints: ["The local photo precheck was unavailable. You can continue, but the server will validate the image."],
    };
  } finally {
    bitmap?.close();
  }
}
