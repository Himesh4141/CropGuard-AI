import {
  AlertTriangle,
  Bell,
  CloudSun,
  Leaf,
  Microscope,
  Sprout,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  Link,
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
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

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

  const firstName =
    user?.full_name
      .trim()
      .split(/\s+/)[0]
    ?? "Farmer";

  const fieldSummary =
    fields.length === 1
      ? "1 crop field is ready for monitoring and diagnosis workflows."
      : `${fields.length} crop fields are ready for monitoring and diagnosis workflows.`;

  return (
    <div className="page">
      <PageHeader
        eyebrow="FIELD OVERVIEW"
        title="Crop health, at a glance"
        description="A calm view of your fields, screenings, alerts and environmental signals."
      />

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">
            Good to see you, {firstName}
          </span>

          <h2>
            Your farm intelligence is ready.
          </h2>

          <p>
            Screen an affected leaf, check weather pressure or review
            alerts without jumping between tools. CropGuard keeps the
            important signals together.
          </p>
        </div>

        <div className="dashboard-quick-actions">
          <Link
            className="quick-action"
            to={routes.diagnose}
          >
            <Microscope size={19} />
            <span>
              Screen leaf
            </span>
          </Link>

          <Link
            className="quick-action"
            to={routes.weather}
          >
            <CloudSun size={19} />
            <span>
              Check risk
            </span>
          </Link>

          <Link
            className="quick-action"
            to={routes.farms}
          >
            <Sprout size={19} />
            <span>
              Manage farms
            </span>
          </Link>
        </div>
      </section>

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
            Priority signals
          </span>

          <strong>
            {highPriorityAlerts.length}
          </strong>

          <small>
            High or critical alerts
          </small>
        </article>

        <article>
          <Bell />

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
        <div className="panel dashboard-insight">
          <div className="dashboard-insight-icon">
            <Sprout size={22} />
          </div>

          <div className="dashboard-insight-copy">
            <span className="eyebrow">
              Farm coverage
            </span>

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
        </div>

        <div className="panel dashboard-insight">
          <div className="dashboard-insight-icon">
            <AlertTriangle size={22} />
          </div>

          <div className="dashboard-insight-copy">
            <span className="eyebrow">
              Attention queue
            </span>

            <h2>
              {unreadAlerts.length > 0
                ? `${unreadAlerts.length} alert${unreadAlerts.length === 1 ? "" : "s"} need attention`
                : "Everything looks calm"}
            </h2>

            <p>
              {unreadAlerts.length > 0
                ? "Open Alerts to review current disease and weather-driven signals."
                : "CropGuard will surface significant diagnosis and weather-risk events here."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
