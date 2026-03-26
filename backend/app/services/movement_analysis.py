from typing import Any

import numpy as np

from .pose_analysis import KP, calculate_angle, keypoint_to_array


ANGLE_KEYS = [
    "elbow_left",
    "elbow_right",
    "knee_left",
    "knee_right",
    "hip_left",
    "hip_right",
    "shoulder_left",
    "shoulder_right",
]


def _point(lm, name: str) -> np.ndarray:
    return keypoint_to_array(lm[KP[name]])


def extract_keypoints_snapshot(landmarks) -> dict[str, dict[str, float]]:
    data = {}
    for name, idx in KP.items():
        point = landmarks.landmark[idx]
        data[name] = {
            "x": round(float(point.x), 5),
            "y": round(float(point.y), 5),
            "z": round(float(point.z), 5),
            "visibility": round(float(getattr(point, "visibility", 1.0)), 5),
        }
    return data


def compute_frame_metrics(landmarks) -> dict[str, float]:
    lm = landmarks.landmark

    elbow_left = calculate_angle(_point(lm, "left_shoulder"), _point(lm, "left_elbow"), _point(lm, "left_wrist"))
    elbow_right = calculate_angle(_point(lm, "right_shoulder"), _point(lm, "right_elbow"), _point(lm, "right_wrist"))
    knee_left = calculate_angle(_point(lm, "left_hip"), _point(lm, "left_knee"), _point(lm, "left_ankle"))
    knee_right = calculate_angle(_point(lm, "right_hip"), _point(lm, "right_knee"), _point(lm, "right_ankle"))
    hip_left = calculate_angle(_point(lm, "left_shoulder"), _point(lm, "left_hip"), _point(lm, "left_knee"))
    hip_right = calculate_angle(_point(lm, "right_shoulder"), _point(lm, "right_hip"), _point(lm, "right_knee"))
    shoulder_left = calculate_angle(_point(lm, "left_elbow"), _point(lm, "left_shoulder"), _point(lm, "left_hip"))
    shoulder_right = calculate_angle(_point(lm, "right_elbow"), _point(lm, "right_shoulder"), _point(lm, "right_hip"))

    shoulder_mid_y = (lm[KP["left_shoulder"]].y + lm[KP["right_shoulder"]].y) / 2
    hip_mid_y = (lm[KP["left_hip"]].y + lm[KP["right_hip"]].y) / 2
    shoulder_mid_x = (lm[KP["left_shoulder"]].x + lm[KP["right_shoulder"]].x) / 2
    hip_mid_x = (lm[KP["left_hip"]].x + lm[KP["right_hip"]].x) / 2
    trunk_height = abs(shoulder_mid_y - hip_mid_y)
    trunk_lean = abs(shoulder_mid_x - hip_mid_x) / (trunk_height + 1e-8)

    wrist_delta = abs(lm[KP["left_wrist"]].y - lm[KP["right_wrist"]].y)
    knee_delta = abs(knee_left - knee_right)
    elbow_delta = abs(elbow_left - elbow_right)

    return {
        "elbow_left": round(float(elbow_left), 3),
        "elbow_right": round(float(elbow_right), 3),
        "knee_left": round(float(knee_left), 3),
        "knee_right": round(float(knee_right), 3),
        "hip_left": round(float(hip_left), 3),
        "hip_right": round(float(hip_right), 3),
        "shoulder_left": round(float(shoulder_left), 3),
        "shoulder_right": round(float(shoulder_right), 3),
        "trunk_lean": round(float(trunk_lean), 4),
        "shoulder_mid_x": round(float(shoulder_mid_x), 5),
        "hip_mid_x": round(float(hip_mid_x), 5),
        "wrist_height_delta": round(float(wrist_delta), 5),
        "knee_angle_delta": round(float(knee_delta), 3),
        "elbow_angle_delta": round(float(elbow_delta), 3),
    }


def build_frame_snapshot(landmarks, timestamp_seconds: float) -> dict[str, Any]:
    return {
        "timestamp": round(float(timestamp_seconds), 3),
        "keypoints": extract_keypoints_snapshot(landmarks),
        "metrics": compute_frame_metrics(landmarks),
    }


