"""Celery worker entrypoint.

Run standalone in production:
    cd apps/api && celery -A app.worker worker -l info

The base install does not require celery; it is an optional extra:
    pip install -e ".[worker]"

When USE_CELERY=false (default dev mode), document processing runs inline via
FastAPI BackgroundTasks — no broker needed.
"""

from __future__ import annotations

from app.config import get_settings


def make_celery():
    from celery import Celery

    settings = get_settings()
    app = Celery(
        "mios",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["app.worker"],
    )
    app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="Asia/Dhaka",
        enable_utc=True,
        task_track_started=True,
    )
    return app


celery_app = None
try:  # optional dependency — absent in slim installs
    celery_app = make_celery()
except Exception:  # noqa: BLE001 — kombu/broker import errors degrade gracefully
    celery_app = None


if celery_app is not None:

    @celery_app.task(name="mios.process_document", ignore_result=True)
    def process_document_task(document_id: str) -> None:
        import uuid as uuid_lib

        from app.routers.documents import process_document

        process_document(uuid_lib.UUID(document_id))
