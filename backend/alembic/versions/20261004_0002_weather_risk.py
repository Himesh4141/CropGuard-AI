"""Add persisted weather and field risk snapshots."""

from alembic import op
import sqlalchemy as sa


revision = "20261004_0002"
down_revision = "20261003_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weather_records",
        sa.Column(
            "field_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "provider",
            sa.String(
                length=50,
            ),
            nullable=False,
        ),
        sa.Column(
            "observed_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "temperature_c",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "humidity_percent",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "precipitation_mm",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "rainfall_mm",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "wind_speed_kmh",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "forecast_json",
            sa.JSON(),
            nullable=False,
        ),
        sa.Column(
            "risk_score",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "risk_level",
            sa.String(
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "risk_factors",
            sa.JSON(),
            nullable=False,
        ),
        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True,
            ),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            [
                "field_id",
            ],
            [
                "fields.id",
            ],
            name=(
                "fk_weather_records_"
                "field_id_fields"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    op.create_index(
        "ix_weather_records_field_id",
        "weather_records",
        [
            "field_id",
        ],
        unique=False,
    )

    op.create_index(
        "ix_weather_records_observed_at",
        "weather_records",
        [
            "observed_at",
        ],
        unique=False,
    )

    op.create_index(
        "ix_weather_records_field_observed",
        "weather_records",
        [
            "field_id",
            "observed_at",
        ],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_weather_records_field_observed",
        table_name="weather_records",
    )

    op.drop_index(
        "ix_weather_records_observed_at",
        table_name="weather_records",
    )

    op.drop_index(
        "ix_weather_records_field_id",
        table_name="weather_records",
    )

    op.drop_table(
        "weather_records",
    )