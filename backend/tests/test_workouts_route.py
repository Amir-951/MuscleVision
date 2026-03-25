import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/musclevision")

from app.api.routes import workouts


class WorkoutsRouteTests(unittest.TestCase):
    def test_get_workout_result_formats_enriched_payload(self):
        session = {
            "id": "session-1",
            "status": "done",
            "source": "upload",
            "video_url": "http://127.0.0.1:8000/static/uploads/session-1/source.webm",
            "exercise_type": "squat",
            "correctness_score": 92,
            "duration_seconds": 24,
            "analysis_text": "exercise=squat\nreps=3",
            "analysis_artifact_url": "http://127.0.0.1:8000/static/analysis/session-1/analysis.txt",
            "keypoints_artifact_url": "http://127.0.0.1:8000/static/analysis/session-1/keypoints.json",
            "rep_count": 3,
            "tempo_seconds": 8.0,
            "symmetry_score": 0.94,
            "stability_score": 0.9,
            "feedback": "Très propre.",
        }
        muscles = [
            {"muscle_name": "quad_left", "engagement_value": 0.81},
            {"muscle_name": "quad_right", "engagement_value": 0.79},
        ]

        with (
            patch("app.api.routes.workouts.fetch_one", return_value=session),
            patch("app.api.routes.workouts.fetch_all", return_value=muscles),
        ):
            payload = asyncio.run(workouts.get_workout_result("session-1"))

        self.assertEqual(payload["session_id"], "session-1")
        self.assertEqual(payload["tempo"], "8.0s/rep")
        self.assertEqual(payload["rep_count"], 3)
        self.assertEqual(payload["analysis_text"], "exercise=squat\nreps=3")
        self.assertEqual(payload["muscle_engagement"]["quad_left"], 0.81)

    def test_get_workout_result_rejects_processing_session(self):
        session = {"id": "session-2", "status": "processing"}

        with patch("app.api.routes.workouts.fetch_one", return_value=session):
            with self.assertRaises(HTTPException) as context:
                asyncio.run(workouts.get_workout_result("session-2"))

        self.assertEqual(context.exception.status_code, 202)


if __name__ == "__main__":
    unittest.main()
