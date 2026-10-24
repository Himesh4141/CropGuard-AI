/**
 * Local visual-assessment engine. This intentionally analyzes vegetation and
 * photo quality, NOT species or plant pathogen identity. The limited Tulsi
 * dataset failed external-readiness thresholds; claiming an AI disease
 * diagnosis from these heuristic observations would be misleading.
 */
export type ImageAssessment = {
  version: 3;
  usable: boolean;
  quality: "good enough for observations" | "retake recommended";
  brightness: "too dark" | "dim" | "adequate" | "very bright";
  sharpness: "possibly blurry" | "adequate";
  vegetationCoverage: number;
  colorRegions: { green: number; yellow: number; brown: number; pale: number };
  signals: Array<"yellow_tones" | "brown_tones" | "pale_tones">;
  observations: string[];
  retakeReasons: string[];
};

export const IMAGE_EDGE = 256;
const MAX_PIXELS = IMAGE_EDGE * IMAGE_EDGE;

export function assessPixels(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
  visibleArea?: { left: number; top: number; width: number; height: number },
): ImageAssessment {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 || width * height > MAX_PIXELS || rgba.length < width * height * 4) {
    throw new Error("Unsupported image buffer.");
  }
  const left = Math.max(0, Math.floor(visibleArea?.left ?? 0));
  const top = Math.max(0, Math.floor(visibleArea?.top ?? 0));
  const right = Math.min(width, left + Math.floor(visibleArea?.width ?? width));
  const bottom = Math.min(height, top + Math.floor(visibleArea?.height ?? height));
  if (right - left < 8 || bottom - top < 8) throw new Error("Image is too small to assess.");

  const count = width * height;
  const colors = new Uint8Array(count);
  const luminosity = new Float32Array(count);
  const visible = new Uint8Array(count);
  let validCount = 0, totalLight = 0, greenCount = 0, saturatedCount = 0;
  let darkPixels = 0, highlightPixels = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = y * width + x;
      const k = i * 4;
      if ((rgba[k + 3] ?? 0) < 224) continue;
      visible[i] = 1;
      validCount++;
      const r = (rgba[k] ?? 0) / 255, g = (rgba[k + 1] ?? 0) / 255, b = (rgba[k + 2] ?? 0) / 255;
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      totalLight += light;
      luminosity[i] = light;
      if (light < 0.12) darkPixels++;
      if (light > 0.96) highlightPixels++;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), delta = mx - mn;
      const saturation = mx === 0 ? 0 : delta / mx;
      let hue = 0;
      if (delta > 0.00001) {
        if (mx === r) hue = 60 * (((g - b) / delta) % 6);
        else if (mx === g) hue = 60 * ((b - r) / delta + 2);
        else hue = 60 * ((r - g) / delta + 4);
        if (hue < 0) hue += 360;
      }
      if (saturation >= 0.2) saturatedCount++;
      if (hue >= 65 && hue <= 178 && saturation >= 0.20 && mx >= 0.15 && mx <= 0.98) {
        colors[i] = 1;
        greenCount++;
      } else if (hue >= 35 && hue < 65 && saturation >= 0.24 && mx >= 0.31) {
        colors[i] = 2;
      } else if ((hue < 40 || hue > 350) && saturation >= 0.27 && mx >= 0.22 && mx < 0.82 && g <= r * 0.89) {
        colors[i] = 3;
      } else if (mx > 0.64 && saturation <= 0.16) {
        colors[i] = 4;
      }
    }
  }
  if (!validCount) throw new Error("No visible photo pixels found.");

  // Dilate green seed by up to 18 pixels: avoids counting distant brown soil or
  // yellow walls as damaged foliage. This is *not* leaf segmentation.
  let nearby = new Uint8Array(count);
  for (let i = 0; i < count; i++) if (colors[i] === 1) nearby[i] = 1;
  for (let step = 0; step < 18; step++) {
    const expanded = nearby.slice();
    for (let y = top + 1; y < bottom - 1; y++) {
      for (let x = left + 1; x < right - 1; x++) {
        const i = y * width + x;
        if (!visible[i] || nearby[i] || colors[i] === 0) continue;
        if (nearby[i - 1] || nearby[i + 1] || nearby[i - width] || nearby[i + width]) expanded[i] = 1;
      }
    }
    nearby = expanded;
  }
  let candidate = 0, green = 0, yellow = 0, brown = 0, pale = 0;
  for (let i = 0; i < count; i++) {
    if (!visible[i] || !nearby[i]) continue;
    if (colors[i] === 0) continue;
    candidate++;
    if (colors[i] === 1) green++;
    if (colors[i] === 2) yellow++;
    if (colors[i] === 3) brown++;
    if (colors[i] === 4) pale++;
  }
  // Measure local edges only inside the visible image, not padded borders.
  let gradients = 0, pairs = 0;
  for (let y = top + 2; y < bottom - 2; y++) {
    for (let x = left + 2; x < right - 2; x++) {
      const i = y * width + x;
      gradients += Math.abs(
        4 * (luminosity[i] ?? 0) -
        (luminosity[i - width] ?? 0) -
        (luminosity[i + width] ?? 0) -
        (luminosity[i - 1] ?? 0) -
        (luminosity[i + 1] ?? 0),
      );
      pairs++;
    }
  }
  const meanLight = totalLight / validCount;
  const edgeMetric = gradients / Math.max(pairs, 1);
  const brightness: ImageAssessment["brightness"] = meanLight < 0.16 ? "too dark" : meanLight < 0.31 ? "dim" : meanLight > 0.88 ? "very bright" : "adequate";
  const sharpness: ImageAssessment["sharpness"] = edgeMetric < 0.021 ? "possibly blurry" : "adequate";
  const vegetationCoverage = greenCount / validCount;
  const regionTotal = Math.max(candidate, 1);
  const colorRegions = {
    green: green / regionTotal,
    yellow: yellow / regionTotal,
    brown: brown / regionTotal,
    pale: pale / regionTotal,
  };
  const retakeReasons: string[] = [];
  if (brightness === "too dark" || brightness === "dim") retakeReasons.push("Lighting is limited. Exposure can be adjusted automatically; check uncertain colors on actual leaves.");
  if (brightness === "very bright" || highlightPixels / validCount > 0.29) retakeReasons.push("Some highlights may hide leaf details. Avoid flash glare when practical.");
  if (sharpness === "possibly blurry") retakeReasons.push("Fine lesion details may be unavailable due to blur; available color observations are still shown.");
  if (vegetationCoverage < 0.06 || greenCount < 100) retakeReasons.push("Little green foliage was detected; brown or variegated leaves can still be real leaves.");
  if (darkPixels / validCount > 0.60) retakeReasons.push("Shadows reduce visible detail. Brightness adjustment may help without restoring lost detail.");
  if (saturatedCount / validCount < 0.04) retakeReasons.push("Limited color information; use observed symptoms before taking action.");
  // Advisory only: imperfect low-cost phone photos still provide observable
  // color patterns; never make brightness or edge sharpness a hard gate.
  const usable = validCount >= 64 && vegetationCoverage >= 0.06 &&
    brightness !== "too dark" && darkPixels / validCount <= 0.60 && highlightPixels / validCount <= 0.60;
  const signals: ImageAssessment["signals"] = [];
  const observations: string[] = [];
  // Signals are possible nearby colors, NEVER disease conclusions. Ratios are pixels in a
  // green-adjacent region; not measured disease severity or leaf area.
  if (usable) {
    if (yellow >= 32 && colorRegions.yellow >= 0.085) {
      signals.push("yellow_tones");
      observations.push("Yellow-toned areas appear near green foliage. Natural variegation, lighting and true yellowing can look alike; inspect the leaves.");
    }
    if (brown >= 24 && colorRegions.brown >= 0.07) {
      signals.push("brown_tones");
      observations.push("Brown-toned regions appear near green foliage. Confirm that these are leaf spots rather than stems, pots, or shadows.");
    }
    if (pale >= 48 && colorRegions.pale >= 0.16) {
      signals.push("pale_tones");
      observations.push("Pale regions appear close to foliage. Lighting, dust, and a coating can look similar.");
    }
    if (!signals.length) observations.push("No strong color-pattern signals detected near green foliage. This does not establish that a plant is healthy.");
  } else {
    observations.push("The image could not be screened reliably; general plant care guidance is still available.");
  }
  return {
    version: 3,
    usable,
    quality: usable ? "good enough for observations" : "retake recommended",
    brightness,
    sharpness,
    vegetationCoverage,
    colorRegions,
    signals,
    observations,
    retakeReasons,
  };
}

