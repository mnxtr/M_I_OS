"""Baseline — schema is created by app bootstrap (Base.metadata.create_all).

Revision ID: 0001_baseline
Revises:
Create Date: 2026-08-24

This migration intentionally has no operations. Fresh installs get the full schema
from the application bootstrap (idempotent create_all + RLS policies + generated
columns). From this point forward, every schema change MUST be expressed as an
alembic revision so existing deployments can `alembic upgrade head`.

Existing deployments should run once:
    alembic stamp head   # if bootstrap already created the schema
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
