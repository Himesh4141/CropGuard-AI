import {
  useState,
} from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  fieldApi,
} from "@/features/fields/api/fieldApi";

import {
  FieldForm,
} from "@/features/fields/components/FieldForm";

import {
  FieldList,
} from "@/features/fields/components/FieldList";

import type {
  CropField,
} from "@/features/fields/types";

import {
  farmApi,
} from "@/features/farms/api/farmApi";

import "@/features/management.css";


export default function FieldsPage() {
  const queryClient =
    useQueryClient();

  const [
    editingField,
    setEditingField,
  ] = useState<CropField | null>(
    null,
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


  const deleteMutation =
    useMutation({
      mutationFn:
        fieldApi.remove,

      onSuccess:
        async (
          _,
          fieldId,
        ) => {
          if (
            editingField?.id
            === fieldId
          ) {
            setEditingField(
              null,
            );
          }

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
                  "diagnoses",
                ],
              }),
            queryClient
              .invalidateQueries({
                queryKey: [
                  "alerts",
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


  const farms =
    farmsQuery.data
    ?? [];

  const fields =
    fieldsQuery.data
    ?? [];


  function deleteField(
    field: CropField,
  ): void {
    const confirmed =
      window.confirm(
        `Delete ${field.name}? Its diagnoses, weather snapshots and alerts will also be removed.`,
      );

    if (confirmed) {
      deleteMutation.mutate(
        field.id,
      );
    }
  }


  return (
    <div className="page">
      <PageHeader
        eyebrow="FIELD MANAGEMENT"
        title="Crop fields"
        description="Track crops, varieties, acreage and sowing information for each field."
      />

      <section className="management-layout">
        <FieldForm
          farms={
            farms
          }
          editingField={
            editingField
          }
          onCancelEdit={() => {
            setEditingField(
              null,
            );
          }}
        />

        <div>
          <div className="management-list-heading">
            <div>
              <span className="eyebrow">
                ACTIVE FIELDS
              </span>

              <h2>
                Crop portfolio
              </h2>
            </div>

            <strong>
              {fields.length}
            </strong>
          </div>

          {deleteMutation.isError ? (
            <div
              className="error-box"
              style={{
                marginBottom:
                  "12px",
              }}
            >
              Unable to delete this field.
            </div>
          ) : null}

          {farmsQuery.isLoading
          || fieldsQuery.isLoading ? (
            <div className="panel">
              Loading fields…
            </div>
          ) : farmsQuery.isError
            || fieldsQuery.isError ? (
            <div className="panel error-box">
              Unable to load field data.
            </div>
          ) : (
            <FieldList
              farms={
                farms
              }
              fields={
                fields
              }
              deletingId={
                deleteMutation.isPending
                  ? (
                    deleteMutation.variables
                    ?? null
                  )
                  : null
              }
              onEdit={
                setEditingField
              }
              onDelete={
                deleteField
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
