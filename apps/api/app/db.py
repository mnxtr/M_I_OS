import uuid

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _make_engine():
    settings = get_settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True)

    @event.listens_for(engine, "connect")
    def _register_type(dbapi_connection, _record):  # noqa: ANN001
        if not settings.create_vector_extension:
            return
        cursor = dbapi_connection.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
        cursor.close()

    return engine


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def set_tenant(db, tenant_id: uuid.UUID) -> None:
    """Set Postgres RLS context for the current transaction."""
    db.execute(
        text("SELECT set_config('app.tenant_id', :tid, true)"),
        {"tid": str(tenant_id)},
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
