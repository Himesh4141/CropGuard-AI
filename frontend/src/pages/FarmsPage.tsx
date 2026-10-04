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
  farmApi,
} from "@/features/farms/api/farmApi";

import {
  FarmForm,
} from "@/features/farms/components/FarmForm";

import {
  FarmList,
} from "@/features/farms/components/FarmList";

import type {
  Farm,
} from "@/features/farms/types";

import "@/features/management.css";


export default function FarmsPage() {
  const queryClient =
    useQueryClient();

  const [
    editingFarm,
    setEditingFarm,
  ] = useState<Farm | null>(
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


  const deleteMutation =
    useMutation({
      mutationFn:
        farmApi.remove,

      onSuccess:
        async (
          _,
          farmId,
        ) => {
          if (
            editingFarm?.id
            === farmId
          ) {
            setEditingFarm(
              null,
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
          ]);
        },
    });


  function deleteFarm(
    farm: Farm,
  ): void {
    const confirmed =
      window.confirm(
        `Delete ${farm.name}? This also removes its fields, diagnoses, weather snapshots and alerts.`,
      );

    if (confirmed) {
      deleteMutation.mutate(
        farm.id,
      );
    }
  }


  return (
    <div className="page">
      <PageHeader
        eyebrow="FARM MANAGEMENT"
        title="Your farms"
        description="Register farm locations and organize the crop fields that belong to each farm."
      />

      <section className="management-layout">
        <FarmForm
          editingFarm={
            editingFarm
          }
          onCancelEdit={() => {
            setEditingFarm(
              null,
            );
          }}
        />

        <div>
          <div className="management-list-heading">
            <div>
              <span className="eyebrow">
                REGISTERED FARMS
              </span>

              <h2>
                Farm portfolio
              </h2>
            </div>

            <strong>
              {farmsQuery.data?.length
              ?? 0}
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
              Unable to delete this farm.
            </div>
          ) : null}

          {farmsQuery.isLoading ? (
            <div className="panel">
              Loading farms…
            </div>
          ) : farmsQuery.isError ? (
            <div className="panel error-box">
              Unable to load farms.
            </div>
          ) : (
            <FarmList
              farms={
                farmsQuery.data
                ?? []
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
                setEditingFarm
              }
              onDelete={
                deleteFarm
              }
            />
          )}
        </div>
      </section>
    </div>
  );
}
