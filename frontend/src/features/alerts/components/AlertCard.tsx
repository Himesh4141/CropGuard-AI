import {
  Check,
  CloudRain,
  Microscope,
} from "lucide-react";

import type {
  FieldAlert,
} from "@/features/alerts/types";


interface AlertCardProps {
  alert: FieldAlert;
  onRead: (
    alertId: string,
  ) => void;
  isUpdating: boolean;
}


function formatDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}


export function AlertCard({
  alert,
  onRead,
  isUpdating,
}: AlertCardProps) {
  const isWeather =
    alert.title
      .toLowerCase()
      .includes(
        "weather",
      );

  const Icon =
    isWeather
      ? CloudRain
      : Microscope;

  const level =
    alert.risk_level
      .toLowerCase();

  const accent =
    level === "critical"
      ? "#e45e68"
      : level === "high"
        ? "#e58a36"
        : "#159b78";

  return (
    <article
      className="panel"
      style={{
        display:
          "grid",
        gridTemplateColumns:
          "auto 1fr auto",
        gap:
          "16px",
        alignItems:
          "start",
        opacity:
          alert.is_read
            ? 0.68
            : 1,
      }}
    >
      <div
        style={{
          width:
            "42px",
          height:
            "42px",
          display:
            "grid",
          placeItems:
            "center",
          borderRadius:
            "12px",
          border:
            `1px solid ${accent}`,
          color:
            accent,
        }}
      >
        <Icon
          size={20}
        />
      </div>

      <div>
        <div
          style={{
            display:
              "flex",
            flexWrap:
              "wrap",
            gap:
              "8px",
            alignItems:
              "center",
          }}
        >
          <h2
            style={{
              margin:
                0,
              fontSize:
                "17px",
            }}
          >
            {alert.title}
          </h2>

          <span
            style={{
              color:
                accent,
              border:
                `1px solid ${accent}`,
              borderRadius:
                "999px",
              padding:
                "4px 8px",
              fontSize:
                "9px",
              fontWeight:
                800,
              textTransform:
                "uppercase",
            }}
          >
            {alert.risk_level}
          </span>

          {!alert.is_read && (
            <span
              style={{
                color:
                  "#159b78",
                fontSize:
                  "10px",
                fontWeight:
                  800,
              }}
            >
              NEW
            </span>
          )}
        </div>

        <p
          style={{
            color:
              "var(--muted)",
            lineHeight:
              1.7,
            marginBottom:
              "10px",
          }}
        >
          {alert.message}
        </p>

        <small
          style={{
            color:
              "var(--muted2)",
          }}
        >
          {formatDate(
            alert.created_at,
          )}
        </small>
      </div>

      {!alert.is_read ? (
        <button
          type="button"
          className="button secondary"
          disabled={
            isUpdating
          }
          onClick={() =>
            onRead(
              alert.id,
            )
          }
        >
          <Check
            size={16}
          />
          Mark read
        </button>
      ) : (
        <div
          style={{
            display:
              "flex",
            gap:
              "6px",
            alignItems:
              "center",
            color:
              "var(--muted2)",
            fontSize:
              "11px",
          }}
        >
          <Check
            size={15}
          />
          Read
        </div>
      )}
    </article>
  );
}