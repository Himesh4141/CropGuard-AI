import { useState } from "react";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { t, type TranslationKey } from "@/i18n";
import { localizeCondition, localizedCareSteps } from "@/i18n/diagnosis";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  HeartPulse,
  Microscope,
  Sprout,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";

import type {
  Diagnosis,
} from "@/features/diagnosis/types";

import { DiagnosisFeedback } from "@/features/reliability/DiagnosisFeedback";
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




export function DiagnosisResult({
  diagnosis,
  fieldName,
}: DiagnosisResultProps) {
  const selectedLanguage = useCropGuardLanguage();
  const [showEnglish, setShowEnglish] = useState(false);
  const language = showEnglish ? "en" : selectedLanguage;
  const tr = (key: TranslationKey) => t(key, language);
  const diagnosisTerm = diagnosis.predicted_label
    ? localizeCondition(diagnosis.predicted_label, language)
    : { value: tr("unavailable"), translated: true };
  const unknownMedicalText = language !== "en" && (
    !diagnosisTerm.translated || Boolean(diagnosis.advisory) || Boolean(diagnosis.rejection_reason) ||
    Boolean(diagnosis.top_predictions?.length)
  );
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
      ? tr("needsReview")
      : successful
        ? tr("screeningCompleted")
        : tr("screeningUnavailable");

  const label = diagnosis.predicted_label ?? "";
  const technicalResult = [
    "unsupported_crop",
    "crop_mismatch",
    "image_quality_check_failed",
    "limited_crop_coverage",
  ].includes(label);

  // A diagnosis response is NOT proof that a care case was created.
  const followUpRecommended = successful && !uncertain && !diagnosis.rejection_reason && !technicalResult && Boolean(label) && !label.toLowerCase().includes("healthy");

  return (
    <article
      className={
        uncertain
          ? "panel diagnosis-result diagnosis-result--uncertain"
          : "panel diagnosis-result"
      }
    >
      {selectedLanguage !== "en" ? <div className="cg-translation-controls">
        <button type="button" className="button secondary" onClick={() => setShowEnglish(value => !value)}>
          {showEnglish ? t("showTranslation", selectedLanguage) : t("showOriginalEnglish", selectedLanguage)}
        </button>
        {unknownMedicalText ? <p role="note">{t("sourceEnglishOnly", selectedLanguage)}</p> : null}
      </div> : null}
      <div className="diagnosis-result-head">
        <div>
          <span className="eyebrow">
            {tr("screenResult")}
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
          : tr("legacySimulation")}
      </div>

      {diagnosis.rejection_reason ? (
        <div className="diagnosis-review-banner">
          <AlertTriangle size={17} />

          <span>
            {diagnosis.rejection_reason}
          </span>
        </div>
      ) : null}

      <div className="cropguard-signal-note" role="status">
        {tr(uncertain || !successful ? "uncertainExplanation" : "modelExplanation")}
      </div>

      <div className="diagnosis-result-grid">
        <div>
          <Microscope size={18} />

          <span>
            {tr(uncertain ? "currentAssessment" : "leadingModelMatch")}
          </span>

          <strong>
            {diagnosis.predicted_label ? (language === "en" ? humanize(diagnosis.predicted_label) : diagnosisTerm.value) : tr("unavailable")}
          </strong>
        </div>

        <div>
          <Gauge size={18} />

          <span>
            {tr("modelScore")}
          </span>

          <strong>
            {confidence !== null
              ? `${confidence}% · ${tr(diagnosis.is_uncertain ? "review" : diagnosis.confidence_level === "high" ? "high" : diagnosis.confidence_level === "moderate" ? "moderate" : diagnosis.confidence_level === "low" ? "low" : "measured")}`
              : "-"}
          </strong>
        </div>

        <div>
          <Sprout size={18} />

          <span>
            {tr("cropConsistency")}
          </span>

          <strong>
            {diagnosis.predicted_crop ??
              tr("notDetermined")}
          </strong>
        </div>
      </div>

      {topPredictions.length > 0 ? (
        <div className="diagnosis-top-predictions">
          <span className="diagnosis-block-label">
            {tr("topModelSignals")}
          </span>

          <div className="diagnosis-prediction-list">
            {topPredictions.slice(0, 3).map(
              (prediction, index) => (
                <div
                  key={`${prediction.raw_label}-${index}`}
                  className="diagnosis-prediction-row"
                >
                  <div>
                    <strong>
                      {localizeCondition(prediction.disease, language).value}
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
            {tr("field")}
        </span>

        <strong>
          {fieldName}
        </strong>
      </div>

      <div className="diagnosis-advisory">
        <span>
            {tr("advisory")}
        </span>

        <p>
          {diagnosis.advisory ??
            tr("noAdvisory")}
        </p>
      </div>


      <section className="diagnosis-care-plan" aria-label={tr("recommendedFollowUp")}>
        <h3>{tr("recommendedFollowUp")}</h3>
        <p>{tr(uncertain ? "uncertainFollowUp" : "cropFollowUp")}</p>
        <ol>{localizedCareSteps(diagnosis, language).map(step => <li key={step}>{step}</li>)}</ol>
      </section>

      {followUpRecommended && (
        <div className="diagnosis-care-case-link">
          <div>
            <HeartPulse size={18} />
            <div>
              <strong>{tr("considerFollowUp")}</strong>
              <span>{tr("caseNotGuaranteed")}</span>
            </div>
          </div>

          <Link
            to={routes.careCases}
            className="button secondary"
          >
            {tr("checkCases")}
          </Link>
        </div>
      )}

      <div className="cropguard-evidence-panel" aria-label={tr("evidenceTitle")}>
        <strong>{tr("evidenceTitle")}</strong>
        <p>{realModel
          ? tr("realModelEvidence") : tr("historicalEvidence")}</p>
        <strong>{tr("confirmTitle")}</strong>
        <p>{tr("confirmDetail")}</p>
        <strong>{tr("actNow")}</strong>
        <p>{tr("actNowDetail")}</p>
      </div>
      <p className="diagnosis-disclaimer">
        {realModel
          ? tr("realModelDisclaimer") : tr("historicDisclaimer")}
      </p>
      <DiagnosisFeedback diagnosis={diagnosis} />
    </article>
  );
}
