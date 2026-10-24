import { useEffect, useRef, useState } from "react";
import { Flower2, ImageOff, ExternalLink } from "lucide-react";
import { findLicensedReferencePhotos, type CommonsPhoto } from "./flowerReferencePhotos";
import type { FlowerCare } from "./flowerGardenCatalog";
import "./flowerReferencePhotos.css";

type Group = "species" | "symptoms";
const visualConcerns = [
  "black spot", "powdery mildew", "rust", "aphids", "whiteflies",
  "leaf spot", "mealybugs", "spider mites", "caterpillars", "mosaic",
];

function findExampleConcern(plant: FlowerCare): string | null {
  const risks = plant.commonRisks.toLowerCase();
  return visualConcerns.find(item => risks.includes(item)) ?? null;
}

export default function FlowerReferencePhotos({ plant }: { plant: FlowerCare }) {
  const [group, setGroup] = useState<Group>("species");
  const [photos, setPhotos] = useState<CommonsPhoto[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const concern = findExampleConcern(plant);
  const requestVersion = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    // The user must request remote lookups. No background downloads or photo storage.
    requestVersion.current += 1;
    requestController.current?.abort();
    setPhotos([]);
    setError("");
    setLoading(false);
    setGroup("species");
    return () => { requestVersion.current += 1; requestController.current?.abort(); };
  }, [plant.id]);

  function load(nextGroup: Group) {
    requestVersion.current += 1;
    requestController.current?.abort();
    setGroup(nextGroup);
    setPhotos([]);
    setError("");
    setLoading(true);
    const search = nextGroup === "species"
      ? plant.scientificNames[0] ?? plant.name
      : `${plant.scientificNames[0] ?? plant.name} ${concern ?? "leaf spots"}`;
    const controller = new AbortController();
    // Since this is triggered by a click, concurrent requests are exceptionally rare;
    // track the latest request via token to avoid showing previous plant's photos.
    const token = requestVersion.current;
    requestController.current = controller;
    void findLicensedReferencePhotos(search, controller.signal)
      .then(items => { if (requestVersion.current === token) setPhotos(items.slice(0, 6)); })
      .catch(() => { if (requestVersion.current === token) setError("Reference photos are unavailable right now. Try again when online."); })
      .finally(() => { if (requestVersion.current === token) setLoading(false); });
  }

  return (
    <section className="fg-ref" aria-label={`Reference photos for ${plant.name}`}>
      <div className="fg-ref-header">
        <h4><Flower2 size={17} aria-hidden="true" /> Community photo references</h4>
        <p>Open-license Wikimedia Commons search images; not verified species or disease labels. Compare manually with your own plant.</p>
      </div>
      <div className="fg-ref-actions">
        <button type="button" onClick={() => load("species")} aria-pressed={group === "species"}>Find {plant.name} photos</button>
        {concern && <button type="button" onClick={() => load("symptoms")} aria-pressed={group === "symptoms"}>Find photos mentioning {concern}</button>}
      </div>
      {group === "symptoms" && <p role="status" className="fg-ref-warning">These are keyword-search examples, not diagnosed symptoms. Do not use a photo resemblance to choose pesticides.</p>}
      {loading && <p role="status">Searching licensed photo references…</p>}
      {error && <p role="status"><ImageOff size={16} aria-hidden="true" /> {error}</p>}
      {!loading && !error && photos.length === 0 && <p className="fg-ref-small">Select a photo search above. Some flowers have no suitable openly licensed images.</p>}
      {photos.length > 0 && <div className="fg-ref-grid">
        {photos.map(photo => <figure key={photo.pageUrl}>
          <img src={photo.src} alt={`Unverified community reference search result: ${photo.title}`} loading="lazy" referrerPolicy="no-referrer" />
          <figcaption><a href={photo.pageUrl} target="_blank" rel="noopener noreferrer">View source & license <ExternalLink size={12} aria-hidden="true" /></a>
            <span>{photo.licenseUrl ? <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license} license</a> : photo.license} · {photo.credit}</span></figcaption>
        </figure>)}
      </div>}
      <p className="fg-ref-small">The Wikimedia Commons search requires internet. Images are not training data and are not saved with care reports.</p>
    </section>
  );
}
