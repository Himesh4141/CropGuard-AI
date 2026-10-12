/** Per-account device-only preferences. Never store tokens/passwords here. */
export type ProfilePreferences = {
  compactView: boolean;
  reduceMotion: boolean;
  autoSaveScans: boolean;
};
export const defaultPreferences: ProfilePreferences = {
  compactView: false, reduceMotion: false, autoSaveScans: false,
};
const key = (id: string) => `cropguard:user:${id}:preferences-v1`;
const avatarKey = (id: string) => `cropguard:user:${id}:avatar-v1`;

export function loadPreferences(id: string): ProfilePreferences {
  try {
    const obj: unknown = JSON.parse(localStorage.getItem(key(id)) || "null");
    if (!obj || typeof obj !== "object") return { ...defaultPreferences };
    const record = obj as Record<string, unknown>;
    return {
      compactView: record.compactView === true,
      reduceMotion: record.reduceMotion === true,
      autoSaveScans: record.autoSaveScans === true,
    };
  } catch { return { ...defaultPreferences }; }
}
export function savePreferences(id: string, preferences: ProfilePreferences): void {
  try { localStorage.setItem(key(id), JSON.stringify(preferences)); } catch { /* storage disabled */ }
  applyPreferences(preferences);
  window.dispatchEvent(new CustomEvent("cropguard:profile-preferences"));
}
export function applyPreferences(prefs: ProfilePreferences): void {
  document.documentElement.classList.toggle("cg-compact-view", prefs.compactView);
  document.documentElement.classList.toggle("cg-reduce-motion", prefs.reduceMotion);
}
export function loadAvatar(id: string): string | null {
  try {
    const data = localStorage.getItem(avatarKey(id));
    return data && /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(data) ? data : null;
  } catch { return null; }
}
export function saveAvatar(id: string, image: string | null): void {
  if (image && (image.length > 180_000 || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(image))) {
    throw new Error("Avatar must be a small valid image.");
  }
  if (image) localStorage.setItem(avatarKey(id), image);
  else localStorage.removeItem(avatarKey(id));
  window.dispatchEvent(new CustomEvent("cropguard:profile-preferences"));
}
export function clearLocalProfile(id: string): void {
  try { localStorage.removeItem(key(id)); localStorage.removeItem(avatarKey(id)); } catch { /* storage disabled */ }
  applyPreferences(defaultPreferences);
  window.dispatchEvent(new CustomEvent("cropguard:profile-preferences"));
}

/** Scale a photo down before persisting; do not store original/exif metadata. */
export async function prepareAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) throw new Error("Select an image under 3 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processor unavailable");
    const crop = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth-crop)/2, (img.naturalHeight-crop)/2, crop, crop, 0, 0, 160, 160);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally { URL.revokeObjectURL(url); }
}