/** Screen one image entirely on device; no server calls or image retention. */
export async function screenPhoto(file: File): Promise<ImageAssessment> {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size === 0 || file.size > 10 * 1024 * 1024) {
    throw new Error("Select a JPG, PNG or WebP image under 10 MB.");
  }
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Cannot decode this photograph."));
      image.src = objectUrl;
    });
    if (image.naturalWidth < 96 || image.naturalHeight < 96) {
      throw new Error("Use a larger photograph (at least 96 × 96 pixels).");
    }
    const canvas = document.createElement("canvas");
    canvas.width = IMAGE_EDGE;
    canvas.height = IMAGE_EDGE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    const ratio = Math.min(IMAGE_EDGE / image.naturalWidth, IMAGE_EDGE / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const left = Math.floor((IMAGE_EDGE - width) / 2);
    const top = Math.floor((IMAGE_EDGE - height) / 2);
    context.clearRect(0, 0, IMAGE_EDGE, IMAGE_EDGE);
    context.drawImage(image, left, top, width, height);
    const result = context.getImageData(0, 0, IMAGE_EDGE, IMAGE_EDGE);
    return assessPixels(IMAGE_EDGE, IMAGE_EDGE, result.data, { left, top, width, height });
  } finally {
    image.src = "";
    URL.revokeObjectURL(objectUrl);
  }
}
