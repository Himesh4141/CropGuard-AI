import {
  CalendarDays,
  Leaf,
  Pencil,
  Ruler,
  Trash2,
} from "lucide-react";

import type {
  CropField,
} from "@/features/fields/types";

import type {
  Farm,
} from "@/features/farms/types";

import "@/features/management.css";


interface FieldListProps {
  fields: CropField[];
  farms: Farm[];

  deletingId:
    string | null;

  onEdit: (
    field: CropField,
  ) => void;

  onDelete: (
    field: CropField,
  ) => void;
}


export function FieldList({
  fields,
  farms,
  deletingId,
  onEdit,
  onDelete,
}: FieldListProps) {
  const farmNames =
    new Map(
      farms.map(
        (farm) => [
          farm.id,
          farm.name,
        ],
      ),
    );


  if (
    fields.length === 0
  ) {
    return (
      <div className="panel empty">
        <Leaf size={38} />

        <h2>
          No fields yet
        </h2>

        <p>
          Register your first crop
          field to begin crop-health
          monitoring.
        </p>
      </div>
    );
  }


  return (
    <div className="management-card-list">
      {fields.map(
        (field) => (
          <article
            key={field.id}
            className="panel management-card"
          >
            <div className="management-card-icon">
              <Leaf size={20} />
            </div>

            <div className="management-card-content">
              <div className="management-card-title-row">
                <div>
                  <h3>
                    {field.name}
                  </h3>

                  <p>
                    {
                      farmNames.get(
                        field.farm_id,
                      )
                      ?? "Unknown farm"
                    }
                  </p>
                </div>

                <div className="management-card-actions">
                  <span className="crop-pill">
                    {field.crop_name}
                  </span>

                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Edit ${field.name}`}
                    onClick={() => {
                      onEdit(
                        field,
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
                    aria-label={`Delete ${field.name}`}
                    disabled={
                      deletingId
                      === field.id
                    }
                    onClick={() => {
                      onDelete(
                        field,
                      );
                    }}
                  >
                    <Trash2
                      size={15}
                    />
                  </button>
                </div>
              </div>

              <div className="field-meta-grid">
                <div>
                  <Ruler size={14} />

                  <span>
                    {field.area_acres}
                    {" acres"}
                  </span>
                </div>

                <div>
                  <Leaf size={14} />

                  <span>
                    {field.variety
                    ?? "Variety not specified"}
                  </span>
                </div>

                <div>
                  <CalendarDays size={14} />

                  <span>
                    {field.sowing_date
                    ?? "Sowing date not set"}
                  </span>
                </div>
              </div>
            </div>
          </article>
        ),
      )}
    </div>
  );
}
