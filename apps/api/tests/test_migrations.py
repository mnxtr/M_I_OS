"""Verify the migrated schema using an isolated, explicitly configured test database."""

import os
import uuid

import pytest
from sqlalchemy import create_engine, insert, text

from app.models import Document


@pytest.mark.skipif(not os.environ.get("MIOS_TEST_DSN"), reason="MIOS_TEST_DSN is not configured")
def test_migrated_documents_enforce_tenant_isolation():
    engine = create_engine(os.environ["MIOS_TEST_DSN"])
    tenant_a, tenant_b = uuid.uuid4(), uuid.uuid4()
    role = f"mios_rls_{uuid.uuid4().hex}"
    try:
        with engine.connect() as conn:
            transaction = conn.begin()
            try:
                for tenant_id in (tenant_a, tenant_b):
                    conn.execute(
                        insert(Document).values(tenant_id=tenant_id, filename="rls-test.txt")
                    )
                conn.execute(text(f'CREATE ROLE "{role}" NOLOGIN'))
                conn.execute(text(f'GRANT SELECT ON documents TO "{role}"'))
                conn.execute(text(f'SET LOCAL ROLE "{role}"'))
                assert conn.execute(text("SELECT id FROM documents")).all() == []
                for tenant_id in (tenant_a, tenant_b):
                    conn.execute(
                        text("SELECT set_config('app.tenant_id', :tenant, true)"),
                        {"tenant": str(tenant_id)},
                    )
                    rows = conn.execute(text("SELECT tenant_id FROM documents")).scalars().all()
                    assert rows == [tenant_id]
            finally:
                transaction.rollback()  # Remove test data, grants and role together.
    finally:
        engine.dispose()
