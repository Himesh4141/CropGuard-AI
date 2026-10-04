import {
  CalendarDays,
  Gauge,
  Microscope,
} from "lucide-react";

import type {
  Diagnosis,
} from "@/features/diagnosis/types";

import "@/features/diagnosis/diagnosis.css";


interface DiagnosisCardProps {
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


function advisoryText(
  diagnosis: Diagnosis,
): string | null {
  if (!diagnosis.advisory) {
    return null;
  }

  if (
    diagnosis.inference_mode
    === "onnx_model"
  ) {
    return diagnosis.advisory;
  }

  return (
    "Historical simulated record. "
    + "Re-screen the crop with the trained prototype "
    + "before making treatment decisions."
  );
}


export function DiagnosisCard({
  diagnosis,
  fieldName,
}: DiagnosisCardProps) {
  const confidence =
    diagnosis.confidence !== null
      ? `${Math.round(
          diagnosis.confidence
          * 100,
        )}%`
      : "-";

  const createdAt =
    new Date(
      diagnosis.created_at,
    );

  const realModel =
    diagnosis.inference_mode
    === "onnx_model";

  const advisory =
    advisoryText(
      diagnosis,
    );

  return (
    <article className="panel diagnosis-card">
      <div className="diagnosis-card-icon">
        <Microscope size={20} />
      </div>

      <div className="diagnosis-card-content">
        <div className="diagnosis-card-heading">
          <div>
            <h3>
              {diagnosis.predicted_label
                ? humanize(
                    diagnosis.predicted_label,
                  )
                : "Screening result unavailable"}
            </h3>

            <p>
              {fieldName}
            </p>
          </div>

          <span className="development-result-badge">
            {realModel
              ? "ML MODEL"
              : "LEGACY RECORD"}
          </span>
        </div>

        <div className="diagnosis-card-meta">
          <span>
            <Gauge size={14} />
            {confidence}
          </span>

          <span>
            <CalendarDays size={14} />
            {Number.isNaN(
              createdAt.getTime(),
            )
              ? diagnosis.created_at
              : createdAt.toLocaleString()}
          </span>
        </div>

        {advisory ? (
          <p className="diagnosis-card-advisory">
            {advisory}
          </p>
        ) : null}
      </div>
    </article>
  );
}
