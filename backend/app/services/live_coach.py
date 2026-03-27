from __future__ import annotations

from typing import Any

from .movement_analysis import summarize_motion_sequence
from .pose_analysis import compute_correctness_score, compute_muscle_engagement, detect_exercise_type


LIVE_SAMPLE_LIMIT = 24


ALERT_CORRECTIONS = {
    "asymetrie_gauche_droite": "Rends le mouvement plus symétrique entre la gauche et la droite.",
    "stabilite_insuffisante": "Verrouille le tronc avant de forcer sur la répétition.",
    "amplitude_limitee": "Cherche plus d'amplitude sans casser la trajectoire.",
    "profondeur_squat_limitee": "Descends plus bas en gardant les genoux stables.",
    "buste_penche": "Redresse le buste et garde la cage thoracique empilée.",
    "pompe_trop_haute": "Descends davantage avant de repousser.",
    "gainage_a_stabiliser": "Serre les abdos et garde la ligne épaule-bassin.",
    "traction_incomplete": "Monte plus haut et termine la traction poitrine ouverte.",
    "balancement_excessif": "Coupe l'élan. Monte strict et redescends sous contrôle.",
    "charniere_hanche_a_renforcer": "Recule les hanches davantage avant de tirer.",
    "curl_incomplet": "Ferme plus le coude en haut et contrôle la descente.",
    "extension_lombaire": "Garde les côtes verrouillées pour éviter l'extension lombaire.",
}


PHASE_LABELS = {
    "pull_up": {
        "up": "Tire",
        "down": "Redescends lentement",
        "hold": "Tiens propre",
        "setup": "Place-toi",
    },
    "squat": {
        "up": "Pousse le sol",
        "down": "Descends en contrôle",
        "hold": "Tiens la position",
        "setup": "Ancre les pieds",
    },
    "push_up": {
        "up": "Repousse fort",
        "down": "Descends contrôlé",
        "hold": "Gaine",
        "setup": "Verrouille la ligne",
    },
    "deadlift": {
        "up": "Pousse et tire",
        "down": "Repose les hanches",
        "hold": "Verrouille en haut",
        "setup": "Prends la charnière",
    },
    "bicep_curl": {
        "up": "Ferme le coude",
        "down": "Ralentis la descente",
        "hold": "Serre la contraction",
        "setup": "Place les coudes",
    },
    "overhead_press": {
        "up": "Presse droit",
        "down": "Ramène sous contrôle",
        "hold": "Fixe au-dessus",
        "setup": "Serre le tronc",
    },
}


def build_live_sample(landmarks, timestamp_seconds: float) -> dict[str, Any]:
    from .movement_analysis import build_frame_snapshot

    snapshot = build_frame_snapshot(landmarks, timestamp_seconds)
    return {
        "timestamp": round(float(timestamp_seconds), 3),
        "keypoints": snapshot["keypoints"],
        "metrics": snapshot["metrics"],
        "muscle_engagement": compute_muscle_engagement(landmarks),
    }


def normalize_live_samples(raw_samples: list[dict[str, Any]], limit: int = LIVE_SAMPLE_LIMIT) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    for raw_sample in raw_samples[-limit:]:
        if not isinstance(raw_sample, dict):
            continue

        keypoints = raw_sample.get("keypoints")
        metrics = raw_sample.get("metrics")
        muscle_engagement = raw_sample.get("muscle_engagement") or raw_sample.get("muscleEngagement")
        timestamp = raw_sample.get("timestamp")

        if not isinstance(keypoints, dict) or not isinstance(metrics, dict) or not isinstance(muscle_engagement, dict):
            continue

        try:
            normalized_timestamp = round(float(timestamp), 3)
        except (TypeError, ValueError):
            normalized_timestamp = 0.0

        samples.append(
            {
                "timestamp": normalized_timestamp,
                "keypoints": keypoints,
                "metrics": metrics,
                "muscle_engagement": {
                    str(name): round(float(value), 4)
                    for name, value in muscle_engagement.items()
                    if isinstance(value, (int, float))
                },
            }
        )

    samples.sort(key=lambda sample: sample["timestamp"])
    return samples[-limit:]


def _movement_signal(exercise_type: str, sample: dict[str, Any]) -> float:
    metrics = sample["metrics"]
    keypoints = sample["keypoints"]

    if exercise_type == "pull_up":
        shoulder_mid_y = (
            keypoints["left_shoulder"]["y"] + keypoints["right_shoulder"]["y"]
        ) / 2
        shoulder_lift = (1 - shoulder_mid_y) * 100
        elbow_flexion = 180 - ((metrics["elbow_left"] + metrics["elbow_right"]) / 2)
        return (shoulder_lift * 0.6) + (elbow_flexion * 0.4)

    if exercise_type in {"squat", "deadlift"}:
        return 180 - ((metrics["knee_left"] + metrics["knee_right"]) / 2)

    return 180 - ((metrics["elbow_left"] + metrics["elbow_right"]) / 2)


def _current_phase(exercise_type: str, samples: list[dict[str, Any]]) -> str:
    if len(samples) < 2:
        return "setup"

    signals = [_movement_signal(exercise_type, sample) for sample in samples[-4:]]
    current = signals[-1]
    previous = signals[-2]
    span = max(1.0, max(signals) - min(signals))
    delta = current - previous

    if current <= min(signals) + (span * 0.18):
        return "setup"
    if abs(delta) <= max(1.4, span * 0.04):
        return "hold"
    return "up" if delta > 0 else "down"


def _format_score_10(score_100: int) -> str:
    return f"{max(0, min(100, score_100)) / 10:.1f}/10"


