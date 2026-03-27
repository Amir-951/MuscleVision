import unittest

from app.services.live_coach import analyze_live_samples, normalize_live_samples


def _sample(
    timestamp: float,
    shoulder_y: float,
    elbow_angle: float,
    trunk_lean: float = 0.1,
) -> dict:
    return {
        "timestamp": timestamp,
        "keypoints": {
            "left_shoulder": {"x": 0.42, "y": shoulder_y, "z": 0.0, "visibility": 1.0},
            "right_shoulder": {"x": 0.58, "y": shoulder_y, "z": 0.0, "visibility": 1.0},
            "left_wrist": {"x": 0.42, "y": shoulder_y - 0.18, "z": 0.0, "visibility": 1.0},
            "right_wrist": {"x": 0.58, "y": shoulder_y - 0.18, "z": 0.0, "visibility": 1.0},
            "left_hip": {"x": 0.45, "y": 0.74, "z": 0.0, "visibility": 1.0},
            "right_hip": {"x": 0.55, "y": 0.74, "z": 0.0, "visibility": 1.0},
        },
        "metrics": {
            "elbow_left": elbow_angle,
            "elbow_right": elbow_angle,
            "knee_left": 160.0,
            "knee_right": 160.0,
            "hip_left": 155.0,
            "hip_right": 155.0,
            "shoulder_left": 92.0,
            "shoulder_right": 92.0,
            "trunk_lean": trunk_lean,
            "shoulder_mid_x": 0.5,
            "hip_mid_x": 0.5,
            "wrist_height_delta": 0.01,
            "knee_angle_delta": 0.0,
            "elbow_angle_delta": 0.0,
        },
        "muscle_engagement": {
            "lats_left": 0.48,
            "lats_right": 0.47,
            "bicep_left": 0.36,
            "bicep_right": 0.35,
            "forearm_left": 0.24,
            "forearm_right": 0.24,
            "trapezius_left": 0.21,
            "trapezius_right": 0.21,
            "abs_upper": 0.18,
        },
    }


class LiveCoachTests(unittest.TestCase):
    def test_normalize_live_samples_filters_invalid_payloads(self):
        samples = normalize_live_samples(
            [
                {"timestamp": 0.0, "keypoints": {}, "metrics": {}, "muscle_engagement": {}},
                {"bad": "shape"},
                {"timestamp": "2.4", "keypoints": {"left_shoulder": {}}, "metrics": {}, "muscleEngagement": {"lats_left": 0.2}},
            ]
        )

        self.assertEqual(len(samples), 1)
        self.assertEqual(samples[-1]["timestamp"], 2.4)

    def test_analyze_live_samples_counts_pull_up_reps_and_builds_cue(self):
        shoulder_cycle = [0.45, 0.44, 0.42, 0.38, 0.32, 0.28, 0.32, 0.38, 0.42, 0.45]
        elbow_cycle = [165, 160, 150, 132, 110, 88, 110, 132, 150, 165]
        samples = [
            _sample(index * 0.45, shoulder_y, elbow_angle)
            for index, (shoulder_y, elbow_angle) in enumerate(zip(shoulder_cycle * 3, elbow_cycle * 3))
        ]

        payload = analyze_live_samples(
            samples=samples,
            coach_id="max",
            exercise_hint="auto",
            last_rep_count=1,
        )

        self.assertTrue(payload["detected"])
        self.assertEqual(payload["exercise_type"], "pull_up")
        self.assertEqual(payload["rep_count"], 2)
        self.assertEqual(payload["rep_delta"], 1)
        self.assertIn("rep 2", payload["voice"].lower())
        self.assertIn("traction", payload["body"].lower())
        self.assertIn("lats_left", payload["muscle_engagement"])

    def test_analyze_live_samples_uses_hint_for_feedback(self):
        samples = [_sample(index * 0.5, 0.48, 155.0, trunk_lean=0.34) for index in range(6)]

        payload = analyze_live_samples(
            samples=samples,
            coach_id="dr_reed",
            exercise_hint="pull_up",
            last_rep_count=0,
        )

        self.assertEqual(payload["exercise_type"], "pull_up")
        self.assertIn("stabilité", payload["body"].lower())
        self.assertIn(payload["phase"], {"setup", "hold", "down", "up"})


if __name__ == "__main__":
    unittest.main()
