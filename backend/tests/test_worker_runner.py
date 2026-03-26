import os
import unittest
from unittest.mock import patch

os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/musclevision")

from rq import SimpleWorker, Worker

from app.workers.run_worker import _choose_worker_class


class WorkerRunnerTests(unittest.TestCase):
    def test_choose_worker_class_defaults_to_simple_on_darwin(self):
        with patch("app.workers.run_worker.platform.system", return_value="Darwin"):
            self.assertIs(_choose_worker_class(), SimpleWorker)

    def test_choose_worker_class_defaults_to_worker_on_linux(self):
        with patch("app.workers.run_worker.platform.system", return_value="Linux"):
            self.assertIs(_choose_worker_class(), Worker)

    def test_choose_worker_class_honors_env_override(self):
        with (
            patch("app.workers.run_worker.platform.system", return_value="Linux"),
            patch.dict(os.environ, {"MUSCLEVISION_SIMPLE_WORKER": "true"}, clear=False),
        ):
            self.assertIs(_choose_worker_class(), SimpleWorker)


if __name__ == "__main__":
    unittest.main()
