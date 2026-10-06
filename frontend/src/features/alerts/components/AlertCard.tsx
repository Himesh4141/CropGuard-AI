import { Check, CloudRain, Microscope } from "lucide-react";

import type { FieldAlert } from "@/features/alerts/types";

interface AlertCardProps {
  alert: FieldAlert;
  onRead: (alertId: string) => void;
  isUpdating: boolean;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AlertCard({ alert, onRead, isUpdating }: AlertCardProps) {
  const isWeather = alert.title.toLowerCase().includes("weather");
  const Icon = isWeather ? CloudRain : Microscope;
  const level = alert.risk_level.toLowerCase();

  return (
    <article
      className={`panel alert-card alert-card--${level}${alert.is_read ? " alert-card--read" : ""}`}
    >
      <div className="alert-card-icon">
        <Icon size={20} />
      </div>

      <div className="alert-card-content">
        <div className="alert-card-heading">
          <h2>{alert.title}</h2>
          <span className="alert-level">{alert.risk_level}</span>
          {!alert.is_read ? <span className="alert-new">New</span> : null}
        </div>

        <p>{alert.message}</p>
        <small>{formatDate(alert.created_at)}</small>
      </div>

      <div className="alert-card-action">
        {!alert.is_read ? (
          <button
            type="button"
            className="button secondary"
            disabled={isUpdating}
            onClick={() => onRead(alert.id)}
          >
            <Check size={16} />
            Mark read
          </button>
        ) : (
          <span className="alert-read-state">
            <Check size={15} />
            Read
          </span>
        )}
      </div>
    </article>
  );
}
