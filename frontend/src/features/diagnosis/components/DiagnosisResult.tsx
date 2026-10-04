import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Microscope,
} from "lucide-react";

import type {
  Diagnosis,
} from "@/features/diagnosis/types";

import "@/features/diagnosis/diagnosis.css";


interface DiagnosisResultProps {
  diagnosis: Diagnosis;
  fieldName: string;
}


function humanize(
  value: string,
): string {
  return value
    .replace(
      "Tomato___",
      "",
    )
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


export function DiagnosisResult({
  diagnosis,
  fieldName,
}: DiagnosisResultProps) {
  const confidence =
    diagnosis.confidence !== null
      ? Math.round(
          diagnosis.confidence *
            100,
        )
      : null;

  const successful =
    diagnosis.status ===
      "analyzed";

  const realModel =
    diagnosis.inference_mode ===
      "onnx_model";

  return (
    <article className="panel diagnosis-result">
      <div className="diagnosis-result-head">
        <div>
          <span className="eyebrow">
            SCREENING RESULT
          </span>

          <h2>
            {successful
              ? "Screening completed"
              : "Screening unavailable"}
          </h2>
        </div>

        {successful ? (
          <CheckCircle2 size={28} />
        ) : (
          <AlertTriangle size={28} />
        )}
      </div>

      <div className="development-result-badge">
        {realModel
          ? "TRAINED PROTOTYPE MODEL"
          : "LEGACY DEVELOPMENT SIMULATION"}
      </div>

      <div className="diagnosis-result-grid">
        <div>
          <Microscope size={18} />

          <span>
            {realModel
              ? "Predicted label"
              : "Simulated label"}
          </span>

          <strong>
            {diagnosis.predicted_label
              ? humanize(
                  diagnosis.predicted_label,
                )
              : "Unavailable"}
          </strong>
        </div>

        <div>
          <Gauge size={18} />

          <span>
            {realModel
              ? "Model confidence"
              : "Simulated confidence"}
          </span>

          <strong>
            {confidence !== null
              ? `${confidence}%`
              : "-"}
          </strong>
        </div>

        <div>
          <AlertTriangle size={18} />

          <span>
            Severity
          </span>

          <strong>
            {diagnosis.severity
              ? humanize(
                  diagnosis.severity,
                )
              : "-"}
          </strong>
        </div>
      </div>

      <div className="diagnosis-context">
        <span>
          Field
        </span>

        <strong>
          {fieldName}
        </strong>
      </div>

      <div className="diagnosis-advisory">
        <span>
          Advisory
        </span>

        <p>
          {diagnosis.advisory ??
            "No advisory is available for this screening."}
        </p>
      </div>

      <p className="diagnosis-disclaimer">
        {realModel
          ? (
            "This result comes from a trained prototype model based on "
            + "PlantVillage tomato leaf images. It is decision-support only, "
            + "not a field-validated agronomic diagnosis. Confirm important "
            + "treatment decisions with local agronomic guidance."
          )
          : (
            "This historical result was produced by the earlier development "
            + "simulator and should not be interpreted as a trained-model prediction."
          )}
      </p>
    </article>
  );
}