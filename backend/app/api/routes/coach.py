import json
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from groq import GroqError
from pydantic import BaseModel

from ...core.database import fetch_one, fetch_all, execute
from ...services.live_coach import analyze_live_samples, build_live_sample, normalize_live_samples
from ...services.coach_ai import COACH_PERSONAS, build_messages
from ...services.text_ai import complete_chat

router = APIRouter(prefix="/coach", tags=["coach"])


class MessageRequest(BaseModel):
    coach_id: str
    user_id: str
    message: str
    session_id: Optional[str] = None
    workout_context: Optional[dict] = None


@router.post("/message")
async def send_message(body: MessageRequest):
    if body.coach_id not in COACH_PERSONAS:
        raise HTTPException(status_code=400, detail="Unknown coach ID")

    # Récupérer ou créer la conversation
    convo = fetch_one(
        "SELECT id FROM coach_conversations WHERE user_id = %s AND coach_id = %s",
        (body.user_id, body.coach_id),
    )
    if not convo:
        convo_id = str(uuid.uuid4())
        execute(
            "INSERT INTO coach_conversations (id, user_id, coach_id) VALUES (%s, %s, %s)",
            (convo_id, body.user_id, body.coach_id),
        )
    else:
        convo_id = convo["id"]

    # Récupérer les 20 derniers messages pour le contexte
    history = fetch_all(
        """
        SELECT role, content FROM coach_messages
        WHERE conversation_id = %s
        ORDER BY created_at DESC LIMIT 20
        """,
        (convo_id,),
    )
    history = list(reversed(history))  # ordre chronologique

    workout_context = body.workout_context or None
    if body.session_id:
        session = fetch_one(
            """
            SELECT id, exercise_type, correctness_score, analysis_text, feedback
            FROM workout_sessions
            WHERE id = %s AND user_id = %s
            """,
            (body.session_id, body.user_id),
        )
        if session:
            workout_context = {
                "session_id": session["id"],
                "exercise_type": session.get("exercise_type"),
                "correctness_score": session.get("correctness_score"),
                "analysis_text": session.get("analysis_text"),
                "feedback": session.get("feedback"),
            }

    # Sauvegarder le message utilisateur
    execute(
        """
        INSERT INTO coach_messages (id, conversation_id, role, content, workout_context, created_at)
        VALUES (%s, %s, 'user', %s, %s, NOW())
        """,
        (
            str(uuid.uuid4()),
            convo_id,
            body.message,
            json.dumps(workout_context) if workout_context else None,
        ),
    )

    messages = build_messages(history, body.message, workout_context)
    persona = COACH_PERSONAS[body.coach_id]
    try:
        reply = complete_chat(
            system_prompt=persona["system_prompt"],
            messages=messages,
            max_tokens=320,
        )
    except GroqError as exc:
        raise HTTPException(
            status_code=502,
            detail="Le provider IA du coach ne répond pas actuellement.",
        ) from exc

    if not reply:
        reply = (
            "Je peux t'aider à partir de tes données de séance, "
            "mais aucun provider IA texte n'est configuré sur ce backend."
        )

    # Sauvegarder la réponse du coach
    execute(
        """
        INSERT INTO coach_messages (id, conversation_id, role, content, created_at)
        VALUES (%s, %s, 'assistant', %s, NOW())
        """,
        (str(uuid.uuid4()), convo_id, reply),
    )

    return {"reply": reply, "coach_id": body.coach_id, "session_id": body.session_id}


@router.get("/history/{coach_id}")
async def get_history(coach_id: str, user_id: str):
    convo = fetch_one(
        "SELECT id FROM coach_conversations WHERE user_id = %s AND coach_id = %s",
        (user_id, coach_id),
    )
    if not convo:
        return {"messages": []}

    messages = fetch_all(
        """
        SELECT id, role, content, created_at FROM coach_messages
        WHERE conversation_id = %s
        ORDER BY created_at ASC
        """,
        (convo["id"],),
    )
    return {"messages": messages}


@router.delete("/history/{coach_id}")
async def clear_history(coach_id: str, user_id: str):
    convo = fetch_one(
        "SELECT id FROM coach_conversations WHERE user_id = %s AND coach_id = %s",
        (user_id, coach_id),
    )
    if convo:
        execute(
            "DELETE FROM coach_messages WHERE conversation_id = %s",
            (convo["id"],),
        )
    return {"success": True}


@router.post("/live-feedback")
async def live_feedback(
    coach_id: str = Form(...),
    user_id: str = Form(...),
    exercise_hint: str = Form("auto"),
    last_rep_count: int = Form(0),
    timestamp_seconds: float = Form(0.0),
    samples_json: str = Form("[]"),
    frame: UploadFile = File(...),
):
    if coach_id not in COACH_PERSONAS:
        raise HTTPException(status_code=400, detail="Unknown coach ID")

    try:
        raw_samples = json.loads(samples_json)
        if not isinstance(raw_samples, list):
            raw_samples = []
    except json.JSONDecodeError:
        raw_samples = []

    try:
        image_bytes = await frame.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Frame webcam vide.")

        import cv2
        import mediapipe as mp
        import numpy as np

        image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="Frame webcam invalide.")

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_pose = mp.solutions.pose

        with mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.55,
        ) as pose:
            results = pose.process(rgb)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Analyse live impossible: {str(exc)}",
        ) from exc

    if not results.pose_landmarks:
        return {
            "detected": False,
            "headline": "Cadre le corps.",
            "body": "Recule un peu et garde le corps entier visible.",
            "voice": "Je ne vois pas encore ton corps entier. Recule un peu et garde-toi au centre.",
            "message": "Je ne vois pas encore ton corps entier. Recule un peu et garde-toi au centre.",
            "exercise_type": exercise_hint if exercise_hint != "auto" else "unknown",
            "rep_count": max(0, int(last_rep_count)),
            "rep_delta": 0,
            "sample": None,
            "samples": normalize_live_samples(raw_samples),
            "pose_frame": None,
            "muscle_engagement": {},
            "alerts": [],
        }

    samples = normalize_live_samples(raw_samples)
    samples.append(build_live_sample(results.pose_landmarks, timestamp_seconds))
    payload = analyze_live_samples(
        samples=samples,
        coach_id=coach_id,
        exercise_hint=exercise_hint,
        last_rep_count=last_rep_count,
    )
    payload["user_id"] = user_id
    return payload
