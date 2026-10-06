import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Microscope,
  Sprout,
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
  const withoutCrop =
    value.includes("___")
      ? value.split("___")[1] ?? value
      : value;

  return withoutCrop
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


function confidenceTone(
  diagnosis: Diagnosis,
): string {
  if (diagnosis.is_uncertain) {
    return "Needs review";
  }

  switch (
    diagnosis.confidence_level
  ) {
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Low";
    default:
      return "Measured";
  }
}


export function DiagnosisResult({
  diagnosis,
  fieldName,
}: DiagnosisResultProps) {
  const confidence =
    diagnosis.confidence !== null
      ? Math.round(
          diagnosis.confidence * 100,
        )
      : null;

  const successful =
    diagnosis.status ===
      "analyzed";

  const realModel =
    diagnosis.inference_mode ===
      "onnx_model";

  const uncertain =
    diagnosis.is_uncertain ?? false;

  const topPredictions =
    diagnosis.top_predictions ?? [];

  const headline =
    uncertain
      ? "Screening needs review"
      : successful
        ? "Screening completed"
        : "Screening unavailable";

  return (
    <article
      className={
        uncertain
          ? "panel diagnosis-result diagnosis-result--uncertain"
          : "panel diagnosis-result"
      }
    >
      <div className="diagnosis-result-head">
        <div>
          <span className="eyebrow">
            SCREENING RESULT
          </span>

          <h2>
            {headline}
          </h2>
        </div>

        {successful &&
        !uncertain ? (
          <CheckCircle2 size={28} />
        ) : (
          <AlertTriangle size={28} />
        )}
      </div>

      <div className="development-result-badge">
        {realModel
          ? `${diagnosis.model_display_name} · ${diagnosis.model_version ?? "v1"}`
          : "LEGACY DEVELOPMENT SIMULATION"}
      </div>

      {diagnosis.rejection_reason ? (
        <div className="diagnosis-review-banner">
          <AlertTriangle size={17} />

          <span>
            {diagnosis.rejection_reason}
          </span>
        </div>
      ) : null}

      <div className="diagnosis-result-grid">
        <div>
          <Microscope size={18} />

          <span>
            {uncertain
              ? "Current assessment"
              : "Likely diagnosis"}
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
            Calibrated confidence
          </span>

          <strong>
            {confidence !== null
              ? `${confidence}% · ${confidenceTone(diagnosis)}`
              : "-"}
          </strong>
        </div>

        <div>
          <Sprout size={18} />

          <span>
            Crop consistency
          </span>

          <strong>
            {diagnosis.predicted_crop ??
              "Not determined"}
          </strong>
        </div>
      </div>

      {topPredictions.length > 0 ? (
        <div className="diagnosis-top-predictions">
          <span className="diagnosis-block-label">
            TOP MODEL SIGNALS
          </span>

          <div className="diagnosis-prediction-list">
            {topPredictions.map(
              (prediction, index) => (
                <div
                  key={`${prediction.raw_label}-${index}`}
                  className="diagnosis-prediction-row"
                >
                  <div>
                    <strong>
                      {prediction.disease}
                    </strong>

                    <span>
                      {prediction.crop}
                    </span>
                  </div>

                  <strong>
                    {Math.round(
                      prediction.confidence * 100,
                    )}
                    %
                  </strong>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

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
            "CropGuard Multi-Crop v1 was trained on 54,305 PlantVillage "
            + "images across 38 classes and 14 crops. Its held-out PlantVillage "
            + "test accuracy was 99.57% (macro-F1 99.41%), but those controlled "
            + "images do not establish equivalent accuracy in real farms. "
            + "Low-confidence, mismatched and insufficient-coverage cases are "
            + "flagged instead of treated as certain diagnoses."
          )
          : (
            "This historical result was produced by the earlier development "
            + "simulator and should not be interpreted as a trained-model prediction."
          )}
      </p>
    </article>
  );
}
