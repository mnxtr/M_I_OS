"""Private production drafts with optimistic revision checks.

Revision ID: 0002_production_drafts
Revises: 0001_baseline
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_production_drafts"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "production_drafts",
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("tenant_id", "user_id"),
        sa.CheckConstraint("revision >= 1", name="ck_production_drafts_revision"),
    )
    op.execute("ALTER TABLE production_drafts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE production_drafts FORCE ROW LEVEL SECURITY")
    op.execute("""CREATE POLICY draft_owner ON production_drafts
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
          AND user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
          AND user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)""")
    op.execute("REVOKE ALL ON production_drafts FROM PUBLIC")
    # Supabase default grants may expose new public-schema tables. This is API-server-only.
    op.execute("""DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
            REVOKE ALL ON production_drafts FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            REVOKE ALL ON production_drafts FROM authenticated;
        END IF;
    END $$""")


def downgrade():
    op.drop_table("production_drafts")
