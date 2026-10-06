"""Add multi-crop diagnosis details."""

from alembic import op
import sqlalchemy as sa


revision = "20261006_0005"
down_revision = "20261006_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "diagnoses",
        sa.Column(
            "predicted_crop",
            sa.String(length=80),
            nullable=True,
        ),
    )
    op.add_column(
        "diagnoses",
        sa.Column(
            "confidence_level",
            sa.String(length=24),
            nullable=True,
        ),
    )
    op.add_column(
        "diagnoses",
        sa.Column(
            "top_predictions",
            sa.JSON(),
            nullable=True,
        ),
    )
    op.add_column(
        "diagnoses",
        sa.Column(
            "is_uncertain",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "diagnoses",
        sa.Column(
            "rejection_reason",
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("diagnoses", "rejection_reason")
    op.drop_column("diagnoses", "is_uncertain")
    op.drop_column("diagnoses", "top_predictions")
    op.drop_column("diagnoses", "confidence_level")
    op.drop_column("diagnoses", "predicted_crop")
