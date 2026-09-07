from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.db import Base, engine
from app.models import Chunk  # noqa: F401 — ensure models registered before create_all
from app.routers import (
    analytics,
    auth,
    chat,
    compliance,
    connectors,
    dashboard,
    documents,
    guest,
    operations,
    payment_sandbox,
    payments,
    production_drafts,
    tenant,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if get_settings().dev_bootstrap_schema:
        _init_schema()
    yield


def _init_schema() -> None:
    """Dev bootstrap: create tables, vector/tsvector columns, RLS policies.
    (Alembic migrations replace this in Phase 2.)"""
    settings = get_settings()
    with engine.begin() as conn:
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "vector"'))
    # Draft storage is migration-only so bootstrap cannot create it without its RLS/grants.
    Base.metadata.create_all(
        engine,
        tables=[
            table for table in Base.metadata.sorted_tables if table.name != "production_drafts"
        ],
    )
    from app.models import apply_rls

    apply_rls()
    statements = [
        f"ALTER TABLE chunks ADD COLUMN IF NOT EXISTS embedding vector({settings.embedding_dim})",
        "ALTER TABLE chunks ADD COLUMN IF NOT EXISTS content_tsv tsvector "
        "GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED",
        "CREATE INDEX IF NOT EXISTS ix_chunks_tsv ON chunks USING GIN (content_tsv)",
        "CREATE INDEX IF NOT EXISTS ix_chunks_embedding "
        "ON chunks USING hnsw (embedding vector_cosine_ops)",
    ]
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


def create_app() -> FastAPI:
    app = FastAPI(title="Lineora API", version="0.2.0", lifespan=lifespan)
    if get_settings().cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=get_settings().cors_origins,
            allow_methods=["GET", "POST", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
        )
    app.include_router(auth.router)
    app.include_router(documents.router)
    app.include_router(dashboard.router)
    app.include_router(operations.router)
    app.include_router(production_drafts.router)
    app.include_router(chat.router)
    app.include_router(analytics.router)
    app.include_router(compliance.router)
    app.include_router(guest.router)
    app.include_router(tenant.router)
    app.include_router(connectors.router)
    app.include_router(payments.router)
    app.include_router(payment_sandbox.router)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "service": "mios-api"}

    return app


app = create_app()
