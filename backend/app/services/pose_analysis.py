"""
Pose analysis service using MediaPipe.
Extracts keypoints from video frames and computes muscle engagement.
"""
import numpy as np
from typing import Any, Optional


# Indices des keypoints MediaPipe Pose
KP = {
    "left_shoulder": 11, "right_shoulder": 12,
    "left_elbow": 13, "right_elbow": 14,
    "left_wrist": 15, "right_wrist": 16,
    "left_hip": 23, "right_hip": 24,
    "left_knee": 25, "right_knee": 26,
    "left_ankle": 27, "right_ankle": 28,
}

# Plages d'angles corrects par exercice (degrés)
EXERCISE_BENCHMARKS = {
    "squat": {
        "knee_angle_min": 60,
        "knee_angle_max": 170,
        "hip_angle_min": 55,
        "hip_angle_max": 170,
    },
    "bicep_curl": {
        "elbow_angle_min": 20,
        "elbow_angle_max": 160,
    },
    "push_up": {
        "elbow_angle_min": 60,
        "elbow_angle_max": 170,
        "trunk_lean_max": 20,
    },
    "deadlift": {
        "knee_angle_min": 60,
        "hip_angle_min": 60,
        "trunk_lean_max": 60,
    },
    "overhead_press": {
        "elbow_angle_min": 60,
        "shoulder_elevation_min": 0.5,
    },
    "pull_up": {
        "elbow_angle_min": 45,
        "elbow_angle_max": 175,
        "wrist_above_shoulder_ratio_min": 0.55,
    },
}


