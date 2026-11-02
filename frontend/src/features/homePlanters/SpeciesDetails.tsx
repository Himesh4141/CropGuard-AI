import type { PlantIdentity } from "./plantIdentity";

export function SpeciesDetails({ identity }: { identity: PlantIdentity }) {
  if (!identity.scientific_name || identity.status === "unknown") return null;
  const alternatives = (identity.candidates ?? []).filter(candidate => candidate.scientific_name !== identity.scientific_name).slice(0, 3);
  return <div className="hp-species-details">
    <h3>{identity.status === "identified" ? "About this species suggestion" : "About the possible species"}</h3>
    <dl>
      <div><dt>Scientific name</dt><dd><i>{identity.scientific_name}</i></dd></div>
      {identity.genus && <div><dt>Genus</dt><dd>{identity.genus}</dd></div>}
      {identity.family && <div><dt>Plant family</dt><dd>{identity.family}</dd></div>}
      {Boolean(identity.common_names?.length) && <div><dt>Common names</dt><dd>{identity.common_names?.join(", ")}</dd></div>}
    </dl>
    {alternatives.length > 0 && <details><summary>Other possible matches</summary><ul>{alternatives.map(candidate => <li key={candidate.scientific_name}>
      <strong>{candidate.common_name || candidate.scientific_name}</strong>{candidate.common_name && <> — <i>{candidate.scientific_name}</i></>} · {Math.round(candidate.confidence * 100)}% matching score
    </li>)}</ul><p>Compare the whole plant, leaf shape and any flowers. These alternatives do not confirm a species or disease.</p></details>}
    <p className="hp-muted">Taxonomy comes from Pl@ntNet's matching species. Crop and flower care guides remain separate from identification confidence.</p>
  </div>;
}
