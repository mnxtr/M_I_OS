import re

from app.config import get_settings

FORBIDDEN_PATTERN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|"
    r"analyze|call|do|set|reset|listen|notify|lock|reindex|cluster|comment|"
    r"pg_sleep|pg_read_file|lo_import|lo_export|dblink)\b",
    re.IGNORECASE,
)
COMMENT_PATTERN = re.compile(r"(--|/\*|\*/)")
ALLOWED_START = re.compile(r"^\s*(select|with)\b", re.IGNORECASE)


class SQLValidationError(ValueError):
    pass


def validate_sql(sql: str) -> str:
    """Validate a single read-only SELECT/WITH statement. Returns cleaned SQL."""
    cleaned = COMMENT_PATTERN.sub(" ", sql).strip().rstrip(";").strip()
    if not cleaned:
        raise SQLValidationError("Empty query")
    if ";" in cleaned:
        raise SQLValidationError("Multiple statements are not allowed")
    if not ALLOWED_START.match(cleaned):
        raise SQLValidationError("Only SELECT or WITH queries are allowed")
    match = FORBIDDEN_PATTERN.search(cleaned)
    if match:
        raise SQLValidationError(f"Forbidden keyword: {match.group(1).upper()}")
    return cleaned


def wrap_with_limit(sql: str, limit: int | None = None) -> str:
    """Wrap validated SQL in a bounded subquery — guarantees a single result set
    and a hard row cap regardless of what the inner query does."""
    settings = get_settings()
    effective = limit or settings.analytics_result_limit
    return f"SELECT * FROM ({sql}) AS mios_bounded LIMIT {effective}"


def virtual_schema_ddl(columns: list[dict]) -> str:
    """Render the tenant table's inferred schema as DDL for LLM prompting."""
    cols = ", ".join(f"{c['name']} {c['type']}" for c in columns)
    return f"CREATE TABLE t ({cols});"
