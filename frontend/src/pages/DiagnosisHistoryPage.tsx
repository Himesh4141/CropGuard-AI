import { screenText as tr } from "@/i18n/screenText";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { t } from "@/i18n";
import {
  useQuery,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  diagnosisApi,
} from "@/features/diagnosis/api/diagnosisApi";

import {
  DiagnosisHistory,
} from "@/features/diagnosis/components/DiagnosisHistory";

import {
  fieldApi,
} from "@/features/fields/api/fieldApi";

import "@/features/diagnosis/diagnosis.css";


export default function DiagnosisHistoryPage() {
  const language = useCropGuardLanguage();
  const diagnosesQuery =
    useQuery({
      queryKey: [
        "diagnoses",
      ],

      queryFn:
        diagnosisApi.list,
    });

  const fieldsQuery =
    useQuery({
      queryKey: [
        "fields",
      ],

      queryFn: () =>
        fieldApi.list(),
    });

  return (
    <div className="page">
      <PageHeader
        eyebrow={tr("SCREENING RECORDS", language)}
        title={t("diagnosisHistory", language)}
        description={tr("Review crop-image screening records saved against your fields.", language)}
      />

      {diagnosesQuery.isLoading ||
      fieldsQuery.isLoading ? (
        <div className="panel">
          {t("loadingHistory", language)}
        </div>
      ) : diagnosesQuery.isError ||
        fieldsQuery.isError ? (
        <div className="panel error-box">
          {t("historyUnavailable", language)}
        </div>
      ) : (
        <DiagnosisHistory
          diagnoses={
            diagnosesQuery.data ??
            []
          }
          fields={
            fieldsQuery.data ??
            []
          }
        />
      )}
    </div>
  );
}