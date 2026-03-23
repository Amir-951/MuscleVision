import json
from pathlib import Path
from typing import Any

import httpx

from ..core.config import settings


def _base_url() -> str:
    return settings.public_base_url.rstrip("/")


def _local_root() -> Path:
    root = Path(settings.local_storage_path) / "analysis"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _store_local(session_id: str, filename: str, payload: bytes) -> str:
    target_dir = _local_root() / session_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / filename
    target.write_bytes(payload)
    return f"{_base_url()}/static/analysis/{session_id}/{filename}"


def _store_supabase(session_id: str, filename: str, payload: bytes, content_type: str) -> str:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase storage is not configured")

    artifact_path = f"{session_id}/{filename}"
    upload_url = (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
        f"{settings.analysis_bucket}/{artifact_path}"
    )

    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    with httpx.Client(timeout=30) as http:
        response = http.post(upload_url, headers=headers, content=payload)
        response.raise_for_status()

    return (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
        f"{settings.analysis_bucket}/{artifact_path}"
    )


def store_text_artifact(session_id: str, filename: str, text: str) -> str:
    payload = text.encode("utf-8")
    if settings.analysis_storage_mode == "supabase":
        try:
            return _store_supabase(session_id, filename, payload, "text/plain; charset=utf-8")
        except Exception:
            pass
    return _store_local(session_id, filename, payload)


def store_json_artifact(session_id: str, filename: str, data: dict[str, Any]) -> str:
    payload = json.dumps(data, ensure_ascii=True, indent=2).encode("utf-8")
    if settings.analysis_storage_mode == "supabase":
        try:
            return _store_supabase(session_id, filename, payload, "application/json")
        except Exception:
            pass
    return _store_local(session_id, filename, payload)
