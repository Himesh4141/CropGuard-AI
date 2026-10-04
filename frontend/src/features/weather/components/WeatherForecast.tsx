import {
  CloudRain,
  Wind,
} from "lucide-react";

import type {
  WeatherForecastDay,
} from "@/features/weather/types";


interface WeatherForecastProps {
  forecast: WeatherForecastDay[];
}


function formatDay(
  value: string,
): string {
  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
  );
}


export function WeatherForecast({
  forecast,
}: WeatherForecastProps) {
  return (
    <section className="weather-panel">
      <div className="weather-panel-heading">
        <div>
          <span className="eyebrow">
            FORECAST
          </span>

          <h2>
            Disease-pressure outlook
          </h2>

          <p>
            Rain, temperature and wind
            for the next few days.
          </p>
        </div>
      </div>

      <div className="forecast-grid">
        {forecast.map(
          (day) => (
            <article
              key={day.date}
              className="forecast-card"
            >
              <strong>
                {formatDay(
                  day.date,
                )}
              </strong>

              <div className="forecast-temperature">
                <span>
                  {day.temperature_max_c.toFixed(
                    0,
                  )}
                  °
                </span>

                <small>
                  {day.temperature_min_c.toFixed(
                    0,
                  )}
                  °
                </small>
              </div>

              <div className="forecast-detail">
                <CloudRain
                  size={15}
                />

                <span>
                  {day.rainfall_mm.toFixed(
                    1,
                  )}
                  {" mm"}
                </span>
              </div>

              <div className="forecast-detail">
                <Wind
                  size={15}
                />

                <span>
                  {day.wind_speed_max_kmh.toFixed(
                    0,
                  )}
                  {" km/h"}
                </span>
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}