import asyncio
import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import CurrentUser, DbDep
from app.models import TableSource, Tenant
from app.services.llm import ANALYTICS_SYSTEM_PROMPT
from app.services.plans import METRIC_ANALYTICS, enforce_quota, record_usage
from app.services.sqlguard import (
    SQLValidationError,
    validate_sql,
    virtual_schema_ddl,
    wrap_with_limit,
)
from app.services.tabular import fetch_rows_json

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])


class TableOut(BaseModel):
    id: uuid.UUID
    name: str
    sheet_name: str
    columns: list[dict]
    row_count: int


class QueryIn(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    table_id: uuid.UUID | None = None


class QueryOut(BaseModel):
    answer: str
    sql: str
    columns: list[str]
    rows: list[dict]
    row_count: int


@router.get("/tables", response_model=list[TableOut])
def list_tables(user: CurrentUser, db: DbDep) -> list[TableOut]:
    sources = db.query(TableSource).order_by(TableSource.created_at.desc()).all()
    return [
        TableOut(
            id=s.id,
            name=s.name,
            sheet_name=s.sheet_name,
            columns=s.columns,
            row_count=s.row_count,
        )
        for s in sources
    ]


def _resolve_tables(db: Session, tenant_id: uuid.UUID, table_id: uuid.UUID | None) -> list:
    if table_id is not None:
        source = db.get(TableSource, table_id)
        if source is None or source.tenant_id != tenant_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Table not found")
        return [source]
    sources = list(db.query(TableSource).all())
    if not sources:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No data tables yet — upload an Excel/CSV production sheet first.",
        )
    return sources


def _build_schema_context(db: Session, tenant_id: uuid.UUID, sources: list) -> str:
    parts = []
    for source in sources:
        ddl = virtual_schema_ddl(source.columns)
        sample_rows = json.loads(fetch_rows_json(db, tenant_id, source.id, 5))
        sample = json.dumps(sample_rows, ensure_ascii=False, default=str)
        parts.append(
            f"Table id: {source.id}\nName: {source.name} ({source.row_count} rows)\n"
            f"Virtual DDL: {ddl}\nSample rows (JSON): {sample}"
        )
    return "\n\n".join(parts)


def _call_llm_sync(system: str, prompt: str) -> str:
    settings = get_settings()
    if settings.llm_provider == "openai" and settings.openai_api_key:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.0,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return completion.choices[0].message.content or ""
    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=800,
            temperature=0.0,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in message.content if block.type == "text")
    raise HTTPException(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Analytics requires an LLM provider. Set LLM_PROVIDER and its API key.",
    )


def generate_sql(db: Session, tenant_id: uuid.UUID, question: str, sources: list) -> str:
    context = _build_schema_context(db, tenant_id, sources)
    prompt = (
        "You are a PostgreSQL query generator for factory production data.\n"
        "Write ONE read-only SELECT statement against the table alias `t` only.\n"
        "Rules: no DDL/DML, no comments, no semicolons, reference ONLY the listed columns.\n"
        "Dates are stored as ISO-8601 text.\n\n"
        f"{context}\n\nQuestion: {question}\n\nReturn only the SQL."
    )
    raw = _call_llm_sync(ANALYTICS_SYSTEM_PROMPT, prompt).strip()
    if raw.startswith("```"):
        raw = "\n".join(line for line in raw.splitlines() if not line.strip().startswith("```"))
    try:
        validated = validate_sql(raw)
    except SQLValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Generated SQL rejected by guardrails: {exc}",
        ) from exc
    return wrap_with_limit(validated)


def execute_bounded(db: Session, sql: str) -> list[dict]:
    settings = get_settings()
    result = db.execute(
        text(f"SET LOCAL statement_timeout = {settings.analytics_timeout_ms}; {sql}")
    )
    return [dict(row_mapping) for row_mapping in result.mappings().all()]


async def synthesize_stream(question: str, sql: str, rows: list[dict]) -> AsyncIterator[str]:
    """Stream a natural-language synthesis of query results."""
    settings = get_settings()
    results_text = json.dumps(rows[:50], ensure_ascii=False, default=str)
    user_content = f"Question: {question}\nSQL executed:\n{sql}\n\nResults JSON:\n{results_text}"

    if settings.llm_provider == "openai" and settings.openai_api_key:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        stream = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            stream=True,
            messages=[
                {"role": "system", "content": ANALYTICS_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )
        for event in stream:
            delta = event.choices[0].delta.content if event.choices else None
            if delta:
                yield delta
        return

    if settings.llm_provider == "anthropic" and settings.anthropic_api_key:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        with client.messages.stream(
            model="claude-sonnet-4-5",
            max_tokens=1200,
            temperature=0.1,
            system=ANALYTICS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            for token in stream.text_stream:
                yield token
        return

    summary = f"Query executed ({len(rows)} rows).\n" + json.dumps(
        rows[:20], ensure_ascii=False, indent=1, default=str
    )
    for chunk_start in range(0, len(summary), 80):
        yield summary[chunk_start : chunk_start + 80]


def _meter_analytics(db, user: CurrentUser) -> None:
    tenant = db.get(Tenant, user.tenant_id)
    plan = tenant.plan if tenant else "trial"
    enforce_quota(db, user.tenant_id, plan, METRIC_ANALYTICS)
    record_usage(db, user.tenant_id, METRIC_ANALYTICS)


@router.post("/query", response_model=QueryOut)
def run_query(payload: QueryIn, user: CurrentUser, db: DbDep) -> QueryOut:
    _meter_analytics(db, user)
    sources = _resolve_tables(db, user.tenant_id, payload.table_id)
    sql = generate_sql(db, user.tenant_id, payload.question, sources)
    rows = execute_bounded(db, sql)

    answer = asyncio.run(_collect(synthesize_stream(payload.question, sql, rows)))
    columns = list(rows[0].keys()) if rows else []
    return QueryOut(answer=answer, sql=sql, columns=columns, rows=rows, row_count=len(rows))


@router.post("/query/stream")
def run_query_stream(payload: QueryIn, user: CurrentUser, db: DbDep) -> StreamingResponse:
    _meter_analytics(db, user)
    sources = _resolve_tables(db, user.tenant_id, payload.table_id)
    sql = generate_sql(db, user.tenant_id, payload.question, sources)
    rows = execute_bounded(db, sql)

    def sse_event(event_type: str, payload_data) -> str:
        body = json.dumps({"type": event_type, **payload_data}, ensure_ascii=False, default=str)
        return f"data: {body}\n\n"

    async def event_stream() -> AsyncIterator[str]:
        yield sse_event("sql", {"sql": sql})
        yield sse_event("rows", {"count": len(rows), "preview": rows[:10]})
        async for token in synthesize_stream(payload.question, sql, rows):
            yield sse_event("token", {"value": token})
        yield sse_event("done", {})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


async def _collect(stream: AsyncIterator[str]) -> str:
    return "".join([token async for token in stream])
