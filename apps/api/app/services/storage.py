from __future__ import annotations

from urllib.parse import quote

import httpx

from app.config import get_settings


class StorageError(RuntimeError):
    pass


def storage_configured() -> bool:
    settings = get_settings()
    return bool(settings.supabase_url and settings.supabase_secret_key)


def _object_url(path: str) -> str:
    settings = get_settings()
    if not storage_configured():
        raise StorageError("Supabase Storage is not configured")
    clean_path = path.strip("/")
    if not clean_path or ".." in clean_path.split("/"):
        raise StorageError("Invalid storage path")
    encoded_path = quote(clean_path, safe="/")
    return f"{settings.supabase_url.rstrip('/')}/storage/v1/object/documents/{encoded_path}"


def _headers(content_type: str | None = None) -> dict[str, str]:
    settings = get_settings()
    headers = {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def upload_object(
    path: str,
    content: bytes,
    content_type: str = "application/octet-stream",
) -> None:
    try:
        response = httpx.post(
            _object_url(path),
            headers={**_headers(content_type), "x-upsert": "false"},
            content=content,
            timeout=60.0,
        )
    except httpx.HTTPError as exc:
        raise StorageError("Could not reach Supabase Storage") from exc
    if response.status_code >= 300:
        raise StorageError(f"Storage upload failed ({response.status_code})")


def download_object(path: str) -> bytes:
    try:
        response = httpx.get(_object_url(path), headers=_headers(), timeout=60.0)
    except httpx.HTTPError as exc:
        raise StorageError("Could not reach Supabase Storage") from exc
    if response.status_code >= 300:
        raise StorageError(f"Storage download failed ({response.status_code})")
    return response.content


def delete_object(path: str) -> None:
    try:
        response = httpx.delete(_object_url(path), headers=_headers(), timeout=30.0)
    except httpx.HTTPError as exc:
        raise StorageError("Could not reach Supabase Storage") from exc
    if response.status_code >= 300:
        raise StorageError(f"Storage deletion failed ({response.status_code})")
