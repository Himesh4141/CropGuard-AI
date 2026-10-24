import { screenPhoto as screenPhotoOriginal, type ImageAssessment } from "./imageAssessment";
// Preserve the full public interface of the existing image assessment module.
// Home Planters changes only its import path; all scan call sites stay unchanged.
export * from "./imageAssessment";
export { adaptiveScreenPhoto as screenPhoto };

/**
 * Tries existing screening first. For dim photos, run a second locally-enhanced
 * visibility pass without modifying or uploading the original image.
 * Color/tone observations from an enhanced image are NOT a validated diagnosis.
 * Black frames, motion blur and missing detail cannot be reconstructed.
 */
export async function adaptiveScreenPhoto(original: File): Promise<ImageAssessment> {
  const baseline = await screenPhotoOriginal(original);
  if (baseline.usable || (baseline.brightness !== "dim" && baseline.brightness !== "too dark")) return baseline;
  const enhanced = await makeEnhancedCopy(original);
  if (!enhanced) return {
    ...baseline,
    observations: [...baseline.observations, "Low light: attempted original screening. Capture an additional angle when possible; the original photo remains available."],
  };
  try {
    const second = await screenPhotoOriginal(enhanced);
    if (second.usable) return {
      ...second,
      observations: [...second.observations, "Visibility was enhanced locally before this observation. Enhanced colors are not diagnostic evidence. Your original image was preserved."],
    };
    return {
      ...baseline,
      observations: [...baseline.observations, "A second low-light enhancement pass was attempted, but important detail may still be missing."],
    };
  } catch {
    return baseline;
  }
}

async function makeEnhancedCopy(original: File): Promise<File | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(original);
    // Keep memory manageable on budget Android phones; don't upscale nonexistent detail.
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);
    let total = 0; let sampled = 0;
    const stride = Math.max(1, Math.floor((w * h) / 24000));
    for (let i = 0; i < w * h; i += stride) {
      const k = i * 4;
      total += .2126 * (frame.data[k] ?? 0) + .7152 * (frame.data[k + 1] ?? 0) + .0722 * (frame.data[k + 2] ?? 0);
      sampled++;
    }
    const mean = total / Math.max(sampled, 1);
    if (mean > 140 || mean < 2) return null; // not dim, or virtually no captured signal
    const normalized = Math.max(.015, mean / 255);
    const gamma = Math.max(.42, Math.min(.94, Math.log(.48) / Math.log(normalized)));
    const lut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) lut[i] = Math.min(255, Math.round(255 * Math.pow(i / 255, gamma)));
    for (let i = 0; i < frame.data.length; i += 4) {
      frame.data[i] = lut[frame.data[i] ?? 0] ?? 0;
      frame.data[i + 1] = lut[frame.data[i + 1] ?? 0] ?? 0;
      frame.data[i + 2] = lut[frame.data[i + 2] ?? 0] ?? 0;
    }
    ctx.putImageData(frame, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .9));
    if (!blob) return null;
    return new File([blob], `visibility-pass-${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch { return null; }
  finally { bitmap?.close(); }
}
