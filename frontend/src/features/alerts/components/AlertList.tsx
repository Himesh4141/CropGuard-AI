import { Bell } from "lucide-react";

import { AlertCard } from "@/features/alerts/components/AlertCard";
import type { FieldAlert } from "@/features/alerts/types";

interface AlertListProps {
  alerts: FieldAlert[];
  onRead: (alertId: string) => void;
  updatingAlertId: string | null;
}

export function AlertList({ alerts, onRead, updatingAlertId }: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <section className="panel empty">
        <Bell size={36} />
        <h2>No active alerts</h2>
        <p>
          High weather risk and significant crop-health detections will
          automatically appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onRead={onRead}
          isUpdating={updatingAlertId === alert.id}
        />
      ))}
    </div>
  );
}