def calculate_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle en degrés au point b, entre les segments a-b et b-c."""
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    return float(np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0))))


def keypoint_to_array(lm) -> np.ndarray:
    return np.array([lm.x, lm.y, lm.z])


def compute_muscle_engagement(landmarks) -> dict:
    """
    Reçoit les landmarks MediaPipe d'une frame.
    Retourne un dict { muscle_name: engagement_value (0.0-1.0) }.
    """
    lm = landmarks.landmark

    def pt(name: str) -> np.ndarray:
        return keypoint_to_array(lm[KP[name]])

    engagement = {}

    # ── Bras gauche ──────────────────────────────────────────────────────────
    elbow_left = calculate_angle(pt("left_shoulder"), pt("left_elbow"), pt("left_wrist"))
    wrist_left_y = lm[KP["left_wrist"]].y
    shoulder_left_y = lm[KP["left_shoulder"]].y
    # Biceps : max engagement à 45° (plein fléchi), 0 à 180° (tendu)
    bicep_left = max(0.0, 1.0 - (elbow_left / 180.0))
    left_pulling = wrist_left_y < shoulder_left_y
    tricep_left = (1.0 - bicep_left) * (0.25 if left_pulling else 0.6)
    engagement["bicep_left"] = round(bicep_left, 3)
    engagement["tricep_left"] = round(tricep_left, 3)

    # ── Bras droit ───────────────────────────────────────────────────────────
    elbow_right = calculate_angle(pt("right_shoulder"), pt("right_elbow"), pt("right_wrist"))
    wrist_right_y = lm[KP["right_wrist"]].y
    shoulder_right_y = lm[KP["right_shoulder"]].y
    bicep_right = max(0.0, 1.0 - (elbow_right / 180.0))
    right_pulling = wrist_right_y < shoulder_right_y
    tricep_right = (1.0 - bicep_right) * (0.25 if right_pulling else 0.6)
    engagement["bicep_right"] = round(bicep_right, 3)
    engagement["tricep_right"] = round(tricep_right, 3)

    # ── Épaules ──────────────────────────────────────────────────────────────
    # Élévation = hauteur relative du poignet par rapport à l'épaule
    elev_left = max(0.0, min(1.0, (shoulder_left_y - wrist_left_y) * 2))
    engagement["deltoid_left"] = round(elev_left, 3)

    elev_right = max(0.0, min(1.0, (shoulder_right_y - wrist_right_y) * 2))
    engagement["deltoid_right"] = round(elev_right, 3)

    pull_context_left = max(0.0, min(1.0, (shoulder_left_y - wrist_left_y) * 3.2))
    pull_context_right = max(0.0, min(1.0, (shoulder_right_y - wrist_right_y) * 3.2))
    pull_context = (pull_context_left + pull_context_right) / 2
    pull_phase = max(
        0.0,
        min(
            1.0,
            (pull_context * 0.55)
            + (((bicep_left + bicep_right) / 2) * 1.15)
            + (((elev_left + elev_right) / 2) * 0.35),
        ),
    )
    if pull_context > 0.2:
        bicep_left = max(bicep_left, pull_phase * 0.48)
        bicep_right = max(bicep_right, pull_phase * 0.48)
        tricep_left *= 0.35
        tricep_right *= 0.35
        engagement["bicep_left"] = round(bicep_left, 3)
        engagement["bicep_right"] = round(bicep_right, 3)
        engagement["tricep_left"] = round(tricep_left, 3)
        engagement["tricep_right"] = round(tricep_right, 3)

    # Trapèzes activés par l'élévation des épaules
    engagement["trapezius_left"] = round(elev_left * 0.7, 3)
    engagement["trapezius_right"] = round(elev_right * 0.7, 3)

    # ── Jambes gauches ───────────────────────────────────────────────────────
    knee_left = calculate_angle(pt("left_hip"), pt("left_knee"), pt("left_ankle"))
    # Quads : max à la descente (genou fléchi ~90°)
    quad_left = max(0.0, 1.0 - (knee_left / 180.0))
    hamstring_left = 1.0 - quad_left
    if pull_context > 0.2:
        quad_left *= max(0.25, 1.0 - (pull_context * 1.1))
        hamstring_left *= max(0.15, 1.0 - (pull_context * 1.8))
    engagement["quad_left"] = round(quad_left, 3)
    engagement["hamstring_left"] = round(hamstring_left * 0.5, 3)

    # ── Jambes droites ───────────────────────────────────────────────────────
    knee_right = calculate_angle(pt("right_hip"), pt("right_knee"), pt("right_ankle"))
    quad_right = max(0.0, 1.0 - (knee_right / 180.0))
    hamstring_right = 1.0 - quad_right
    if pull_context > 0.2:
        quad_right *= max(0.25, 1.0 - (pull_context * 1.1))
        hamstring_right *= max(0.15, 1.0 - (pull_context * 1.8))
    engagement["quad_right"] = round(quad_right, 3)
    engagement["hamstring_right"] = round(hamstring_right * 0.5, 3)

    # ── Hanches / fessiers ───────────────────────────────────────────────────
    hip_left = calculate_angle(pt("left_shoulder"), pt("left_hip"), pt("left_knee"))
    glute_left = max(0.0, 1.0 - (hip_left / 180.0))
    if pull_context > 0.2:
        glute_left *= max(0.2, 1.0 - (pull_context * 1.5))
    engagement["glute_left"] = round(glute_left, 3)

    hip_right = calculate_angle(pt("right_shoulder"), pt("right_hip"), pt("right_knee"))
    glute_right = max(0.0, 1.0 - (hip_right / 180.0))
    if pull_context > 0.2:
        glute_right *= max(0.2, 1.0 - (pull_context * 1.5))
    engagement["glute_right"] = round(glute_right, 3)

    # ── Abdos / tronc ────────────────────────────────────────────────────────
    # Inclinaison tronc = différence verticale épaule-hanche par rapport à hanche-genou
    shoulder_mid_y = (lm[KP["left_shoulder"]].y + lm[KP["right_shoulder"]].y) / 2
    hip_mid_y = (lm[KP["left_hip"]].y + lm[KP["right_hip"]].y) / 2
    trunk_height = abs(shoulder_mid_y - hip_mid_y)
    shoulder_mid_x = (lm[KP["left_shoulder"]].x + lm[KP["right_shoulder"]].x) / 2
    hip_mid_x = (lm[KP["left_hip"]].x + lm[KP["right_hip"]].x) / 2
    lean = abs(shoulder_mid_x - hip_mid_x) / (trunk_height + 1e-8)
    core_activation = min(1.0, lean * 1.5)
    engagement["abs_upper"] = round(core_activation * 0.6, 3)
    engagement["abs_lower"] = round(core_activation * 0.5, 3)
    engagement["oblique_left"] = round(core_activation * 0.4, 3)
    engagement["oblique_right"] = round(core_activation * 0.4, 3)

    # ── Pectoraux / dorsaux ──────────────────────────────────────────────────
    # Proxy : mouvement horizontal des épaules
    shoulder_width = abs(lm[KP["left_shoulder"]].x - lm[KP["right_shoulder"]].x)
    chest_activation = max(0.0, 1.0 - shoulder_width * 3)
    engagement["chest_left"] = round(chest_activation * elev_left, 3)
    engagement["chest_right"] = round(chest_activation * elev_right, 3)
    lat_pull_left = max(
        max(0.0, min(1.0, (shoulder_left_y - wrist_left_y) * 2.4)) * bicep_left,
        pull_phase * (0.82 if left_pulling else 0.35),
    )
    lat_pull_right = max(
        max(0.0, min(1.0, (shoulder_right_y - wrist_right_y) * 2.4)) * bicep_right,
        pull_phase * (0.82 if right_pulling else 0.35),
    )
    engagement["lats_left"] = round(max((1.0 - chest_activation) * 0.35, lat_pull_left), 3)
    engagement["lats_right"] = round(max((1.0 - chest_activation) * 0.35, lat_pull_right), 3)

    # ── Mollets ──────────────────────────────────────────────────────────────
    ankle_left = calculate_angle(pt("left_knee"), pt("left_ankle"),
                                 np.array([lm[KP["left_ankle"]].x,
                                           lm[KP["left_ankle"]].y + 0.1,
                                           lm[KP["left_ankle"]].z]))
    calf_left = max(0.0, 1.0 - (ankle_left / 180.0))
    engagement["calf_left"] = round(calf_left * 0.6, 3)

    ankle_right = calculate_angle(pt("right_knee"), pt("right_ankle"),
                                  np.array([lm[KP["right_ankle"]].x,
                                            lm[KP["right_ankle"]].y + 0.1,
                                            lm[KP["right_ankle"]].z]))
    calf_right = max(0.0, 1.0 - (ankle_right / 180.0))
    engagement["calf_right"] = round(calf_right * 0.6, 3)

    # ── Avant-bras ───────────────────────────────────────────────────────────
    engagement["forearm_left"] = round(max(bicep_left * 0.4, pull_phase * 0.34), 3)
    engagement["forearm_right"] = round(max(bicep_right * 0.4, pull_phase * 0.34), 3)

    # ── Cou ──────────────────────────────────────────────────────────────────
    engagement["neck"] = round(core_activation * 0.3, 3)

    return engagement


def compute_correctness_score(
    all_engagements: list[dict],
    exercise_type: str,
    all_angles: Optional[list[dict]] = None,
) -> int:
    """
    Retourne un score de 0 à 100 basé sur la cohérence de l'engagement musculaire.
    Version simplifiée : vérifie si les muscles primaires sont bien activés.
    """
    if not all_engagements:
        return 0

    primary_muscles = {
        "squat": ["quad_left", "quad_right", "glute_left", "glute_right"],
        "bicep_curl": ["bicep_left", "bicep_right"],
        "push_up": ["chest_left", "chest_right", "tricep_left", "tricep_right"],
        "deadlift": ["glute_left", "glute_right", "lats_left", "lats_right"],
        "overhead_press": ["deltoid_left", "deltoid_right", "tricep_left", "tricep_right"],
        "pull_up": ["lats_left", "lats_right", "bicep_left", "bicep_right", "forearm_left", "forearm_right"],
    }.get(exercise_type, [])

    if not primary_muscles:
        return 70  # score neutre si exercice inconnu

    frames_correct = 0
    for eng in all_engagements:
        avg_primary = sum(eng.get(m, 0) for m in primary_muscles) / len(primary_muscles)
        threshold = 0.26 if exercise_type == "pull_up" else 0.35
        if avg_primary >= threshold:
            frames_correct += 1

    return int((frames_correct / len(all_engagements)) * 100)


def _range(values: list[float]) -> float:
    return float(max(values) - min(values)) if values else 0.0


def _frame_exercise_features(frames: Optional[list[dict[str, Any]]]) -> dict[str, float]:
    if not frames:
        return {}

    elbow_left = [frame["metrics"]["elbow_left"] for frame in frames]
    elbow_right = [frame["metrics"]["elbow_right"] for frame in frames]
    knee_left = [frame["metrics"]["knee_left"] for frame in frames]
    knee_right = [frame["metrics"]["knee_right"] for frame in frames]
    shoulder_mid_y = [
        (frame["keypoints"]["left_shoulder"]["y"] + frame["keypoints"]["right_shoulder"]["y"]) / 2
        for frame in frames
    ]
    hip_mid_y = [
        (frame["keypoints"]["left_hip"]["y"] + frame["keypoints"]["right_hip"]["y"]) / 2
        for frame in frames
    ]
    wrist_above_shoulder_ratio = sum(
        (
            (frame["keypoints"]["left_wrist"]["y"] < frame["keypoints"]["left_shoulder"]["y"])
            + (frame["keypoints"]["right_wrist"]["y"] < frame["keypoints"]["right_shoulder"]["y"])
        ) / 2
        for frame in frames
    ) / len(frames)

    return {
        "wrist_above_shoulder_ratio": round(float(wrist_above_shoulder_ratio), 3),
        "elbow_range": round((_range(elbow_left) + _range(elbow_right)) / 2, 3),
        "knee_range": round((_range(knee_left) + _range(knee_right)) / 2, 3),
        "shoulder_vertical_travel": round(_range(shoulder_mid_y), 5),
        "hip_vertical_travel": round(_range(hip_mid_y), 5),
        "max_trunk_lean": round(
            max(frame["metrics"].get("trunk_lean", 0.0) for frame in frames),
            4,
        ),
    }


def detect_exercise_type(
    all_engagements: list[dict],
    frames: Optional[list[dict[str, Any]]] = None,
) -> str:
    """Détecte le type d'exercice à partir des patterns d'engagement."""
    if not all_engagements:
        return "unknown"

    avg = {}
    for muscle in all_engagements[0]:
        avg[muscle] = sum(e.get(muscle, 0) for e in all_engagements) / len(all_engagements)

    quad_avg = (avg.get("quad_left", 0) + avg.get("quad_right", 0)) / 2
    ham_avg = (avg.get("hamstring_left", 0) + avg.get("hamstring_right", 0)) / 2
    glute_avg = (avg.get("glute_left", 0) + avg.get("glute_right", 0)) / 2
    leg_avg = (quad_avg + glute_avg) / 2
    arm_avg = (avg.get("bicep_left", 0) + avg.get("bicep_right", 0)) / 2
    chest_avg = (avg.get("chest_left", 0) + avg.get("chest_right", 0)) / 2
    shoulder_avg = (avg.get("deltoid_left", 0) + avg.get("deltoid_right", 0)) / 2
    lat_avg = (avg.get("lats_left", 0) + avg.get("lats_right", 0)) / 2
    tricep_avg = (avg.get("tricep_left", 0) + avg.get("tricep_right", 0)) / 2
    posterior_chain_avg = (ham_avg + glute_avg + lat_avg) / 3
    features = _frame_exercise_features(frames)

    if (
        features
        and features["wrist_above_shoulder_ratio"] >= 0.55
        and features["elbow_range"] >= 35
        and features["shoulder_vertical_travel"] >= 0.12
        and max(arm_avg, lat_avg) >= 0.18
    ):
        return "pull_up"
    if leg_avg > 0.34 and (not features or features["knee_range"] >= 35):
        return "squat"
    if arm_avg > 0.34 and chest_avg < 0.2 and shoulder_avg < 0.3:
        return "bicep_curl"
    if chest_avg > 0.18 and tricep_avg > 0.18:
        return "push_up"
    if shoulder_avg > 0.34 and arm_avg > 0.16:
        return "overhead_press"
    if (
        posterior_chain_avg >= 0.2
        and (not features or features["wrist_above_shoulder_ratio"] < 0.45)
    ):
        return "deadlift"
    return "deadlift"
