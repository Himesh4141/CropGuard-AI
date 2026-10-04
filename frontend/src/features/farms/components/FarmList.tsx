import {
  MapPin,
  Pencil,
  Sprout,
  Trash2,
} from "lucide-react";

import type {
  Farm,
} from "@/features/farms/types";

import "@/features/management.css";


interface FarmListProps {
  farms: Farm[];

  deletingId:
    string | null;

  onEdit: (
    farm: Farm,
  ) => void;

  onDelete: (
    farm: Farm,
  ) => void;
}


function farmLocation(
  farm: Farm,
): string {
  return [
    farm.village,
    farm.district,
    farm.state,
    farm.country,
  ]
    .filter(Boolean)
    .join(", ");
}


export function FarmList({
  farms,
  deletingId,
  onEdit,
  onDelete,
}: FarmListProps) {
  if (
    farms.length === 0
  ) {
    return (
      <div className="panel empty">
        <Sprout size={38} />

        <h2>
          No farms yet
        </h2>

        <p>
          Add your first farm using
          the form beside this panel.
        </p>
      </div>
    );
  }

  return (
    <div className="management-card-list">
      {farms.map(
        (farm) => (
          <article
            key={farm.id}
            className="panel management-card"
          >
            <div className="management-card-icon">
              <Sprout size={20} />
            </div>

            <div className="management-card-content">
              <div className="management-card-title-row">
                <div>
                  <h3>
                    {farm.name}
                  </h3>

                  <p className="management-location">
                    <MapPin size={14} />

                    {farmLocation(
                      farm,
                    )}
                  </p>

                  {farm.latitude !== null
                  && farm.longitude !== null ? (
                    <small>
                      {farm.latitude.toFixed(
                        4,
                      )}
                      {", "}
                      {farm.longitude.toFixed(
                        4,
                      )}
                    </small>
                  ) : null}
                </div>

                <div className="management-card-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Edit ${farm.name}`}
                    onClick={() => {
                      onEdit(
                        farm,
                      );
                    }}
                  >
                    <Pencil
                      size={15}
                    />
                  </button>

                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Delete ${farm.name}`}
                    disabled={
                      deletingId
                      === farm.id
                    }
                    onClick={() => {
                      onDelete(
                        farm,
                      );
                    }}
                  >
                    <Trash2
                      size={15}
                    />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ),
      )}
    </div>
  );
}
