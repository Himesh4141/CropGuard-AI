import {
  AlertTriangle,
  Microscope,
  Sprout,
  Stethoscope,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/common/PageHeader";
import { officerApi } from "@/features/officer/api/officerApi";

export default function OfficerDashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["officer", "summary"],
    queryFn: officerApi.summary,
  });

  const riskQuery = useQuery({
    queryKey: ["officer", "high-risk-fields"],
    queryFn: officerApi.highRiskFields,
  });

  const summary = summaryQuery.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow="EXTENSION INTELLIGENCE"
        title="Officer dashboard"
        description="Prioritize farmer support using crop diagnoses, weather risk and field-level signals."
      />

      {summaryQuery.isLoading ? (
        <section className="panel empty">
          <div className="spinner" />
          <p>Loading field network...</p>
        </section>
      ) : null}

      {summary ? (
        <>
          <section className="metrics">
            <article>
              <Users />
              <span>Farmers</span>
              <strong>{summary.farmers}</strong>
              <small>Registered farmer accounts</small>
            </article>

            <article>
              <Sprout />
              <span>Fields</span>
              <strong>{summary.fields}</strong>
              <small>Across {summary.farms} farms</small>
            </article>

            <article>
              <Microscope />
              <span>Diagnoses</span>
              <strong>{summary.diagnoses}</strong>
              <small>Crop screening records</small>
            </article>

            <article>
              <AlertTriangle />
              <span>High-risk fields</span>
              <strong>{summary.high_risk_fields}</strong>
              <small>{summary.unread_alerts} unread alerts</small>
            </article>
          </section>

          <section className="panel">
            <div className="panel-title-row">
              <Stethoscope size={20} />
              <h2>High-risk field queue</h2>
            </div>

            {riskQuery.isLoading ? (
              <p style={{ color: "var(--muted)" }}>
                Checking current field risk...
              </p>
            ) : null}

            {riskQuery.data?.length === 0 ? (
              <div className="empty">
                <AlertTriangle size={34} />
                <h2>No high-risk fields</h2>
                <p>
                  Current stored weather snapshots do not contain High or
                  Critical field risk.
                </p>
              </div>
            ) : null}

            <div className="data-list">
              {riskQuery.data?.map((field) => (
                <div key={field.field_id} className="data-row">
                  <div className="data-row-copy">
                    <strong>{field.field_name}</strong>
                    <span>
                      {field.farm_name} · {field.farmer_name} · {field.crop_name}
                    </span>
                  </div>
                  <strong className="data-row-value">
                    {field.risk_score}/100 {field.risk_level.toUpperCase()}
                  </strong>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
