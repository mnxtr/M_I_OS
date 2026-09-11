import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

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
    payments,
    tenant,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _init_schema()
    yield


def _init_schema() -> None:
    """Dev bootstrap: create tables, vector/tsvector columns, RLS policies.
    (Alembic migrations replace this in Phase 2.)"""
    settings = get_settings()
    if not settings.auto_create_schema:
        return
    with engine.begin() as conn:
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "vector"'))
    Base.metadata.create_all(engine)
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
    app = FastAPI(title="MIOS API", version="0.1.0", lifespan=lifespan)
    app.include_router(auth.router)
    app.include_router(dashboard.router)
    app.include_router(documents.router)
    app.include_router(chat.router)
    app.include_router(analytics.router)
    app.include_router(compliance.router)
    app.include_router(guest.router)
    app.include_router(tenant.router)
    app.include_router(connectors.router)
    app.include_router(payments.router)

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "service": "mios-api"}

    @app.get("/health/ready")
    def readiness() -> dict:
        """Readiness probe: required backing services are reachable."""
        settings = get_settings()
        dependencies = {"database": "ok"}
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except SQLAlchemyError:
            logger.warning("readiness check failed: database unavailable", exc_info=True)
            dependencies["database"] = "unavailable"

        if settings.use_celery:
            try:
                from redis import Redis

                Redis.from_url(settings.redis_url).ping()
                dependencies["redis"] = "ok"
            except Exception:
                logger.warning("readiness check failed: redis unavailable", exc_info=True)
                dependencies["redis"] = "unavailable"

        if any(value != "ok" for value in dependencies.values()):
            raise HTTPException(
                status_code=503,
                detail={"status": "not_ready", "service": "mios-api", "dependencies": dependencies},
            )
        return {"status": "ready", "service": "mios-api", "dependencies": dependencies}

    return app


app = create_app()
