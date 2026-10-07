"""Add CropGuard crop-care case tracking."""

from alembic import op
import sqlalchemy as sa


revision = "20261007_0006"
down_revision = "20261006_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "care_cases",
        sa.Column("field_id", sa.Uuid(), nullable=False),
        sa.Column("farmer_id", sa.Uuid(), nullable=False),
        sa.Column("initial_diagnosis_id", sa.Uuid(), nullable=True),
        sa.Column("latest_diagnosis_id", sa.Uuid(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "OPEN",
                "MONITORING",
                "ESCALATED",
                "RESOLVED",
                name="care_case_status",
            ),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.Enum(
                "LOW",
                "MODERATE",
                "HIGH",
                "CRITICAL",
                name="care_case_priority",
            ),
            nullable=False,
        ),
        sa.Column(
            "trend",
            sa.Enum(
                "NEW",
                "IMPROVING",
                "SAME",
                "WORSENING",
                name="care_case_trend",
            ),
            nullable=False,
        ),
        sa.Column("current_label", sa.String(length=180), nullable=True),
        sa.Column("current_confidence", sa.Float(), nullable=True),
        sa.Column("severity", sa.String(length=50), nullable=True),
        sa.Column("advisory", sa.Text(), nullable=True),
        sa.Column("action_plan", sa.JSON(), nullable=True),
        sa.Column("next_follow_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_follow_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["farmer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["field_id"], ["fields.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["initial_diagnosis_id"],
            ["diagnoses.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["latest_diagnosis_id"],
            ["diagnoses.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_care_cases_field_id"), "care_cases", ["field_id"], unique=False)
    op.create_index(op.f("ix_care_cases_farmer_id"), "care_cases", ["farmer_id"], unique=False)
    op.create_index(op.f("ix_care_cases_status"), "care_cases", ["status"], unique=False)
    op.create_index(op.f("ix_care_cases_priority"), "care_cases", ["priority"], unique=False)
    op.create_index(
        op.f("ix_care_cases_next_follow_up_at"),
        "care_cases",
        ["next_follow_up_at"],
        unique=False,
    )

    op.create_table(
        "care_case_updates",
        sa.Column("care_case_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column(
            "actor_role",
            sa.Enum(
                "FARMER",
                "EXTENSION_OFFICER",
                "ADMIN",
                name="care_case_actor_role",
            ),
            nullable=True,
        ),
        sa.Column(
            "event_type",
            sa.Enum(
                "SYSTEM",
                "FARMER_UPDATE",
                "OFFICER_GUIDANCE",
                "STATUS_CHANGE",
                name="care_case_event_type",
            ),
            nullable=False,
        ),
        sa.Column(
            "trend",
            sa.Enum(
                "NEW",
                "IMPROVING",
                "SAME",
                "WORSENING",
                name="care_case_update_trend",
            ),
            nullable=True,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("recommendation", sa.Text(), nullable=True),
        sa.Column("diagnosis_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["care_case_id"], ["care_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["diagnosis_id"], ["diagnoses.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_care_case_updates_care_case_id"),
        "care_case_updates",
        ["care_case_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_care_case_updates_care_case_id"), table_name="care_case_updates")
    op.drop_table("care_case_updates")
    op.drop_index(op.f("ix_care_cases_next_follow_up_at"), table_name="care_cases")
    op.drop_index(op.f("ix_care_cases_priority"), table_name="care_cases")
    op.drop_index(op.f("ix_care_cases_status"), table_name="care_cases")
    op.drop_index(op.f("ix_care_cases_farmer_id"), table_name="care_cases")
    op.drop_index(op.f("ix_care_cases_field_id"), table_name="care_cases")
    op.drop_table("care_cases")

