import asyncio
import os
import unittest
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/musclevision")

from app.api.routes.coach import MessageRequest, send_message


class CoachRouteTests(unittest.TestCase):
    def test_send_message_uses_compact_analysis_text_context(self):
        request = MessageRequest(
            coach_id="dr_reed",
            user_id="user-1",
            message="Que dois-je corriger ?",
            session_id="session-1",
        )
        build_messages_calls = []

        def fake_build_messages(history, message, workout_context):
            build_messages_calls.append(
                {
                    "history": history,
                    "message": message,
                    "workout_context": workout_context,
                }
            )
            return [{"role": "user", "content": message}]

        with (
            patch("app.api.routes.coach.fetch_one") as mocked_fetch_one,
            patch("app.api.routes.coach.fetch_all", return_value=[]),
            patch("app.api.routes.coach.execute"),
            patch("app.api.routes.coach.build_messages", side_effect=fake_build_messages),
            patch("app.api.routes.coach.complete_chat", return_value="Travaille la stabilité."),
        ):
            mocked_fetch_one.side_effect = [
                None,
                {
                    "id": "session-1",
                    "exercise_type": "squat",
                    "correctness_score": 81,
                    "analysis_text": "exercise=squat\nreps=4\nalerts=buste_penche",
                    "feedback": "Descente correcte, gainage à consolider.",
                },
            ]

            payload = asyncio.run(send_message(request))

        self.assertEqual(payload["reply"], "Travaille la stabilité.")
        self.assertEqual(len(build_messages_calls), 1)
        workout_context = build_messages_calls[0]["workout_context"]
        self.assertEqual(workout_context["session_id"], "session-1")
        self.assertEqual(workout_context["analysis_text"], "exercise=squat\nreps=4\nalerts=buste_penche")
        self.assertIn("feedback", workout_context)
        self.assertNotIn("video_url", workout_context)


if __name__ == "__main__":
    unittest.main()
