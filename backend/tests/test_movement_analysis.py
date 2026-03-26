import unittest

from app.services.movement_analysis import _estimate_reps, summarize_motion_sequence


def _frame(
    knee_angle: float,
    hip_angle: float,
    elbow_angle: float = 165.0,
    trunk_lean: float = 0.08,
    offset: float = 0.0,
    shoulder_y: float = 0.46,
    wrist_y: float = 0.3,
) -> dict:
    return {
        "timestamp": 0.0,
        "keypoints": {
            "left_shoulder": {"x": 0.42, "y": shoulder_y, "z": 0.0, "visibility": 1.0},
            "right_shoulder": {"x": 0.58, "y": shoulder_y, "z": 0.0, "visibility": 1.0},
            "left_wrist": {"x": 0.4, "y": wrist_y, "z": 0.0, "visibility": 1.0},
            "right_wrist": {"x": 0.6, "y": wrist_y, "z": 0.0, "visibility": 1.0},
            "left_hip": {"x": 0.45, "y": 0.76, "z": 0.0, "visibility": 1.0},
            "right_hip": {"x": 0.55, "y": 0.76, "z": 0.0, "visibility": 1.0},
        },
        "metrics": {
            "elbow_left": elbow_angle,
            "elbow_right": elbow_angle,
            "knee_left": knee_angle,
            "knee_right": knee_angle,
            "hip_left": hip_angle,
            "hip_right": hip_angle,
            "shoulder_left": 90.0,
            "shoulder_right": 90.0,
            "trunk_lean": trunk_lean,
            "shoulder_mid_x": round(0.5 + offset, 4),
            "hip_mid_x": round(0.5 + offset / 2, 4),
            "wrist_height_delta": 0.01,
            "knee_angle_delta": 0.0,
            "elbow_angle_delta": 0.0,
        },
    }


class MovementAnalysisTests(unittest.TestCase):
    def test_estimate_reps_detects_two_cycles(self):
        signal = [10, 10, 10, 10, 80, 95, 95, 80, 10, 10, 10, 10, 80, 95, 95, 80, 10, 10]
        self.assertEqual(_estimate_reps(signal), 2)

    def test_summarize_motion_sequence_builds_compact_report(self):
        signal = [10, 10, 10, 10, 80, 95, 95, 80, 10, 10, 10, 10, 80, 95, 95, 80, 10, 10]
        knee_angles = [180 - value for value in signal]
        hip_angles = [180 - value * 0.85 for value in signal]
        frames = [
            _frame(
                knee_angle=knee,
                hip_angle=hip,
                trunk_lean=0.08 + ((index % 3) * 0.01),
                offset=0.005 * (index % 2),
            )
            for index, (knee, hip) in enumerate(zip(knee_angles, hip_angles))
        ]
        engagements = [
            {
                "quad_left": round(1.0 - (knee / 180.0), 3),
                "quad_right": round(1.0 - (knee / 180.0), 3),
                "glute_left": round(1.0 - (hip / 180.0), 3),
                "glute_right": round(1.0 - (hip / 180.0), 3),
                "abs_upper": 0.2,
            }
            for knee, hip in zip(knee_angles, hip_angles)
        ]

        report = summarize_motion_sequence(
            frames=frames,
            all_engagements=engagements,
            exercise_type="squat",
            correctness_score=88,
            duration_seconds=16,
        )

        self.assertEqual(report["exercise_type"], "squat")
        self.assertEqual(report["correctness_score"], 88)
        self.assertEqual(report["rep_count"], 2)
        self.assertEqual(report["tempo_label"], "8.0s/rep")
        self.assertGreater(report["symmetry_score"], 0.95)
        self.assertGreater(report["stability_score"], 0.9)
        self.assertIn("exercise=squat", report["analysis_text"])
        self.assertIn("reps=2", report["analysis_text"])
        self.assertIn("dominant_muscles=quad_left", report["analysis_text"])

    def test_pull_up_rep_count_uses_vertical_peak_signal(self):
        shoulder_cycle = [0.45, 0.44, 0.42, 0.38, 0.32, 0.28, 0.32, 0.38, 0.42, 0.45]
        elbow_cycle = [165, 160, 150, 132, 110, 88, 110, 132, 150, 165]
        frames = [
            _frame(
                knee_angle=150.0,
                hip_angle=155.0,
                elbow_angle=float(elbow_angle),
                trunk_lean=0.09 + ((index % 2) * 0.01),
                shoulder_y=float(shoulder_y),
                wrist_y=float(shoulder_y - 0.18),
            )
            for index, (shoulder_y, elbow_angle) in enumerate(zip(shoulder_cycle * 6, elbow_cycle * 6))
        ]
        engagements = [
            {
                "lats_left": 0.46,
                "lats_right": 0.45,
                "bicep_left": 0.33,
                "bicep_right": 0.34,
                "forearm_left": 0.22,
                "forearm_right": 0.22,
            }
            for _ in frames
        ]

        report = summarize_motion_sequence(
            frames=frames,
            all_engagements=engagements,
            exercise_type="pull_up",
            correctness_score=84,
            duration_seconds=18,
        )

        self.assertEqual(report["rep_count"], 6)
        self.assertEqual(report["tempo_label"], "3.0s/rep")
        self.assertIn("exercise=pull_up", report["analysis_text"])
        self.assertIn("reps=6", report["analysis_text"])


if __name__ == "__main__":
    unittest.main()
