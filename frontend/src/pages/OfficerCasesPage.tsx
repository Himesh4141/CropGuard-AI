import {
  Microscope,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  officerApi,
} from "@/features/officer/api/officerApi";


function readableLabel(
  value: string | null,
): string {
  if (!value) {
    return "Pending analysis";
  }

  return value
    .replace(
      "Tomato___",
      "",
    )
    .replaceAll(
      "_",
      " ",
    );
}


export default function OfficerCasesPage() {
  const casesQuery =
    useQuery({
      queryKey: [
        "officer",
        "cases",
      ],
      queryFn:
        officerApi.cases,
    });

  const cases =
    casesQuery.data ?? [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="CASE REVIEW"
        title="Crop-health cases"
        description="Review recent farmer diagnoses alongside the latest stored field-risk signal."
      />

      {casesQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>
            Loading diagnosis cases...
          </p>
        </section>
      )}

      {casesQuery.isError && (
        <section className="panel empty">
          <Microscope size={36} />
          <h2>
            Cases could not be loaded
          </h2>
        </section>
      )}

      {!casesQuery.isLoading
        && !casesQuery.isError
        && cases.length === 0
        && (
          <section className="panel empty">
            <Microscope size={36} />
            <h2>
              No diagnosis cases yet
            </h2>
            <p>
              Farmer disease-screening records will appear here.
            </p>
          </section>
        )}

      <div
        style={{
          display:
            "grid",
          gap:
            "12px",
        }}
      >
        {cases.map(
          (item) => (
            <article
              key={item.diagnosis_id}
              className="panel"
            >
              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  gap:
                    "20px",
                  alignItems:
                    "start",
                }}
              >
                <div>
                  <div className="eyebrow">
                    {item.crop_name}
                  </div>

                  <h2
                    style={{
                      margin:
                        "8px 0",
                    }}
                  >
                    {readableLabel(
                      item.predicted_label,
                    )}
                  </h2>

                  <p
                    style={{
                      color:
                        "var(--muted)",
                      margin:
                        0,
                      lineHeight:
                        1.7,
                    }}
                  >
                    {item.field_name} ·{" "}
                    {item.farm_name} ·{" "}
                    {item.farmer_name}
                    {(item.district || item.state) ? ` · ${[item.district, item.state].filter(Boolean).join(", ")}` : ""}
                  </p>

                  <small
                    style={{
                      color:
                        "var(--muted2)",
                    }}
                  >
                    {item.farmer_email}
                  </small>
                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >
                  <strong>
                    {item.confidence
                      != null
                      ? `${Math.round(
                          item.confidence
                          * 100,
                        )}% confidence`
                      : "No confidence"}
                  </strong>

                  <div
                    style={{
                      color:
                        "var(--muted)",
                      fontSize:
                        "12px",
                      marginTop:
                        "7px",
                      textTransform:
                        "capitalize",
                    }}
                  >
                    Severity:{" "}
                    {item.severity
                      ?? "unknown"}
                  </div>

                  <div
                    style={{
                      color:
                        "var(--muted2)",
                      fontSize:
                        "11px",
                      marginTop:
                        "5px",
                    }}
                  >
                    Risk:{" "}
                    {item.risk_score
                      != null
                      ? `${item.risk_score}/100 ${item.risk_level ?? ""}`
                      : "No stored weather risk"}
                  </div>
                </div>
              </div>
            </article>
          ),
        )}
      </div>
    </div>
  );
}
