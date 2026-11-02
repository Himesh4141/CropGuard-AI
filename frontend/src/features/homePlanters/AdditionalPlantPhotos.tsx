import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

export function AdditionalPlantPhotos({ files, disabled, onChange }: {
  files: File[]; disabled: boolean; onChange: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const next = files.map(file => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  function add(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)];
    if (next.length > 2) { setError("Use at most two extra photos, for three photos in total."); return; }
    if (next.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      setError("Choose JPG, PNG or WebP photos under 10 MB each."); return;
    }
    setError(""); onChange(next);
  }
  return <div className="hp-extra-photos">
    <strong>More views of this plant (optional)</strong>
    <p className="hp-muted">A leaf, the whole plant, or a flower can help distinguish similar species. Add only photos of the same plant. One photo is enough to start.</p>
    {files.length > 0 && <div className="hp-extra-grid">{files.map((file, index) => <div key={`${file.name}-${index}`}>
      {urls[index] && <img src={urls[index]} alt={`Additional view ${index + 1} of the same plant`} />}
      <button type="button" className="button secondary" disabled={disabled} aria-label={`Remove additional view ${index + 1}`} onClick={() => { setError(""); onChange(files.filter((_, i) => i !== index)); }}><Trash2 size={15} />Remove</button>
    </div>)}</div>}
    <button type="button" className="button secondary" disabled={disabled || files.length >= 2} onClick={() => input.current?.click()}><ImagePlus size={17} />Add another view</button>
    <input ref={input} className="hp-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} aria-label="Add photos of the same plant" onChange={event => { add(event.target.files); event.target.value = ""; }} />
    {error && <p className="hp-error" role="alert">{error}</p>}
  </div>;
}
