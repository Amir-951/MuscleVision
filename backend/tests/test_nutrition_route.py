import json
import os
import unittest

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/musclevision")

from app.api.routes.nutrition import _extract_json_payload


class NutritionRouteTests(unittest.TestCase):
    def test_extract_json_payload_accepts_plain_json(self):
        payload = _extract_json_payload('{"dish_name":"salad","estimated_calories":320}')
        self.assertEqual(payload["dish_name"], "salad")
        self.assertEqual(payload["estimated_calories"], 320)

    def test_extract_json_payload_accepts_fenced_json(self):
        payload = _extract_json_payload(
            """```json
            {"dish_name":"pasta","estimated_calories":540}
            ```"""
        )
        self.assertEqual(payload["dish_name"], "pasta")
        self.assertEqual(payload["estimated_calories"], 540)

    def test_extract_json_payload_accepts_wrapped_text(self):
        payload = _extract_json_payload(
            'Here is the result:\n{"dish_name":"omelet","estimated_calories":280}\nBon appetit.'
        )
        self.assertEqual(payload["dish_name"], "omelet")
        self.assertEqual(payload["estimated_calories"], 280)

    def test_extract_json_payload_rejects_missing_json(self):
        with self.assertRaises((ValueError, json.JSONDecodeError)):
            _extract_json_payload("No structured payload")


if __name__ == "__main__":
    unittest.main()
