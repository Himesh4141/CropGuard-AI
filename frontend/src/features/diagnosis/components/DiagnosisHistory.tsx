import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { screenText as tr } from "@/i18n/screenText";
import {
  Microscope,
} from "lucide-react";

import {
  DiagnosisCard,
} from "@/features/diagnosis/components/DiagnosisCard";

import type {
  Diagnosis,
} from "@/features/diagnosis/types";

import type {
  CropField,
} from "@/features/fields/types";

import "@/features/diagnosis/diagnosis.css";


interface DiagnosisHistoryProps {
  diagnoses: Diagnosis[];
  fields: CropField[];
}


export function DiagnosisHistory({
  diagnoses,
  fields,
}: DiagnosisHistoryProps) {
  const lang = useCropGuardLanguage();
  const fieldNames =
    new Map(
      fields.map(
        (field) => [
          field.id,
          field.name,
        ],
      ),
    );

  if (
    diagnoses.length === 0
  ) {
    return (
      <div className="panel empty">
        <Microscope size={38} />

        <h2>
          {tr("No screening history yet", lang)}
        </h2>

        <p>
          {tr("Completed crop-image screenings will appear here.", lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="diagnosis-history-list">
      {diagnoses.map(
        (diagnosis) => (
          <DiagnosisCard
            key={diagnosis.id}
            diagnosis={diagnosis}
            fieldName={
              fieldNames.get(
                diagnosis.field_id,
              ) ??
              tr("Unknown field", lang)
            }
          />
        ),
      )}
    </div>
  );
}