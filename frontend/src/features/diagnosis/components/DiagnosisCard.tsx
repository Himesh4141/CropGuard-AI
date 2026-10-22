import { useId, useState } from "react";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { t } from "@/i18n";
import { localizeCondition } from "@/i18n/diagnosis";
import { DiagnosisResult } from "@/features/diagnosis/components/DiagnosisResult";
import { screenText as tr, hasScreenTranslation } from "@/i18n/screenText";
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
  const withoutCrop =
    value.includes("___")
      ? value.split("___")[1] ?? value
      : value;

  return withoutCrop
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
  const language = useCropGuardLanguage();
  const [originalEnglish, setOriginalEnglish] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);
  const fullReportId = useId();
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
                ? (originalEnglish ? humanize(diagnosis.predicted_label) : localizeCondition(diagnosis.predicted_label, language).value)
                : tr("Screening result unavailable", language)}
            </h3>

            <p>
              {fieldName}
            </p>
          </div>

          <span className="development-result-badge">
            {realModel
              ? tr("MULTI-CROP ML", language)
              : tr("LEGACY RECORD", language)}
          </span>
        </div>

        <div className="diagnosis-card-meta">
          <span>
            <Gauge size={14} />
            <span title={tr("Raw model score, not a confirmed diagnosis.", language)}>{confidence}</span>
            <small>{tr("Model score — not verified accuracy", language)}</small>
          </span>

          <span>
            <CalendarDays size={14} />
            {Number.isNaN(
              createdAt.getTime(),
            )
              ? diagnosis.created_at
              : createdAt.toLocaleString(language === "en" ? "en-IN" : language === "hi" ? "hi-IN" : "te-IN")}
          </span>
        </div>

        {advisory ? (
          <p className="diagnosis-card-advisory">
            {originalEnglish ? advisory : tr(advisory, language)}
            {language !== "en" && !hasScreenTranslation(advisory, language) && !originalEnglish && (
              <small className="cg-i18n-english-note">{tr("English advisory — translation not reviewed", language)}</small>
            )}
          </p>
        ) : null}
        {language !== "en" && (
          <button className="button ghost" type="button" aria-pressed={originalEnglish} onClick={() => setOriginalEnglish(v => !v)}>
            {originalEnglish ? tr("Hide original English", language) : t("showOriginalEnglish", language)}
          </button>
        )}
        <button
          type="button"
          className="button secondary diagnosis-full-report-toggle"
          aria-expanded={showFullReport}
          aria-controls={fullReportId}
          onClick={() => setShowFullReport(value => !value)}
        >
          {tr(showFullReport ? "Hide full report" : "View full report", language)}
        </button>
        {showFullReport && (
          <section className="diagnosis-history-full" id={fullReportId} aria-label={tr("Full screening report", language)}>
            <DiagnosisResult diagnosis={diagnosis} fieldName={fieldName} />
          </section>
        )}
      </div>
    </article>
  );
}
