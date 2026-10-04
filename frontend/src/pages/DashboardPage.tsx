import {
  AlertTriangle,
  CloudSun,
  Leaf,
  Microscope,
  Sprout,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  Navigate,
} from "react-router-dom";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  routes,
} from "@/config/routes";

import {
  alertApi,
} from "@/features/alerts/api/alertApi";

import {
  useAuthStore,
} from "@/features/auth/store";

import {
  diagnosisApi,
} from "@/features/diagnosis/api/diagnosisApi";

import {
  farmApi,
} from "@/features/farms/api/farmApi";

import {
  fieldApi,
} from "@/features/fields/api/fieldApi";


export default function DashboardPage() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  if (
    user?.role === "admin"
  ) {
    return (
      <Navigate
        to={routes.admin}
        replace
      />
    );
  }

  if (
    user?.role
    === "extension_officer"
  ) {
    return (
      <Navigate
        to={routes.officer}
        replace
      />
    );
  }

  return (
    <FarmerDashboard />
  );
}


function FarmerDashboard() {
  const farmsQuery =
    useQuery({
      queryKey: [
        "farms",
      ],
      queryFn:
        farmApi.list,
    });

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

  const alertsQuery =
    useQuery({
      queryKey: [
        "alerts",
      ],
      queryFn:
        alertApi.list,
    });

  const farms =
    farmsQuery.data
    ?? [];

  const fields =
    fieldsQuery.data
    ?? [];

  const diagnoses =
    diagnosesQuery.data
    ?? [];

  const alerts =
    alertsQuery.data
    ?? [];

  const unreadAlerts =
    alerts.filter(
      (alert) =>
        !alert.is_read,
    );

  const highPriorityAlerts =
    alerts.filter(
      (alert) =>
        alert.risk_level
          .toLowerCase()
        === "high"
        || alert.risk_level
          .toLowerCase()
        === "critical",
    );

  const fieldSummary =
    fields.length === 1
      ? "1 crop field is ready for monitoring and diagnosis workflows."
      : `${fields.length} crop fields are ready for monitoring and diagnosis workflows.`;

  return (
    <div className="page">
      <PageHeader
        eyebrow="FARM INTELLIGENCE"
        title="Crop health dashboard"
        description="Monitor your fields, disease activity and farm-level risk from one place."
      />

      <section className="metrics">
        <article>
          <Leaf />

          <span>
            Active fields
          </span>

          <strong>
            {fields.length}
          </strong>

          <small>
            Fields under monitoring
          </small>
        </article>

        <article>
          <Microscope />

          <span>
            Diagnoses
          </span>

          <strong>
            {diagnoses.length}
          </strong>

          <small>
            Saved screening records
          </small>
        </article>

        <article>
          <CloudSun />

          <span>
            High-priority signals
          </span>

          <strong>
            {highPriorityAlerts.length}
          </strong>

          <small>
            High or critical alerts
          </small>
        </article>

        <article>
          <AlertTriangle />

          <span>
            Unread alerts
          </span>

          <strong>
            {unreadAlerts.length}
          </strong>

          <small>
            {alerts.length} total alerts
          </small>
        </article>
      </section>

      <section className="two-col">
        <div className="panel empty">
          <Sprout size={36} />

          <h2>
            {farms.length > 0
              ? `${farms.length} farm${farms.length === 1 ? "" : "s"} connected`
              : "Start with your first farm"}
          </h2>

          <p>
            {fields.length > 0
              ? fieldSummary
              : "Add farm and field details to unlock monitoring and diagnosis workflows."}
          </p>
        </div>

        <div className="panel empty">
          <AlertTriangle size={36} />

          <h2>
            {unreadAlerts.length > 0
              ? `${unreadAlerts.length} alert${unreadAlerts.length === 1 ? "" : "s"} need attention`
              : "No unread alerts"}
          </h2>

          <p>
            {unreadAlerts.length > 0
              ? "Open Alerts to review current disease and weather-driven signals."
              : "CropGuard will surface significant diagnosis and weather-risk events here."}
          </p>
        </div>
      </section>
    </div>
  );
}
