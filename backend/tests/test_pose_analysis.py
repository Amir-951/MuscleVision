import unittest

from app.services.pose_analysis import compute_correctness_score, detect_exercise_type


def _pull_up_frame(shoulder_y: float, elbow_angle: float) -> dict:
    return {
        "timestamp": 0.0,
        "keypoints": {
            "left_shoulder": {"x": 0.42, "y": shoulder_y, "z": 0.0, "visibility": 1.0},
            "right_shoulder": {"x": 0.58, "y": shoulder_y, "z": 0.0, "visibility": 1.0},
            "left_wrist": {"x": 0.4, "y": shoulder_y - 0.18, "z": 0.0, "visibility": 1.0},
            "right_wrist": {"x": 0.6, "y": shoulder_y - 0.18, "z": 0.0, "visibility": 1.0},
            "left_hip": {"x": 0.45, "y": 0.76, "z": 0.0, "visibility": 1.0},
            "right_hip": {"x": 0.55, "y": 0.76, "z": 0.0, "visibility": 1.0},
        },
        "metrics": {
            "elbow_left": elbow_angle,
            "elbow_right": elbow_angle - 4,
            "knee_left": 148.0,
            "knee_right": 150.0,
            "hip_left": 154.0,
            "hip_right": 156.0,
            "shoulder_left": 96.0,
            "shoulder_right": 94.0,
            "trunk_lean": 0.12,
            "shoulder_mid_x": 0.5,
            "hip_mid_x": 0.5,
            "wrist_height_delta": 0.01,
            "knee_angle_delta": 2.0,
            "elbow_angle_delta": 4.0,
        },
    }


class PoseAnalysisTests(unittest.TestCase):
    def test_detect_exercise_type_recognizes_pull_up(self):
        shoulder_cycle = [0.46, 0.44, 0.4, 0.35, 0.3, 0.27, 0.3, 0.35, 0.4, 0.45]
        elbow_cycle = [168, 160, 148, 130, 108, 90, 108, 130, 148, 165]
        frames = [
            _pull_up_frame(float(shoulder_y), float(elbow_angle))
            for shoulder_y, elbow_angle in zip(shoulder_cycle * 4, elbow_cycle * 4)
        ]
        engagements = [
            {
                "bicep_left": 0.34,
                "bicep_right": 0.33,
                "tricep_left": 0.12,
                "tricep_right": 0.11,
                "lats_left": 0.42,
                "lats_right": 0.43,
                "deltoid_left": 0.29,
                "deltoid_right": 0.28,
                "quad_left": 0.14,
                "quad_right": 0.15,
                "glute_left": 0.18,
                "glute_right": 0.19,
                "forearm_left": 0.24,
                "forearm_right": 0.24,
                "chest_left": 0.08,
                "chest_right": 0.08,
                "hamstring_left": 0.16,
                "hamstring_right": 0.16,
            }
            for _ in frames
        ]

        self.assertEqual(detect_exercise_type(engagements, frames), "pull_up")

    def test_pull_up_correctness_score_uses_back_and_arm_chain(self):
        engagements = [
            {
                "lats_left": 0.44,
                "lats_right": 0.43,
                "bicep_left": 0.34,
                "bicep_right": 0.35,
                "forearm_left": 0.25,
                "forearm_right": 0.24,
            }
            for _ in range(12)
        ]

        self.assertGreaterEqual(compute_correctness_score(engagements, "pull_up"), 90)


if __name__ == "__main__":
    unittest.main()
