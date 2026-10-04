import {
  CloudRain,
  Droplets,
  Gauge,
  ThermometerSun,
  Wind,
} from "lucide-react";

import type {
  FieldWeatherRisk,
} from "@/features/weather/types";


interface CurrentWeatherProps {
  data: FieldWeatherRisk;
}


function providerLabel(
  provider: string,
): string {
  if (
    provider
    === "open_meteo"
  ) {
    return "Open-Meteo";
  }

  if (
    provider
    === "development_fallback"
  ) {
    return "Development fallback";
  }

  return provider
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


export function CurrentWeather({
  data,
}: CurrentWeatherProps) {
  const {
    current,
  } = data;

  return (
    <section className="weather-panel">
      <div className="weather-panel-heading">
        <div>
          <span className="eyebrow">
            CURRENT CONDITIONS
          </span>

          <h2>
            {data.field_name}
          </h2>

          <p>
            {data.farm_name}
            {" · "}
            {data.crop_name}
          </p>
        </div>

        <div className="weather-source">
          <strong>
            {providerLabel(
              data.provider,
            )}
          </strong>

          <span>
            {data.cached
              ? "Cached snapshot"
              : "Fresh snapshot"}
          </span>
        </div>
      </div>

      <div className="weather-metric-grid">
        <article>
          <ThermometerSun
            size={21}
          />

          <span>
            Temperature
          </span>

          <strong>
            {current.temperature_c.toFixed(
              1,
            )}
            °C
          </strong>
        </article>

        <article>
          <Droplets
            size={21}
          />

          <span>
            Humidity
          </span>

          <strong>
            {current.humidity_percent.toFixed(
              0,
            )}
            %
          </strong>
        </article>

        <article>
          <CloudRain
            size={21}
          />

          <span>
            Rainfall
          </span>

          <strong>
            {current.rainfall_mm.toFixed(
              1,
            )}
            mm
          </strong>
        </article>

        <article>
          <Gauge
            size={21}
          />

          <span>
            Precipitation
          </span>

          <strong>
            {current.precipitation_mm.toFixed(
              1,
            )}
            mm
          </strong>
        </article>

        <article>
          <Wind
            size={21}
          />

          <span>
            Wind
          </span>

          <strong>
            {current.wind_speed_kmh.toFixed(
              1,
            )}
            km/h
          </strong>
        </article>
      </div>

      <p className="weather-observed">
        Observed{" "}
        {new Date(
          data.observed_at,
        ).toLocaleString()}
      </p>
    </section>
  );
}