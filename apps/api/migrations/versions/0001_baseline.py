"""Frozen initial schema for fresh database deployments.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-08-24

Fresh installs apply the frozen pre-factory schema, then subsequent revisions.
Existing databases already stamped at this revision are not modified.

Existing deployments should run once:
    alembic stamp head   # if bootstrap already created the schema
"""
from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(Path(__file__).with_name("0001_schema.sql").read_text())


def downgrade() -> None:
    raise RuntimeError("The baseline is irreversible; restore a database backup instead.")
