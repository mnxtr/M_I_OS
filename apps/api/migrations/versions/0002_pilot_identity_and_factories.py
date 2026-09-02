"""Pilot identity linkage, factories, memberships, and forced tenant RLS.

Revision ID: 0002_pilot_identity_and_factories
Revises: 0001_baseline
Create Date: 2026-09-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_pilot_identity_and_factories"
down_revision: str | None = "0001_baseline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_users_auth_user_id", "users", ["auth_user_id"], unique=True)
    op.create_table(
        "factories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("timezone", sa.String(80), nullable=False, server_default="Asia/Dhaka"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="BDT"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_factories_tenant_id", "factories", ["tenant_id"])
    op.create_table(
        "factory_memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("factory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="operator"),
        sa.Column(
            "capabilities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["factory_id"], ["factories.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_factory_memberships_factory_id", "factory_memberships", ["factory_id"])
    op.create_index("ix_factory_memberships_tenant_id", "factory_memberships", ["tenant_id"])
    op.create_index("ix_factory_memberships_user_id", "factory_memberships", ["user_id"])
    op.create_index(
        "ix_factory_membership_unique",
        "factory_memberships",
        ["factory_id", "user_id"],
        unique=True,
    )
    op.execute(
        "INSERT INTO factories (id, tenant_id, name, timezone, currency, is_active, created_at) "
        "SELECT gen_random_uuid(), id, name, 'Asia/Dhaka', 'BDT', true, now() FROM tenants"
    )
    op.execute(
        "INSERT INTO factory_memberships "
        "(id, tenant_id, factory_id, user_id, role, capabilities, is_active, created_at) "
        "SELECT gen_random_uuid(), u.tenant_id, f.id, u.id, u.role::text, "
        "CASE WHEN u.role::text IN ('owner', 'admin') THEN "
        "'[\"dashboard\",\"production\",\"quality\",\"compliance\",\"maintenance\","
        "\"actions\",\"evidence\"]'::jsonb "
        "WHEN u.role::text = 'compliance_manager' THEN "
        "'[\"dashboard\",\"compliance\",\"actions\",\"evidence\"]'::jsonb "
        "WHEN u.role::text = 'production_manager' THEN "
        "'[\"dashboard\",\"production\",\"quality\",\"actions\",\"evidence\"]'::jsonb "
        "ELSE '[\"dashboard\",\"production\",\"actions\",\"evidence\"]'::jsonb END, "
        "u.is_active, now() FROM users u JOIN factories f ON f.tenant_id = u.tenant_id"
    )
    for table in ("factories", "factory_memberships"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            "USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid) "
            "WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)"
        )
    for table in (
        "documents", "chunks", "table_sources", "table_rows", "assessments",
        "assessment_items", "guest_tokens", "monthly_usage", "payments",
    ):
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    for table in ("factory_memberships", "factories"):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    op.drop_table("factory_memberships")
    op.drop_table("factories")
    op.drop_index("ix_users_auth_user_id", table_name="users")
    op.drop_column("users", "auth_user_id")
