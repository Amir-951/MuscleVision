"""
Pose analysis service using MediaPipe.
Extracts keypoints from video frames and computes muscle engagement.
"""
import numpy as np
from typing import Optional


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
    # Biceps : max engagement à 45° (plein fléchi), 0 à 180° (tendu)
    bicep_left = max(0.0, 1.0 - (elbow_left / 180.0))
    tricep_left = 1.0 - bicep_left  # antagoniste
    engagement["bicep_left"] = round(bicep_left, 3)
    engagement["tricep_left"] = round(tricep_left * 0.6, 3)  # moins activé

    # ── Bras droit ───────────────────────────────────────────────────────────
    elbow_right = calculate_angle(pt("right_shoulder"), pt("right_elbow"), pt("right_wrist"))
    bicep_right = max(0.0, 1.0 - (elbow_right / 180.0))
    tricep_right = 1.0 - bicep_right
    engagement["bicep_right"] = round(bicep_right, 3)
    engagement["tricep_right"] = round(tricep_right * 0.6, 3)

    # ── Épaules ──────────────────────────────────────────────────────────────
    # Élévation = hauteur relative du poignet par rapport à l'épaule
    wrist_left_y = lm[KP["left_wrist"]].y
    shoulder_left_y = lm[KP["left_shoulder"]].y
    elev_left = max(0.0, min(1.0, (shoulder_left_y - wrist_left_y) * 2))
    engagement["deltoid_left"] = round(elev_left, 3)

    wrist_right_y = lm[KP["right_wrist"]].y
    shoulder_right_y = lm[KP["right_shoulder"]].y
    elev_right = max(0.0, min(1.0, (shoulder_right_y - wrist_right_y) * 2))
    engagement["deltoid_right"] = round(elev_right, 3)

    # Trapèzes activés par l'élévation des épaules
    engagement["trapezius_left"] = round(elev_left * 0.7, 3)
    engagement["trapezius_right"] = round(elev_right * 0.7, 3)

    # ── Jambes gauches ───────────────────────────────────────────────────────
    knee_left = calculate_angle(pt("left_hip"), pt("left_knee"), pt("left_ankle"))
    # Quads : max à la descente (genou fléchi ~90°)
    quad_left = max(0.0, 1.0 - (knee_left / 180.0))
    hamstring_left = 1.0 - quad_left
    engagement["quad_left"] = round(quad_left, 3)
    engagement["hamstring_left"] = round(hamstring_left * 0.5, 3)

    # ── Jambes droites ───────────────────────────────────────────────────────
    knee_right = calculate_angle(pt("right_hip"), pt("right_knee"), pt("right_ankle"))
    quad_right = max(0.0, 1.0 - (knee_right / 180.0))
    hamstring_right = 1.0 - quad_right
    engagement["quad_right"] = round(quad_right, 3)
    engagement["hamstring_right"] = round(hamstring_right * 0.5, 3)

    # ── Hanches / fessiers ───────────────────────────────────────────────────
    hip_left = calculate_angle(pt("left_shoulder"), pt("left_hip"), pt("left_knee"))
    glute_left = max(0.0, 1.0 - (hip_left / 180.0))
    engagement["glute_left"] = round(glute_left, 3)

    hip_right = calculate_angle(pt("right_shoulder"), pt("right_hip"), pt("right_knee"))
    glute_right = max(0.0, 1.0 - (hip_right / 180.0))
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
    engagement["lats_left"] = round((1.0 - chest_activation) * 0.5, 3)
    engagement["lats_right"] = round((1.0 - chest_activation) * 0.5, 3)

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
    engagement["forearm_left"] = round(bicep_left * 0.4, 3)
    engagement["forearm_right"] = round(bicep_right * 0.4, 3)

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
    }.get(exercise_type, [])

    if not primary_muscles:
        return 70  # score neutre si exercice inconnu

    frames_correct = 0
    for eng in all_engagements:
        avg_primary = sum(eng.get(m, 0) for m in primary_muscles) / len(primary_muscles)
        if avg_primary >= 0.35:  # seuil : muscles primaires activés à 35%+
            frames_correct += 1

    return int((frames_correct / len(all_engagements)) * 100)


def detect_exercise_type(all_engagements: list[dict]) -> str:
    """Détecte le type d'exercice à partir des patterns d'engagement."""
    if not all_engagements:
        return "unknown"

    avg = {}
    for muscle in all_engagements[0]:
        avg[muscle] = sum(e.get(muscle, 0) for e in all_engagements) / len(all_engagements)

    leg_avg = (avg.get("quad_left", 0) + avg.get("quad_right", 0) +
               avg.get("glute_left", 0) + avg.get("glute_right", 0)) / 4
    arm_avg = (avg.get("bicep_left", 0) + avg.get("bicep_right", 0)) / 2
    chest_avg = (avg.get("chest_left", 0) + avg.get("chest_right", 0)) / 2
    shoulder_avg = (avg.get("deltoid_left", 0) + avg.get("deltoid_right", 0)) / 2

    if leg_avg > 0.4:
        return "squat"
    elif arm_avg > 0.4 and chest_avg < 0.2:
        return "bicep_curl"
    elif chest_avg > 0.3:
        return "push_up"
    elif shoulder_avg > 0.4:
        return "overhead_press"
    else:
        return "deadlift"
