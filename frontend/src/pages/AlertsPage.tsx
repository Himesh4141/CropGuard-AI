import {
  Bell,
  CheckCheck,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  alertApi,
} from "@/features/alerts/api/alertApi";

import {
  AlertList,
} from "@/features/alerts/components/AlertList";


export default function AlertsPage() {
  const queryClient =
    useQueryClient();

  const alertsQuery =
    useQuery({
      queryKey: [
        "alerts",
      ],

      queryFn:
        alertApi.list,
    });

  const readMutation =
    useMutation({
      mutationFn:
        alertApi.markRead,

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "alerts",
            ],
          });
        },
    });

  const readAllMutation =
    useMutation({
      mutationFn:
        alertApi.markAllRead,

      onSuccess:
        async () => {
          await queryClient.invalidateQueries({
            queryKey: [
              "alerts",
            ],
          });
        },
    });

  const alerts =
    alertsQuery.data
    ?? [];

  const unread =
    alerts.filter(
      (alert) =>
        !alert.is_read,
    );

  return (
    <div className="page">
      <PageHeader
        eyebrow="FIELD MONITORING"
        title="Alerts"
        description="Review weather-driven disease pressure and important crop-health detections across your fields."
      />

      <section
        className="metrics"
        style={{
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
        }}
      >
        <article>
          <Bell />

          <span>
            Unread alerts
          </span>

          <strong>
            {unread.length}
          </strong>

          <small>
            Require your attention
          </small>
        </article>

        <article>
          <CheckCheck />

          <span>
            Total alerts
          </span>

          <strong>
            {alerts.length}
          </strong>

          <small>
            Weather and diagnosis events
          </small>
        </article>
      </section>

      {unread.length > 0 && (
        <div
          style={{
            display:
              "flex",
            justifyContent:
              "flex-end",
            marginBottom:
              "14px",
          }}
        >
          <button
            type="button"
            className="button secondary"
            disabled={
              readAllMutation.isPending
            }
            onClick={() =>
              readAllMutation.mutate()
            }
          >
            <CheckCheck
              size={16}
            />
            Mark all read
          </button>
        </div>
      )}

      {alertsQuery.isLoading && (
        <section
          className="panel empty"
        >
          <div className="spinner" />

          <p>
            Checking field alerts...
          </p>
        </section>
      )}

      {alertsQuery.isError && (
        <section
          className="panel empty"
        >
          <Bell
            size={34}
          />

          <h2>
            Alerts could not be loaded
          </h2>

          <p>
            Check that the backend is
            running and try again.
          </p>
        </section>
      )}

      {!alertsQuery.isLoading
        && !alertsQuery.isError
        && (
          <AlertList
            alerts={
              alerts
            }
            onRead={
              (alertId) =>
                readMutation.mutate(
                  alertId,
                )
            }
            updatingAlertId={
              readMutation.isPending
                ? (
                  readMutation
                    .variables
                  ?? null
                )
                : null
            }
          />
        )}
    </div>
  );
}