import {
  Activity,
  Bell,
  Leaf,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  adminApi,
} from "@/features/admin/api/adminApi";


export default function AdminDashboardPage() {
  const summaryQuery =
    useQuery({
      queryKey: [
        "admin",
        "summary",
      ],
      queryFn:
        adminApi.summary,
    });

  if (
    summaryQuery.isLoading
  ) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="PLATFORM CONTROL"
          title="Admin dashboard"
          description="Platform-level CropGuard operations and usage."
        />

        <section className="panel empty">
          <div className="spinner" />
          <p>
            Loading platform metrics...
          </p>
        </section>
      </div>
    );
  }

  if (
    summaryQuery.isError
    || !summaryQuery.data
  ) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="PLATFORM CONTROL"
          title="Admin dashboard"
          description="Platform-level CropGuard operations and usage."
        />

        <section className="panel empty">
          <ShieldCheck size={36} />
          <h2>
            Admin metrics unavailable
          </h2>
          <p>
            Verify the backend and your admin permissions.
          </p>
        </section>
      </div>
    );
  }

  const data =
    summaryQuery.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow="PLATFORM CONTROL"
        title="Admin dashboard"
        description="Monitor users, farms, fields, diagnoses and operational alerts across CropGuard."
      />

      <section className="metrics">
        <article>
          <Users />
          <span>
            Users
          </span>
          <strong>
            {data.total_users}
          </strong>
          <small>
            {data.active_users} active
          </small>
        </article>

        <article>
          <Sprout />
          <span>
            Farms
          </span>
          <strong>
            {data.farms}
          </strong>
          <small>
            Farmer-owned locations
          </small>
        </article>

        <article>
          <Leaf />
          <span>
            Fields
          </span>
          <strong>
            {data.fields}
          </strong>
          <small>
            Crop fields registered
          </small>
        </article>

        <article>
          <Activity />
          <span>
            Diagnoses
          </span>
          <strong>
            {data.diagnoses}
          </strong>
          <small>
            Screening records
          </small>
        </article>
      </section>

      <section className="two-col">
        <article className="panel">
          <h2>
            Account mix
          </h2>

          <div
            style={{
              display:
                "grid",
              gap:
                "14px",
              marginTop:
                "18px",
            }}
          >
            <MetricRow
              label="Farmers"
              value={data.farmers}
            />
            <MetricRow
              label="Extension officers"
              value={
                data.extension_officers
              }
            />
            <MetricRow
              label="Administrators"
              value={data.admins}
            />
          </div>
        </article>

        <article className="panel">
          <h2>
            Attention signals
          </h2>

          <div
            style={{
              display:
                "grid",
              gap:
                "14px",
              marginTop:
                "18px",
            }}
          >
            <MetricRow
              label="Unread alerts"
              value={data.unread_alerts}
              icon={<Bell size={17} />}
            />
            <MetricRow
              label="High-risk fields"
              value={data.high_risk_fields}
              icon={<ShieldCheck size={17} />}
            />
            <MetricRow
              label="Open care cases"
              value={data.open_care_cases}
              icon={<Activity size={17} />}
            />
            <MetricRow
              label="Escalated care cases"
              value={data.escalated_care_cases}
              icon={<Bell size={17} />}
            />
            <MetricRow
              label="All alerts"
              value={data.alerts}
            />
          </div>
        </article>
      </section>
    </div>
  );
}


function MetricRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          "12px",
        padding:
          "14px",
        border:
          "1px solid var(--border)",
        borderRadius:
          "12px",
      }}
    >
      <span
        style={{
          display:
            "flex",
          gap:
            "8px",
          alignItems:
            "center",
          color:
            "var(--muted)",
        }}
      >
        {icon}
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}
