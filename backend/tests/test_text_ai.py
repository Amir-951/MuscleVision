import os
import unittest
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/musclevision")

from app.services.text_ai import fallback_workout_feedback, generate_workout_feedback


class TextAITests(unittest.TestCase):
    def test_fallback_feedback_stays_compact_and_informative(self):
        feedback = fallback_workout_feedback(
            exercise_type="squat",
            score=84,
            symmetry_score=0.91,
            stability_score=0.87,
            rep_count=6,
            alerts=["profondeur_squat_limitee", "buste_penche"],
        )

        self.assertIn("squat", feedback)
        self.assertIn("84/100", feedback)
        self.assertIn("91%", feedback)
        self.assertIn("87%", feedback)
        self.assertIn("profondeur_squat_limitee", feedback)

    @patch("app.services.text_ai.complete_chat", return_value=None)
    def test_generate_workout_feedback_falls_back_without_llm(self, mocked_complete_chat):
        feedback = generate_workout_feedback(
            analysis_text="exercise=squat\nreps=4\nalerts=none",
            exercise_type="squat",
            score=90,
            symmetry_score=0.93,
            stability_score=0.89,
            rep_count=4,
            alerts=[],
        )

        mocked_complete_chat.assert_called_once()
        self.assertIn("squat", feedback)
        self.assertIn("90/100", feedback)

    @patch("app.services.text_ai.complete_chat", return_value="Correction stable et concise.")
    def test_generate_workout_feedback_uses_model_reply_when_available(self, mocked_complete_chat):
        feedback = generate_workout_feedback(
            analysis_text="exercise=push_up\nreps=8\nalerts=gainage_a_stabiliser",
            exercise_type="push_up",
            score=78,
            symmetry_score=0.88,
            stability_score=0.71,
            rep_count=8,
            alerts=["gainage_a_stabiliser"],
        )

        mocked_complete_chat.assert_called_once()
        self.assertEqual(feedback, "Correction stable et concise.")


if __name__ == "__main__":
    unittest.main()
