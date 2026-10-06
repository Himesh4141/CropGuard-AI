"""Add extension-officer service area fields."""

from alembic import op
import sqlalchemy as sa


revision = "20261006_0004"
down_revision = "20261004_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("service_state", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("service_district", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("service_latitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("service_longitude", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("coverage_radius_km", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "coverage_radius_km")
    op.drop_column("users", "service_longitude")
    op.drop_column("users", "service_latitude")
    op.drop_column("users", "service_district")
    op.drop_column("users", "service_state")
