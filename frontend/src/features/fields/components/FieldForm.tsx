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
  fieldApi,
} from "@/features/fields/api/fieldApi";

import type {
  CropField,
  FieldCreate,
} from "@/features/fields/types";

import type {
  Farm,
} from "@/features/farms/types";

import {
  ApiClientError,
} from "@/services/apiError";

import "@/features/management.css";


interface FieldFormProps {
  farms: Farm[];

  editingField:
    CropField | null;

  onCancelEdit: () => void;
}


interface FieldFormState {
  farmId: string;
  name: string;
  cropName: string;
  variety: string;
  areaAcres: string;
  sowingDate: string;
}


const emptyState: FieldFormState = {
  farmId: "",
  name: "",
  cropName: "",
  variety: "",
  areaAcres: "",
  sowingDate: "",
};


function stateFromField(
  field: CropField,
): FieldFormState {
  return {
    farmId:
      field.farm_id,
    name:
      field.name,
    cropName:
      field.crop_name,
    variety:
      field.variety
      ?? "",
    areaAcres:
      String(
        field.area_acres,
      ),
    sowingDate:
      field.sowing_date
      ?? "",
  };
}


export function FieldForm({
  farms,
  editingField,
  onCancelEdit,
}: FieldFormProps) {
  const queryClient =
    useQueryClient();

  const [
    form,
    setForm,
  ] = useState<FieldFormState>(
    emptyState,
  );

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  useEffect(() => {
    if (editingField) {
      setForm(
        stateFromField(
          editingField,
        ),
      );

      setSuccessMessage(
        "",
      );

      return;
    }

    setForm(
      (current) => ({
        ...emptyState,
        farmId:
          farms[0]?.id
          ?? current.farmId
          ?? "",
      }),
    );

    setSuccessMessage(
      "",
    );
  }, [
    editingField,
    farms,
  ]);


  const mutation =
    useMutation({
      mutationFn:
        async (
          payload:
            FieldCreate,
        ) => {
          if (editingField) {
            return fieldApi.update(
              editingField.id,
              payload,
            );
          }

          return fieldApi.create(
            payload,
          );
        },

      onSuccess:
        async (field) => {
          if (editingField) {
            onCancelEdit();
          } else {
            setForm(
              (current) => ({
                ...emptyState,
                farmId:
                  current.farmId,
              }),
            );
          }

          setSuccessMessage(
            `${field.name} was ${editingField ? "updated" : "added"} successfully.`,
          );

          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey: [
                  "fields",
                ],
              }),
            queryClient
              .invalidateQueries({
                queryKey: [
                  "weather",
                ],
              }),
          ]);
        },
    });


  function updateField(
    key: keyof FieldFormState,
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

    const area =
      Number(
        form.areaAcres,
      );

    const payload: FieldCreate = {
      farm_id:
        form.farmId,

      name:
        form.name.trim(),

      crop_name:
        form.cropName.trim(),

      variety:
        form.variety.trim()
          ? form.variety.trim()
          : null,

      area_acres:
        area,

      sowing_date:
        form.sowingDate
        || null,
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
          editingField
            ? "Unable to update the field."
            : "Unable to create the field."
        )
        : "";


  if (
    farms.length === 0
  ) {
    return (
      <article className="panel empty">
        <h2>
          Add a farm first
        </h2>

        <p>
          A crop field must belong
          to one of your registered
          farms.
        </p>
      </article>
    );
  }


  return (
    <article className="panel management-form-panel">
      <div className="management-section-heading">
        <span className="eyebrow">
          {editingField
            ? "EDIT FIELD"
            : "ADD FIELD"}
        </span>

        <h2>
          {editingField
            ? "Update crop field"
            : "Register a crop field"}
        </h2>

        <p>
          Record crop, variety,
          acreage and sowing details.
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
            Farm *
          </span>

          <select
            value={
              form.farmId
            }
            onChange={(event) => {
              updateField(
                "farmId",
                event.target.value,
              );
            }}
            required
          >
            {farms.map(
              (farm) => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>
            Field name *
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
            placeholder="Tomato Field A"
          />
        </label>

        <div className="management-form-grid">
          <label>
            <span>
              Crop *
            </span>

            <input
              value={
                form.cropName
              }
              onChange={(event) => {
                updateField(
                  "cropName",
                  event.target.value,
                );
              }}
              minLength={2}
              maxLength={100}
              required
              placeholder="Tomato"
            />
          </label>

          <label>
            <span>
              Variety
            </span>

            <input
              value={
                form.variety
              }
              onChange={(event) => {
                updateField(
                  "variety",
                  event.target.value,
                );
              }}
              maxLength={100}
              placeholder="Arka Rakshak"
            />
          </label>

          <label>
            <span>
              Area in acres *
            </span>

            <input
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              value={
                form.areaAcres
              }
              onChange={(event) => {
                updateField(
                  "areaAcres",
                  event.target.value,
                );
              }}
              required
              placeholder="2.5"
            />
          </label>

          <label>
            <span>
              Sowing date
            </span>

            <input
              type="date"
              value={
                form.sowingDate
              }
              onChange={(event) => {
                updateField(
                  "sowingDate",
                  event.target.value,
                );
              }}
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
          {editingField ? (
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
                editingField
                  ? "Saving…"
                  : "Adding…"
              )
              : (
                editingField
                  ? "Save field"
                  : "Add field"
              )}
          </button>
        </div>
      </form>
    </article>
  );
}
