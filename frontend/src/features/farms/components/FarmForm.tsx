import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  X,
} from "lucide-react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  farmApi,
} from "@/features/farms/api/farmApi";

import type {
  Farm,
  FarmCreate,
} from "@/features/farms/types";

import {
  ApiClientError,
} from "@/services/apiError";

import "@/features/management.css";


interface FarmFormProps {
  editingFarm:
    Farm | null;

  onCancelEdit: () => void;
}


interface FarmFormState {
  name: string;
  village: string;
  district: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
}


const initialState: FarmFormState = {
  name: "",
  village: "",
  district: "",
  state: "Telangana",
  country: "India",
  latitude: "",
  longitude: "",
};


function stateFromFarm(
  farm: Farm,
): FarmFormState {
  return {
    name:
      farm.name,
    village:
      farm.village
      ?? "",
    district:
      farm.district
      ?? "",
    state:
      farm.state
      ?? "",
    country:
      farm.country,
    latitude:
      farm.latitude
      != null
        ? String(
            farm.latitude,
          )
        : "",
    longitude:
      farm.longitude
      != null
        ? String(
            farm.longitude,
          )
        : "",
  };
}


function optionalText(
  value: string,
): string | null {
  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}


function optionalNumber(
  value: string,
): number | null {
  if (
    value.trim().length === 0
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null;
}


export function FarmForm({
  editingFarm,
  onCancelEdit,
}: FarmFormProps) {
  const queryClient =
    useQueryClient();

  const [
    form,
    setForm,
  ] = useState<FarmFormState>(
    initialState,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  useEffect(() => {
    setForm(
      editingFarm
        ? stateFromFarm(
            editingFarm,
          )
        : initialState,
    );

    setSuccessMessage(
      "",
    );
  }, [
    editingFarm,
  ]);


  const mutation =
    useMutation({
      mutationFn:
        async (
          payload:
            FarmCreate,
        ) => {
          if (editingFarm) {
            return farmApi.update(
              editingFarm.id,
              payload,
            );
          }

          return farmApi.create(
            payload,
          );
        },

      onSuccess:
        async (farm) => {
          if (editingFarm) {
            setSuccessMessage(
              `${farm.name} was updated successfully.`,
            );

            onCancelEdit();
          } else {
            setForm(
              initialState,
            );

            setSuccessMessage(
              `${farm.name} was added successfully.`,
            );
          }

          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "farms",
                ],
              }),
            queryClient
              .invalidateQueries({
                queryKey: [
                  "fields",
                ],
              }),
          ]);
        },
    });


  function updateField(
    key: keyof FarmFormState,
    value: string,
  ): void {
    setSuccessMessage(
      "",
    );

    setForm(
      (current) => ({
        ...current,
        [key]:
          value,
      }),
    );
  }


  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    const payload: FarmCreate = {
      name:
        form.name.trim(),

      village:
        optionalText(
          form.village,
        ),

      district:
        optionalText(
          form.district,
        ),

      state:
        optionalText(
          form.state,
        ),

      country:
        form.country.trim()
        || "India",

      latitude:
        optionalNumber(
          form.latitude,
        ),

      longitude:
        optionalNumber(
          form.longitude,
        ),
    };

    mutation.mutate(
      payload,
    );
  }


  const errorMessage =
    mutation.error instanceof
    ApiClientError
      ? mutation.error.message
      : mutation.isError
        ? (
          editingFarm
            ? "Unable to update the farm."
            : "Unable to create the farm."
        )
        : "";


  return (
    <article className="panel management-form-panel">
      <div className="management-section-heading">
        <span className="eyebrow">
          {editingFarm
            ? "EDIT FARM"
            : "ADD FARM"}
        </span>

        <h2>
          {editingFarm
            ? "Update farm details"
            : "Register a farm"}
        </h2>

        <p>
          {editingFarm
            ? "Save corrected location details for this farm."
            : "Add the location that contains your crop fields."}
        </p>
      </div>

      <form
        className="management-form"
        onSubmit={
          handleSubmit
        }
      >
        <label>
          <span>
            Farm name *
          </span>

          <input
            value={
              form.name
            }
            onChange={(event) => {
              updateField(
                "name",
                event.target.value,
              );
            }}
            minLength={2}
            maxLength={120}
            required
            placeholder="Green Valley Farm"
          />
        </label>

        <div className="management-form-grid">
          <label>
            <span>
              Village
            </span>

            <input
              value={
                form.village
              }
              onChange={(event) => {
                updateField(
                  "village",
                  event.target.value,
                );
              }}
              maxLength={120}
              placeholder="Shamirpet"
            />
          </label>

          <label>
            <span>
              District
            </span>

            <input
              value={
                form.district
              }
              onChange={(event) => {
                updateField(
                  "district",
                  event.target.value,
                );
              }}
              maxLength={120}
              placeholder="Medchal"
            />
          </label>

          <label>
            <span>
              State
            </span>

            <input
              value={
                form.state
              }
              onChange={(event) => {
                updateField(
                  "state",
                  event.target.value,
                );
              }}
              maxLength={120}
            />
          </label>

          <label>
            <span>
              Country
            </span>

            <input
              value={
                form.country
              }
              onChange={(event) => {
                updateField(
                  "country",
                  event.target.value,
                );
              }}
              maxLength={120}
              required
            />
          </label>

          <label>
            <span>
              Latitude
            </span>

            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={
                form.latitude
              }
              onChange={(event) => {
                updateField(
                  "latitude",
                  event.target.value,
                );
              }}
              placeholder="17.385"
            />
          </label>

          <label>
            <span>
              Longitude
            </span>

            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={
                form.longitude
              }
              onChange={(event) => {
                updateField(
                  "longitude",
                  event.target.value,
                );
              }}
              placeholder="78.4867"
            />
          </label>
        </div>

        {errorMessage ? (
          <div
            className="error-box"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="success-box">
            {successMessage}
          </div>
        ) : null}

        <div className="management-form-actions">
          {editingFarm ? (
            <button
              type="button"
              className="button ghost"
              onClick={
                onCancelEdit
              }
              disabled={
                mutation.isPending
              }
            >
              <X
                size={16}
              />
              Cancel
            </button>
          ) : null}

          <button
            type="submit"
            className="button primary"
            disabled={
              mutation.isPending
            }
          >
            {mutation.isPending
              ? (
                editingFarm
                  ? "Saving…"
                  : "Adding…"
              )
              : (
                editingFarm
                  ? "Save farm"
                  : "Add farm"
              )}
          </button>
        </div>
      </form>
    </article>
  );
}
