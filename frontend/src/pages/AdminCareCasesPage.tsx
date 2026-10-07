import {
  ClipboardList,
  MapPinned,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  careCaseApi,
} from "@/features/careCases/api/careCaseApi";

import "@/features/careCases/careCases.css";


function readableLabel(value: string | null): string {
  if (!value) {
    return "Crop-health condition";
  }

  const withoutCrop = value.includes("___")
    ? value.split("___")[1] ?? value
    : value;

  return withoutCrop
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


export default function AdminCareCasesPage() {
  const casesQuery = useQuery({
    queryKey: ["admin", "care-cases"],
    queryFn: careCaseApi.adminCases,
  });

  const cases = casesQuery.data ?? [];
  const active = cases.filter((item) => item.status !== "resolved");
  const escalated = cases.filter((item) => item.status === "escalated");
  const farmers = new Set(cases.map((item) => item.farmer_id));

  return (
    <div className="page">
      <PageHeader
        eyebrow="GLOBAL CARE OPERATIONS"
        title="Crop-care cases"
        description="See every farmer follow-up case across CropGuard locations while extension officers continue to work inside their assigned service areas."
      />

      <section className="metrics care-case-metrics">
        <article>
          <ClipboardList />
          <span>All cases</span>
          <strong>{cases.length}</strong>
          <small>Global care history</small>
        </article>

        <article>
          <ShieldAlert />
          <span>Active</span>
          <strong>{active.length}</strong>
          <small>Still under monitoring</small>
        </article>

        <article>
          <ShieldAlert />
          <span>Escalated</span>
          <strong>{escalated.length}</strong>
          <small>Priority follow-up</small>
        </article>

        <article>
          <UsersRound />
          <span>Farmers represented</span>
          <strong>{farmers.size}</strong>
          <small>Across all locations</small>
        </article>
      </section>

      {casesQuery.isLoading && (
        <section className="panel empty">
          <div className="spinner" />
          <p>Loading global care cases...</p>
        </section>
      )}

      {casesQuery.isError && (
        <section className="panel empty">
          <ClipboardList size={36} />
          <h2>Care cases could not be loaded</h2>
        </section>
      )}

      {!casesQuery.isLoading
        && !casesQuery.isError
        && cases.length === 0
        && (
          <section className="panel empty">
            <ClipboardList size={36} />
            <h2>No crop-care cases yet</h2>
            <p>Farmer follow-up journeys will appear here as they are created.</p>
          </section>
        )}

      <div className="care-case-admin-table panel">
        {cases.map((careCase) => (
          <div key={careCase.id} className="care-case-admin-row">
            <div>
              <span className={`care-case-status care-case-status--${careCase.status}`}>
                {careCase.status}
              </span>
              <strong>{readableLabel(careCase.current_label)}</strong>
              <small>
                {careCase.crop_name} · {careCase.field_name} · {careCase.farm_name}
              </small>
            </div>

            <div>
              <span>Farmer</span>
              <strong>{careCase.farmer_name}</strong>
              <small>{careCase.farmer_email}</small>
            </div>

            <div>
              <span>Location</span>
              <strong>
                {[careCase.district, careCase.state]
                  .filter(Boolean)
                  .join(", ") || "Not provided"}
              </strong>
              <small className="care-case-location-inline">
                <MapPinned size={13} />
                {careCase.village ?? "Farm location"}
              </small>
            </div>

            <div>
              <span>Trend</span>
              <strong>{careCase.trend}</strong>
              <small>{careCase.priority} priority</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
