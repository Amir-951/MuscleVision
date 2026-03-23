from typing import Optional

from groq import Groq

from ..core.config import settings


def _client() -> Optional[Groq]:
    if settings.ai_provider != "groq" or not settings.groq_api_key:
        return None
    return Groq(api_key=settings.groq_api_key)


def complete_chat(
    system_prompt: str,
    messages: list[dict],
    max_tokens: int = 512,
) -> Optional[str]:
    client = _client()
    if not client:
        return None

    response = client.chat.completions.create(
        model=settings.groq_text_model,
        max_tokens=max_tokens,
        messages=[{"role": "system", "content": system_prompt}, *messages],
    )
    return response.choices[0].message.content


def fallback_workout_feedback(
    exercise_type: str,
    score: int,
    symmetry_score: float,
    stability_score: float,
    rep_count: int,
    alerts: list[str],
) -> str:
    alerts_text = ", ".join(alerts[:2]) if alerts else "aucune alerte majeure"
    return (
        f"Exercice détecté: {exercise_type}. "
        f"Score global {score}/100 sur {rep_count or 1} séquence(s). "
        f"Symétrie {round(symmetry_score * 100)}% et stabilité {round(stability_score * 100)}%. "
        f"Point d'attention principal: {alerts_text}."
    )


def generate_workout_feedback(
    analysis_text: str,
    exercise_type: str,
    score: int,
    symmetry_score: float,
    stability_score: float,
    rep_count: int,
    alerts: list[str],
) -> str:
    system_prompt = (
        "Tu es un coach biomécanique précis. "
        "Réponds en français en 4 phrases maximum. "
        "Base-toi uniquement sur le résumé biomécanique fourni. "
        "Commence par une observation claire, puis une correction prioritaire."
    )
    user_prompt = (
        "Transforme ce résumé biomécanique compact en feedback compréhensible "
        "pour un sportif:\n\n"
        f"{analysis_text}"
    )
    reply = complete_chat(system_prompt, [{"role": "user", "content": user_prompt}], max_tokens=220)
    if reply:
        return reply
    return fallback_workout_feedback(
        exercise_type=exercise_type,
        score=score,
        symmetry_score=symmetry_score,
        stability_score=stability_score,
        rep_count=rep_count,
        alerts=alerts,
    )
