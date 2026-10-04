"""Add diagnosis inference provenance."""

from alembic import op
import sqlalchemy as sa


revision = "20261004_0003"
down_revision = "20261004_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "diagnoses",
        sa.Column(
            "inference_mode",
            sa.String(length=32),
            nullable=False,
            server_default="development_stub",
        ),
    )

    op.add_column(
        "diagnoses",
        sa.Column(
            "model_display_name",
            sa.String(length=120),
            nullable=False,
            server_default=(
                "CropGuard Development Simulator"
            ),
        ),
    )

    op.add_column(
        "diagnoses",
        sa.Column(
            "model_version",
            sa.String(length=80),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "diagnoses",
        "model_version",
    )

    op.drop_column(
        "diagnoses",
        "model_display_name",
    )

    op.drop_column(
        "diagnoses",
        "inference_mode",
    )