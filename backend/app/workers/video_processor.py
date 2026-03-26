"""
Worker RQ pour le traitement asynchrone des vidéos.
Exécuté par les workers Redis Queue séparément de FastAPI.
"""
import os
import tempfile
from pathlib import Path

import httpx
from rq import get_current_job

from ..core.database import execute
from ..services.artifact_storage import store_json_artifact, store_text_artifact
from ..services.movement_analysis import build_frame_snapshot, summarize_motion_sequence
from ..services.pose_analysis import (
    compute_muscle_engagement,
    compute_correctness_score,
    detect_exercise_type,
)
from ..services.text_ai import generate_workout_feedback


def update_job_progress(progress: float, message: str):
    job = get_current_job()
    if job:
        job.meta["progress"] = progress
        job.meta["message"] = message
        job.save_meta()


def _resolve_video_source(video_source: str) -> tuple[str, bool]:
    source_path = Path(video_source)
    if source_path.exists():
        return str(source_path), False

    with httpx.Client(timeout=60) as http:
        response = http.get(video_source)
        response.raise_for_status()

    suffix = Path(video_source).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(response.content)
        return tmp.name, True


def process_video_job(session_id: str, video_source: str):
    """
    Job principal : télécharge la vidéo, extrait les keypoints,
    calcule l'engagement musculaire, écrit en base.
    """
    # Charger MediaPipe/OpenCV au moment du job limite les effets de bord
    # dans les processus qui importent simplement le module.
    import cv2
    import mediapipe as mp

    execute(
        "UPDATE workout_sessions SET status = 'processing' WHERE id = %s",
        (session_id,),
    )
    update_job_progress(0.05, "Téléchargement de la vidéo…")
    tmp_path, should_delete = _resolve_video_source(video_source)

    try:
        update_job_progress(0.15, "Détection des keypoints…")

        cap = cv2.VideoCapture(tmp_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_interval = max(1, int(fps / 10))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        mp_pose = mp.solutions.pose
        all_engagements = []
        keypoint_frames = []
        frame_idx = 0

        with mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ) as pose:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % frame_interval == 0:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = pose.process(rgb)

                    if results.pose_landmarks:
                        eng = compute_muscle_engagement(results.pose_landmarks)
                        all_engagements.append(eng)
                        keypoint_frames.append(
                            build_frame_snapshot(results.pose_landmarks, frame_idx / max(fps, 1))
                        )

                    progress = 0.15 + (frame_idx / max(total_frames, 1)) * 0.60
                    if frame_idx % (frame_interval * 10) == 0:
                        update_job_progress(progress, "Calcul de l'activation musculaire…")

                frame_idx += 1

        cap.release()

        if not all_engagements:
            raise ValueError("Aucun mouvement humain exploitable détecté dans la vidéo.")

        update_job_progress(0.80, "Calcul du score…")

        all_muscles = set()
        for eng in all_engagements:
            all_muscles.update(eng.keys())

        avg_engagement = {
            muscle: round(
                sum(e.get(muscle, 0) for e in all_engagements) / len(all_engagements), 3
            )
            for muscle in all_muscles
        }

        exercise_type = detect_exercise_type(all_engagements)
        score = compute_correctness_score(all_engagements, exercise_type)
        duration_seconds = int(total_frames / max(fps, 1))
        motion_report = summarize_motion_sequence(
            frames=keypoint_frames,
            all_engagements=all_engagements,
            exercise_type=exercise_type,
            correctness_score=score,
            duration_seconds=duration_seconds,
        )
        analysis_text = motion_report["analysis_text"]

        update_job_progress(0.88, "Génération du résumé biomécanique…")
        keypoints_artifact_url = store_json_artifact(
            session_id,
            "keypoints.json",
            {
                "session_id": session_id,
                "frames": keypoint_frames,
            },
        )
        analysis_artifact_url = store_text_artifact(session_id, "analysis.txt", analysis_text)
        feedback = generate_workout_feedback(
            analysis_text=analysis_text,
            exercise_type=exercise_type,
            score=score,
            symmetry_score=motion_report["symmetry_score"],
            stability_score=motion_report["stability_score"],
            rep_count=motion_report["rep_count"],
            alerts=motion_report["alerts"],
        )

        update_job_progress(0.93, "Enregistrement des résultats…")

        execute(
            """
            UPDATE workout_sessions
            SET status = 'done',
                exercise_type = %s,
                correctness_score = %s,
                duration_seconds = %s,
                analysis_text = %s,
                analysis_artifact_url = %s,
                keypoints_artifact_url = %s,
                feedback = %s,
                rep_count = %s,
                tempo_seconds = %s,
                symmetry_score = %s,
                stability_score = %s,
                processed_at = NOW()
            WHERE id = %s
            """,
            (
                exercise_type,
                score,
                duration_seconds,
                analysis_text,
                analysis_artifact_url,
                keypoints_artifact_url,
                feedback,
                motion_report["rep_count"],
                motion_report["tempo_seconds"],
                motion_report["symmetry_score"],
                motion_report["stability_score"],
                session_id,
            ),
        )

        execute(
            "DELETE FROM muscle_engagement WHERE session_id = %s",
            (session_id,),
        )
        for muscle_name, engagement_value in avg_engagement.items():
            execute(
                """
                INSERT INTO muscle_engagement (id, session_id, muscle_name, engagement_value)
                VALUES (gen_random_uuid(), %s, %s, %s)
                ON CONFLICT (session_id, muscle_name)
                DO UPDATE SET engagement_value = EXCLUDED.engagement_value
                """,
                (session_id, muscle_name, engagement_value),
            )

        update_job_progress(1.0, "Analyse terminée !")

    except Exception as exc:
        execute(
            """
            UPDATE workout_sessions
            SET status = 'error',
                feedback = %s,
                processed_at = NOW()
            WHERE id = %s
            """,
            (str(exc), session_id),
        )
        update_job_progress(1.0, str(exc))
        raise

    finally:
        if should_delete and os.path.exists(tmp_path):
            os.unlink(tmp_path)
