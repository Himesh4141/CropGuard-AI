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
        eyebrow="SCREENING RECORDS"
        title="Diagnosis history"
        description="Review crop-image screening records saved against your fields."
      />

      {diagnosesQuery.isLoading ||
      fieldsQuery.isLoading ? (
        <div className="panel">
          Loading diagnosis history…
        </div>
      ) : diagnosesQuery.isError ||
        fieldsQuery.isError ? (
        <div className="panel error-box">
          Unable to load diagnosis history.
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