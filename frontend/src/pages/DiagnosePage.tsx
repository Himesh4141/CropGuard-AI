import {
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  routes,
} from "@/config/routes";

import {
  diagnosisApi,
} from "@/features/diagnosis/api/diagnosisApi";

import {
  DiagnosisHistory,
} from "@/features/diagnosis/components/DiagnosisHistory";

import {
  DiagnosisResult,
} from "@/features/diagnosis/components/DiagnosisResult";

import {
  ImageUploader,
} from "@/features/diagnosis/components/ImageUploader";

import type {
  Diagnosis,
} from "@/features/diagnosis/types";

import {
  fieldApi,
} from "@/features/fields/api/fieldApi";

import "@/features/diagnosis/diagnosis.css";


export default function DiagnosePage() {
  const [
    latestDiagnosis,
    setLatestDiagnosis,
  ] = useState<Diagnosis | null>(
    null,
  );

  const fieldsQuery =
    useQuery({
      queryKey: [
        "fields",
      ],

      queryFn: () =>
        fieldApi.list(),
    });

  const diagnosesQuery =
    useQuery({
      queryKey: [
        "diagnoses",
      ],

      queryFn:
        diagnosisApi.list,
    });

  const fields =
    fieldsQuery.data ??
    [];

  const diagnoses =
    diagnosesQuery.data ??
    [];

  const latestFieldName =
    latestDiagnosis
      ? fields.find(
          (field) =>
            field.id ===
            latestDiagnosis.field_id,
        )?.name ??
        "Unknown field"
      : "";

  return (
    <div className="page">
      <PageHeader
        eyebrow="CROP-IMAGE SCREENING"
        title="Disease detection"
        description="Upload a crop image against a registered field and exercise the complete screening workflow."
        actions={
          <Link
            to={
              routes.diagnosisHistory
            }
            className="button secondary"
          >
            View history
          </Link>
        }
      />

      {fieldsQuery.isLoading ? (
        <div className="panel">
          Loading crop fields…
        </div>
      ) : fieldsQuery.isError ? (
        <div className="panel error-box">
          Unable to load crop fields.
        </div>
      ) : fields.length === 0 ? (
        <div className="panel empty">
          <h2>
            Add a crop field first
          </h2>

          <p>
            Crop-image screening must
            be attached to one of your
            registered fields.
          </p>

          <Link
            to={routes.fields}
            className="button primary"
          >
            Add field
          </Link>
        </div>
      ) : (
        <>
          <section className="diagnosis-layout">
            <ImageUploader
              fields={fields}
              onComplete={
                setLatestDiagnosis
              }
            />

            {latestDiagnosis ? (
              <DiagnosisResult
                diagnosis={
                  latestDiagnosis
                }
                fieldName={
                  latestFieldName
                }
              />
            ) : (
              <article className="panel diagnosis-result-placeholder">
                <span className="eyebrow">
                  RESULT
                </span>

                <h2>
                  Ready for screening
                </h2>

                <p>
                  Choose a field and
                  upload a crop image.
                  The result will appear
                  here after the backend
                  completes the trained
                  model inference workflow.
                </p>
              </article>
            )}
          </section>

          <section className="diagnosis-recent-section">
            <div className="diagnosis-history-heading">
              <div>
                <span className="eyebrow">
                  RECENT SCREENINGS
                </span>

                <h2>
                  Diagnosis history
                </h2>
              </div>

              <strong>
                {diagnoses.length}
              </strong>
            </div>

            {diagnosesQuery.isLoading ? (
              <div className="panel">
                Loading screening history…
              </div>
            ) : diagnosesQuery.isError ? (
              <div className="panel error-box">
                Unable to load screening history.
              </div>
            ) : (
              <DiagnosisHistory
                diagnoses={
                  diagnoses.slice(
                    0,
                    3,
                  )
                }
                fields={fields}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}