def _exercise_label(exercise_type: str) -> str:
    return {
        "pull_up": "traction",
        "push_up": "pompe",
        "squat": "squat",
        "deadlift": "soulevé de terre",
        "bicep_curl": "curl",
        "overhead_press": "développé militaire",
        "unknown": "mouvement",
    }.get(exercise_type, exercise_type.replace("_", " "))


def _phase_label(exercise_type: str, phase: str) -> str:
    dictionary = PHASE_LABELS.get(exercise_type, PHASE_LABELS["pull_up"])
    return dictionary.get(phase, dictionary["setup"])


def _top_correction(report: dict[str, Any]) -> str:
    alert = (report.get("alerts") or [None])[0]
    if alert:
        return ALERT_CORRECTIONS.get(alert, "Ralentis un peu et nettoie la trajectoire.")

    if report["stability_score"] < 0.78:
        return "Stabilise le tronc avant de chercher plus de rythme."
    if report["symmetry_score"] < 0.82:
        return "Recentre la trajectoire pour équilibrer les deux côtés."
    if report["amplitude_score"] < 0.5:
        return "Va chercher plus d'amplitude sans perdre le contrôle."
    return "Exécution propre. Garde ce même tempo."


def build_live_coach_cue(
    coach_id: str,
    report: dict[str, Any],
    phase: str,
    rep_delta: int,
) -> dict[str, str]:
    exercise_label = _exercise_label(report["exercise_type"])
    correction = _top_correction(report)
    phase_label = _phase_label(report["exercise_type"], phase)
    rep_count = report["rep_count"]
    score = _format_score_10(report["correctness_score"])

    if coach_id == "sergeant":
        headline = (
            f"Rep {rep_count} validée. {phase_label}."
            if rep_delta > 0
            else f"{phase_label}. Pas de bruit."
        )
        body = (
            f"{correction} Score {score}."
            if report["alerts"]
            else f"Traction nette. Continue. Score {score}."
        )
    elif coach_id == "max":
        headline = (
            f"Oui, rep {rep_count} prise. Continue."
            if rep_delta > 0
            else f"{phase_label}. Tu gardes le bon rythme."
        )
        body = (
            f"{correction} Tu es en train de rendre cette {exercise_label} plus propre."
        )
    elif coach_id == "bro":
        headline = (
            f"Rep {rep_count}, let's go bro."
            if rep_delta > 0
            else f"{phase_label}, garde la tension bro."
        )
        body = f"{correction} Là tu peux vraiment rendre la {exercise_label} plus clean."
    else:
        headline = (
            f"Rep {rep_count} confirmée."
            if rep_delta > 0
            else f"{phase_label}. Observation en cours."
        )
        body = (
            f"{correction} Symétrie {report['symmetry_score']:.2f}, stabilité {report['stability_score']:.2f}."
        )

    return {
        "headline": headline,
        "body": body,
        "voice": f"{headline} {body}",
    }


def analyze_live_samples(
    samples: list[dict[str, Any]],
    coach_id: str,
    exercise_hint: str | None = None,
    last_rep_count: int = 0,
) -> dict[str, Any]:
    normalized = normalize_live_samples(samples)
    if not normalized:
        return {
            "detected": False,
            "message": "Aucun mouvement exploitable.",
            "headline": "Cadre le corps.",
            "body": "Le coach attend une pose visible pour commencer.",
            "voice": "Cadre ton corps entier pour commencer le coaching live.",
            "rep_count": 0,
            "exercise_type": exercise_hint or "unknown",
            "samples": [],
        }

    frames = [
        {
            "timestamp": sample["timestamp"],
            "keypoints": sample["keypoints"],
            "metrics": sample["metrics"],
        }
        for sample in normalized
    ]
    engagements = [sample["muscle_engagement"] for sample in normalized]
    detected_exercise = detect_exercise_type(engagements, frames)
    exercise_type = (
        exercise_hint
        if exercise_hint and exercise_hint != "auto"
        else detected_exercise
    )
    duration_seconds = max(
        1,
        int(round(normalized[-1]["timestamp"] - normalized[0]["timestamp"])) or 1,
    )
    correctness_score = compute_correctness_score(engagements, exercise_type)
    report = summarize_motion_sequence(
        frames=frames,
        all_engagements=engagements,
        exercise_type=exercise_type,
        correctness_score=correctness_score,
        duration_seconds=duration_seconds,
    )
    rep_delta = max(0, report["rep_count"] - max(0, int(last_rep_count)))
    phase = _current_phase(exercise_type, normalized)
    cue = build_live_coach_cue(
        coach_id=coach_id,
        report=report,
        phase=phase,
        rep_delta=rep_delta,
    )

    return {
        "detected": True,
        "message": cue["voice"],
        "headline": cue["headline"],
        "body": cue["body"],
        "voice": cue["voice"],
        "exercise_type": exercise_type,
        "detected_exercise": detected_exercise,
        "phase": phase,
        "rep_count": report["rep_count"],
        "rep_delta": rep_delta,
        "correctness_score": report["correctness_score"],
        "symmetry_score": report["symmetry_score"],
        "stability_score": report["stability_score"],
        "amplitude_score": report["amplitude_score"],
        "alerts": report["alerts"],
        "tempo_label": report["tempo_label"],
        "dominant_muscles": report["dominant_muscles"],
        "analysis_text": report["analysis_text"],
        "muscle_engagement": normalized[-1]["muscle_engagement"],
        "pose_frame": frames[-1],
        "sample": normalized[-1],
        "samples": normalized,
    }
