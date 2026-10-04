import {
  useMemo,
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  CloudSun,
  MapPin,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  fieldApi,
} from "@/features/fields/api/fieldApi";

import {
  farmApi,
} from "@/features/farms/api/farmApi";

import {
  RiskCard,
} from "@/features/risk/components/RiskCard";

import {
  weatherApi,
} from "@/features/weather/api/weatherApi";

import {
  CurrentWeather,
} from "@/features/weather/components/CurrentWeather";

import {
  WeatherForecast,
} from "@/features/weather/components/WeatherForecast";

import {
  normalizeApiError,
} from "@/services/apiError";

import "@/features/weather/weather.css";


export default function WeatherPage() {
  const [
    selectedFieldId,
    setSelectedFieldId,
  ] = useState(
    "",
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

  const farms =
    farmsQuery.data
    ?? [];

  const fields =
    fieldsQuery.data
    ?? [];

  const effectiveFieldId =
    selectedFieldId
    || fields[
      0
    ]?.id
    || "";

  const selectedField =
    fields.find(
      (field) =>
        field.id
        === effectiveFieldId,
    )
    ?? null;

  const selectedFarm =
    farms.find(
      (farm) =>
        farm.id
        === selectedField?.farm_id,
    )
    ?? null;

  const weatherQuery =
    useQuery({
      queryKey: [
        "weather-risk",
        effectiveFieldId,
      ],

      queryFn: () =>
        weatherApi.getFieldWeather(
          effectiveFieldId,
        ),

      enabled:
        Boolean(
          effectiveFieldId,
        ),

      staleTime:
        5
        * 60
        * 1000,
    });

  const locationLabel =
    useMemo(
      () => {
        if (
          selectedFarm
          === null
        ) {
          return "";
        }

        return [
          selectedFarm.village,
          selectedFarm.district,
          selectedFarm.state,
        ]
          .filter(
            Boolean,
          )
          .join(
            ", ",
          );
      },
      [
        selectedFarm,
      ],
    );

  const isLoading =
    farmsQuery.isLoading
    || fieldsQuery.isLoading;

  const listError =
    farmsQuery.isError
    || fieldsQuery.isError;

  const missingCoordinates =
    selectedFarm !== null
    && (
      selectedFarm.latitude
      === null
      || selectedFarm.longitude
      === null
    );

  return (
    <div className="page">
      <PageHeader
        eyebrow="WEATHER INTELLIGENCE"
        title="Weather & disease risk"
        description="Combine field location, crop type and live weather conditions to estimate weather-driven disease pressure."
      />

      {isLoading ? (
        <div className="panel weather-message">
          <CloudSun
            size={30}
          />

          <h2>
            Loading fields…
          </h2>
        </div>
      ) : listError ? (
        <div className="panel error-box">
          Unable to load farm and field data.
        </div>
      ) : fields.length === 0 ? (
        <div className="panel weather-message">
          <CloudSun
            size={30}
          />

          <h2>
            Add a field first
          </h2>

          <p>
            Weather risk needs a crop field linked to a farm location.
          </p>
        </div>
      ) : (
        <>
          <section className="weather-toolbar">
            <div className="weather-field-select">
              <label
                htmlFor="weather-field"
              >
                FIELD
              </label>

              <select
                id="weather-field"
                value={
                  effectiveFieldId
                }
                onChange={(
                  event,
                ) =>
                  setSelectedFieldId(
                    event.target.value,
                  )
                }
              >
                {fields.map(
                  (field) => (
                    <option
                      key={field.id}
                      value={field.id}
                    >
                      {field.name}
                      {" — "}
                      {field.crop_name}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="weather-location">
              <MapPin
                size={15}
              />

              <div>
                <strong>
                  {selectedFarm?.name
                    ?? "Farm"}
                </strong>

                <div>
                  {locationLabel
                    || "Location details unavailable"}
                </div>
              </div>
            </div>
          </section>

          {missingCoordinates && (
            <div className="weather-warning">
              This farm does not have latitude and longitude yet. Add coordinates on the Farms page before requesting live weather.
            </div>
          )}

          {weatherQuery.isLoading ? (
            <div className="panel weather-message">
              <CloudSun
                size={30}
              />

              <h2>
                Fetching weather…
              </h2>

              <p>
                Calculating disease pressure for the selected crop field.
              </p>
            </div>
          ) : weatherQuery.isError ? (
            <div className="panel error-box">
              {normalizeApiError(
                weatherQuery.error,
              ).message}
            </div>
          ) : weatherQuery.data ? (
            <>
              {weatherQuery.data.provider
                === "development_fallback"
                && (
                  <div className="weather-warning">
                    The external weather service was unavailable, so CropGuard is showing deterministic development fallback data. Do not treat fallback values as live weather.
                  </div>
                )}

              <section className="weather-layout">
                <div className="weather-main-column">
                  <CurrentWeather
                    data={
                      weatherQuery.data
                    }
                  />

                  <WeatherForecast
                    forecast={
                      weatherQuery.data.forecast
                    }
                  />
                </div>

                <RiskCard
                  risk={
                    weatherQuery.data.risk
                  }
                />
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}