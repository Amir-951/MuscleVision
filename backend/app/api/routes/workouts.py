import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from redis import Redis
from rq import Queue

from ...core.config import settings
from ...core.database import fetch_one, fetch_all, execute
from ...workers.video_processor import process_video_job

router = APIRouter(prefix="/workouts", tags=["workouts"])

redis_conn = Redis.from_url(settings.redis_url)
job_queue = Queue("video_processing", connection=redis_conn)


class UploadRequest(BaseModel):
    video_url: str
    user_id: str
    source: str = "upload"
    video_format: Optional[str] = None


class UploadResponse(BaseModel):
    job_id: str
    session_id: str
    video_url: Optional[str] = None


def _public_upload_url(session_id: str, filename: str) -> str:
    return (
        f"{settings.public_base_url.rstrip('/')}/static/uploads/"
        f"{session_id}/{filename}"
    )


def _create_session(
    session_id: str,
    user_id: str,
    video_url: str,
    source: str,
    video_format: Optional[str],
):
    execute(
        """
        INSERT INTO workout_sessions
            (id, user_id, video_url, source, video_format, status, created_at)
        VALUES (%s, %s, %s, %s, %s, 'pending', NOW())
        """,
        (session_id, user_id, video_url, source, video_format),
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_workout(body: UploadRequest):
    session_id = str(uuid.uuid4())
    _create_session(
        session_id=session_id,
        user_id=body.user_id,
        video_url=body.video_url,
        source=body.source,
        video_format=body.video_format,
    )

    job = job_queue.enqueue(
        process_video_job,
        session_id=session_id,
        video_source=body.video_url,
        job_timeout=600,
    )

    return UploadResponse(job_id=job.id, session_id=session_id, video_url=body.video_url)


@router.post("/upload-file", response_model=UploadResponse)
async def upload_workout_file(
    user_id: str = Form(...),
    source: str = Form("upload"),
    video_format: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    session_id = str(uuid.uuid4())
    suffix = Path(file.filename or "capture.webm").suffix or ".webm"
    filename = f"source{suffix.lower()}"
    upload_dir = Path(settings.local_storage_path) / "uploads" / session_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    upload_path = upload_dir / filename

    with upload_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    public_url = _public_upload_url(session_id, filename)
    _create_session(
        session_id=session_id,
        user_id=user_id,
        video_url=public_url,
        source=source,
        video_format=video_format or file.content_type,
    )

    job = job_queue.enqueue(
        process_video_job,
        session_id=session_id,
        video_source=str(upload_path),
        job_timeout=600,
    )
    return UploadResponse(job_id=job.id, session_id=session_id, video_url=public_url)


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    from rq.job import Job
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        raise HTTPException(status_code=404, detail="Job not found")

    status_map = {
        "queued": "pending",
        "started": "processing",
        "finished": "done",
        "failed": "error",
    }

    meta = job.meta or {}
    return {
        "status": status_map.get(job.get_status(), "pending"),
        "progress": meta.get("progress", 0.0),
        "message": meta.get("message", "En attente…"),
    }


@router.get("/results/{session_id}")
async def get_workout_result(session_id: str):
    session = fetch_one(
        "SELECT * FROM workout_sessions WHERE id = %s", (session_id,)
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] != "done":
        raise HTTPException(status_code=202, detail="Processing not complete")

    muscles = fetch_all(
        "SELECT muscle_name, engagement_value FROM muscle_engagement WHERE session_id = %s",
        (session_id,),
    )
    muscle_engagement = {m["muscle_name"]: float(m["engagement_value"]) for m in muscles}

    return {
        "session_id": session_id,
        "source": session.get("source"),
        "video_url": session.get("video_url"),
        "exercise_type": session["exercise_type"],
        "correctness_score": session["correctness_score"],
        "duration_seconds": session.get("duration_seconds"),
        "analysis_text": session.get("analysis_text"),
        "analysis_artifact_url": session.get("analysis_artifact_url"),
        "keypoints_artifact_url": session.get("keypoints_artifact_url"),
        "rep_count": session.get("rep_count") or 0,
        "tempo": (
            f"{float(session['tempo_seconds']):.1f}s/rep"
            if session.get("tempo_seconds") is not None else "single_sequence"
        ),
        "symmetry_score": float(session.get("symmetry_score") or 0),
        "stability_score": float(session.get("stability_score") or 0),
        "feedback": session.get("feedback"),
        "muscle_engagement": muscle_engagement,
    }


@router.get("/history")
async def get_workout_history(user_id: str):
    sessions = fetch_all(
        """
        SELECT id, source, exercise_type, correctness_score, duration_seconds,
               created_at, status, rep_count, symmetry_score, stability_score, feedback
        FROM workout_sessions
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 20
        """,
        (user_id,),
    )
    return {"sessions": sessions}
