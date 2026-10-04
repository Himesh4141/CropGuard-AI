import {
  ShieldAlert,
} from "lucide-react";

import {
  RiskFactors,
} from "@/features/risk/components/RiskFactors";

import type {
  WeatherRiskSummary,
} from "@/features/weather/types";


interface RiskCardProps {
  risk: WeatherRiskSummary;
}


function levelLabel(
  level: string,
): string {
  return level
    .charAt(
      0,
    )
    .toUpperCase()
    + level.slice(
      1,
    );
}


export function RiskCard({
  risk,
}: RiskCardProps) {
  const safeLevel =
    risk.level.toLowerCase();

  return (
    <section className="weather-panel risk-panel">
      <div className="risk-score-row">
        <div>
          <span className="eyebrow">
            FIELD DISEASE RISK
          </span>

          <h2>
            Weather-driven pressure
          </h2>
        </div>

        <span
          className={`risk-level risk-${safeLevel}`}
        >
          <ShieldAlert
            size={16}
          />

          {levelLabel(
            safeLevel,
          )}
        </span>
      </div>

      <div className="risk-score">
        <strong>
          {risk.score}
        </strong>

        <span>
          /100
        </span>
      </div>

      <div
        className="risk-meter"
        aria-label={`Disease risk score ${risk.score} out of 100`}
      >
        <span
          style={{
            width:
              `${Math.min(
                Math.max(
                  risk.score,
                  0,
                ),
                100,
              )}%`,
          }}
        />
      </div>

      <RiskFactors
        factors={
          risk.factors
        }
      />

      <p className="risk-disclaimer">
        This score is an agronomic
        decision-support signal based on
        weather and crop rules. It is not
        a laboratory diagnosis.
      </p>
    </section>
  );
}