def _angle_ranges(frames: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    if not frames:
        return {}

    ranges: dict[str, dict[str, float]] = {}
    for key in ANGLE_KEYS:
        values = [frame["metrics"][key] for frame in frames if key in frame["metrics"]]
        if values:
            ranges[key] = {
                "min": round(float(min(values)), 2),
                "max": round(float(max(values)), 2),
            }
    return ranges


def _movement_signal(exercise_type: str, frames: list[dict[str, Any]]) -> list[float]:
    signal = []
    for frame in frames:
        metrics = frame["metrics"]
        if exercise_type == "pull_up":
            shoulder_mid_y = (
                frame["keypoints"]["left_shoulder"]["y"]
                + frame["keypoints"]["right_shoulder"]["y"]
            ) / 2
            shoulder_lift = (1 - shoulder_mid_y) * 100
            elbow_flexion = 180 - ((metrics["elbow_left"] + metrics["elbow_right"]) / 2)
            signal.append((shoulder_lift * 0.6) + (elbow_flexion * 0.4))
        elif exercise_type in {"squat", "deadlift"}:
            signal.append(180 - ((metrics["knee_left"] + metrics["knee_right"]) / 2))
        else:
            signal.append(180 - ((metrics["elbow_left"] + metrics["elbow_right"]) / 2))
    return signal


def _smooth_signal(values: list[float], window: int = 5) -> list[float]:
    if len(values) < 3:
        return values

    size = min(window, len(values))
    if size % 2 == 0:
        size -= 1
    if size < 3:
        return values
    kernel = np.ones(size) / size
    padding = size // 2
    padded = np.pad(np.array(values), (padding, padding), mode="edge")
    smoothed = np.convolve(padded, kernel, mode="valid")
    return [float(v) for v in smoothed]


def _estimate_reps(signal: list[float], mode: str = "cycle") -> int:
    if len(signal) < 6:
        return 0

    smoothed = _smooth_signal(signal, window=7 if mode == "peak" else 5)
    low = min(smoothed)
    high = max(smoothed)
    span = high - low
    if span < 10:
        return 0

    if mode == "peak":
        prominence = max(span * 0.18, 2.5)
        gap = max(5, len(smoothed) // 18)
        peaks: list[int] = []

        for index in range(1, len(smoothed) - 1):
            if smoothed[index] <= smoothed[index - 1] or smoothed[index] < smoothed[index + 1]:
                continue

            left = max(0, index - gap)
            right = min(len(smoothed), index + gap + 1)
            baseline = min(
                float(min(smoothed[left:index + 1])),
                float(min(smoothed[index:right])),
            )
            if smoothed[index] - baseline < prominence:
                continue

            if peaks and index - peaks[-1] < gap:
                if smoothed[index] > smoothed[peaks[-1]]:
                    peaks[-1] = index
                continue
            peaks.append(index)

        return len(peaks)

    enter_bottom = low + span * 0.35
    enter_top = low + span * 0.65

    state = "top"
    reps = 0
    for value in smoothed:
        if state == "top" and value >= enter_top:
            state = "bottom"
        elif state == "bottom" and value <= enter_bottom:
            reps += 1
            state = "top"
    return reps


def _average(values: list[float]) -> float:
    return float(sum(values) / len(values)) if values else 0.0


def _top_muscles(all_engagements: list[dict[str, float]], limit: int = 6) -> list[dict[str, float]]:
    if not all_engagements:
        return []

    average: dict[str, float] = {}
    for muscle in all_engagements[0].keys():
        average[muscle] = _average([frame.get(muscle, 0.0) for frame in all_engagements])

    top = sorted(average.items(), key=lambda item: item[1], reverse=True)[:limit]
    return [{"muscle": muscle, "engagement": round(value, 3)} for muscle, value in top]


def _symmetry_score(frames: list[dict[str, Any]]) -> float:
    diffs = []
    for frame in frames:
        metrics = frame["metrics"]
        diffs.extend([
            abs(metrics["elbow_left"] - metrics["elbow_right"]) / 180.0,
            abs(metrics["knee_left"] - metrics["knee_right"]) / 180.0,
            abs(metrics["hip_left"] - metrics["hip_right"]) / 180.0,
            min(1.0, metrics["wrist_height_delta"] * 3.5),
        ])

    penalty = min(1.0, _average(diffs))
    return round(max(0.0, 1.0 - penalty), 3)


def _stability_score(frames: list[dict[str, Any]]) -> float:
    if not frames:
        return 0.0

    trunk = [frame["metrics"]["trunk_lean"] for frame in frames]
    hips = [frame["metrics"]["hip_mid_x"] for frame in frames]
    shoulders = [frame["metrics"]["shoulder_mid_x"] for frame in frames]

    penalty = min(
        1.0,
        float(np.std(trunk) * 3.5 + np.std(hips) * 10 + np.std(shoulders) * 8),
    )
    return round(max(0.0, 1.0 - penalty), 3)


def _amplitude_score(exercise_type: str, angle_ranges: dict[str, dict[str, float]]) -> float:
    if exercise_type in {"squat", "deadlift"}:
        left = angle_ranges.get("knee_left", {})
        right = angle_ranges.get("knee_right", {})
    else:
        left = angle_ranges.get("elbow_left", {})
        right = angle_ranges.get("elbow_right", {})

    left_span = left.get("max", 0) - left.get("min", 0)
    right_span = right.get("max", 0) - right.get("min", 0)
    span = (left_span + right_span) / 2
    return round(min(1.0, span / 90.0), 3)


def _build_alerts(
    exercise_type: str,
    angle_ranges: dict[str, dict[str, float]],
    symmetry_score: float,
    stability_score: float,
    amplitude_score: float,
    frames: list[dict[str, Any]],
) -> list[str]:
    alerts: list[str] = []

    if symmetry_score < 0.75:
        alerts.append("asymetrie_gauche_droite")
    if stability_score < 0.72:
        alerts.append("stabilite_insuffisante")
    if amplitude_score < 0.35:
        alerts.append("amplitude_limitee")

    trunk_values = [frame["metrics"]["trunk_lean"] for frame in frames] or [0.0]
    max_trunk = max(trunk_values)

    if exercise_type == "squat":
        if angle_ranges.get("knee_left", {}).get("min", 180) > 90 and angle_ranges.get("knee_right", {}).get("min", 180) > 90:
            alerts.append("profondeur_squat_limitee")
        if max_trunk > 0.35:
            alerts.append("buste_penche")
    elif exercise_type == "push_up":
        if angle_ranges.get("elbow_left", {}).get("min", 180) > 80 and angle_ranges.get("elbow_right", {}).get("min", 180) > 80:
            alerts.append("pompe_trop_haute")
        if max_trunk > 0.22:
            alerts.append("gainage_a_stabiliser")
    elif exercise_type == "pull_up":
        if angle_ranges.get("elbow_left", {}).get("min", 180) > 105 and angle_ranges.get("elbow_right", {}).get("min", 180) > 105:
            alerts.append("traction_incomplete")
        if max_trunk > 0.28:
            alerts.append("balancement_excessif")
    elif exercise_type == "deadlift" and max_trunk > 0.45:
        alerts.append("charniere_hanche_a_renforcer")
    elif exercise_type == "bicep_curl" and amplitude_score < 0.45:
        alerts.append("curl_incomplet")
    elif exercise_type == "overhead_press" and max_trunk > 0.28:
        alerts.append("extension_lombaire")

    return alerts[:4]


def build_analysis_text(report: dict[str, Any]) -> str:
    angle_ranges = ",".join(
        f"{key}:{values['min']}-{values['max']}"
        for key, values in report["angle_ranges"].items()
    )
    dominant_muscles = ",".join(
        f"{item['muscle']}:{item['engagement']}"
        for item in report["dominant_muscles"]
    )
    alerts = ";".join(report["alerts"]) if report["alerts"] else "none"

    return "\n".join([
        f"exercise={report['exercise_type']}",
        f"duration_seconds={report['duration_seconds']}",
        f"score={report['correctness_score']}",
        f"reps={report['rep_count']}",
        f"tempo={report['tempo_label']}",
        f"symmetry_score={report['symmetry_score']}",
        f"stability_score={report['stability_score']}",
        f"amplitude_score={report['amplitude_score']}",
        f"dominant_muscles={dominant_muscles}",
        f"angle_ranges={angle_ranges}",
        f"alerts={alerts}",
    ])


def summarize_motion_sequence(
    frames: list[dict[str, Any]],
    all_engagements: list[dict[str, float]],
    exercise_type: str,
    correctness_score: int,
    duration_seconds: int,
) -> dict[str, Any]:
    ranges = _angle_ranges(frames)
    signal = _movement_signal(exercise_type, frames)
    rep_mode = "peak" if exercise_type == "pull_up" else "cycle"
    rep_count = _estimate_reps(signal, mode=rep_mode)
    tempo_seconds = round(duration_seconds / rep_count, 2) if rep_count > 0 else float(duration_seconds)
    tempo_label = f"{tempo_seconds:.1f}s/rep" if rep_count > 0 else "single_sequence"
    symmetry_score = _symmetry_score(frames)
    stability_score = _stability_score(frames)
    amplitude_score = _amplitude_score(exercise_type, ranges)
    alerts = _build_alerts(
        exercise_type=exercise_type,
        angle_ranges=ranges,
        symmetry_score=symmetry_score,
        stability_score=stability_score,
        amplitude_score=amplitude_score,
        frames=frames,
    )
    dominant_muscles = _top_muscles(all_engagements)

    report = {
        "exercise_type": exercise_type,
        "correctness_score": correctness_score,
        "duration_seconds": duration_seconds,
        "rep_count": rep_count,
        "tempo_seconds": tempo_seconds,
        "tempo_label": tempo_label,
        "symmetry_score": symmetry_score,
        "stability_score": stability_score,
        "amplitude_score": amplitude_score,
        "angle_ranges": ranges,
        "alerts": alerts,
        "dominant_muscles": dominant_muscles,
    }
    report["analysis_text"] = build_analysis_text(report)
    return report
