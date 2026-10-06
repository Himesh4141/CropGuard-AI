import {
  AlertTriangle,
  Microscope,
  Sprout,
  Stethoscope,
  Users,
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


export default function OfficerDashboardPage() {
  const summaryQuery =
    useQuery({
      queryKey: [
        "officer",
        "summary",
      ],
      queryFn:
        officerApi.summary,
    });

  const riskQuery =
    useQuery({
      queryKey: [
        "officer",
        "high-risk-fields",
      ],
      queryFn:
        officerApi.highRiskFields,
    });

  const summary =
    summaryQuery.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow="EXTENSION INTELLIGENCE"
        title="Officer dashboard"
        description="Prioritize farmer support using crop diagnoses, weather risk and field-level signals."
      />

      {summaryQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>
            Loading field network...
          </p>
        </section>
      )}

      {summary && (
        <>
          <section className="metrics">
            <article>
              <Users />
              <span>
                Farmers
              </span>
              <strong>
                {summary.farmers}
              </strong>
              <small>
                Registered farmer accounts
              </small>
            </article>

            <article>
              <Sprout />
              <span>
                Fields
              </span>
              <strong>
                {summary.fields}
              </strong>
              <small>
                Across {summary.farms} farms
              </small>
            </article>

            <article>
              <Microscope />
              <span>
                Diagnoses
              </span>
              <strong>
                {summary.diagnoses}
              </strong>
              <small>
                Crop screening records
              </small>
            </article>

            <article>
              <AlertTriangle />
              <span>
                High-risk fields
              </span>
              <strong>
                {summary.high_risk_fields}
              </strong>
              <small>
                {summary.unread_alerts} unread alerts
              </small>
            </article>
          </section>

          <section className="panel">
            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap:
                  "10px",
                marginBottom:
                  "18px",
              }}
            >
              <Stethoscope
                size={20}
              />
              <h2
                style={{
                  margin:
                    0,
                }}
              >
                High-risk field queue
              </h2>
            </div>

            {riskQuery.isLoading && (
              <p
                style={{
                  color:
                    "var(--muted)",
                }}
              >
                Checking current field risk...
              </p>
            )}

            {riskQuery.data?.length === 0 && (
              <div className="empty">
                <AlertTriangle
                  size={34}
                />
                <h2>
                  No high-risk fields
                </h2>
                <p>
                  Current stored weather snapshots do not contain High or Critical field risk.
                </p>
              </div>
            )}

            <div
              style={{
                display:
                  "grid",
                gap:
                  "10px",
              }}
            >
              {riskQuery.data?.map(
                (field) => (
                  <div
                    key={field.field_id}
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "20px",
                      alignItems:
                        "center",
                      padding:
                        "14px",
                      border:
                        "1px solid var(--border)",
                      borderRadius:
                        "12px",
                    }}
                  >
                    <div>
                      <strong>
                        {field.field_name}
                      </strong>
                      <div
                        style={{
                          color:
                            "var(--muted)",
                          fontSize:
                            "12px",
                          marginTop:
                            "5px",
                        }}
                      >
                        {field.farm_name} ·{" "}
                        {field.farmer_name} ·{" "}
                        {field.crop_name}
                      </div>
                    </div>

                    <strong
                      style={{
                        color:
                          "var(--primary)",
                      }}
                    >
                      {field.risk_score}/100{" "}
                      {field.risk_level.toUpperCase()}
                    </strong>
                  </div>
                ),
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
