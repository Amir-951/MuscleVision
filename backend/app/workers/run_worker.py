"""
Entrypoint worker RQ compatible macOS.

Sur macOS, certaines dépendances natives de l'analyse vidéo peuvent faire
crasher un process enfant RQ après `fork()`. On utilise donc `SimpleWorker`
par défaut sur Darwin pour éviter cette classe de crash.
"""

from __future__ import annotations

import argparse
import os
import platform

from redis import Redis
from rq import Queue, SimpleWorker, Worker

from ..core.config import settings


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _choose_worker_class(force_simple: bool | None = None):
    if force_simple is not None:
        return SimpleWorker if force_simple else Worker

    default_simple = platform.system() == "Darwin"
    use_simple = _env_flag("MUSCLEVISION_SIMPLE_WORKER", default_simple)
    return SimpleWorker if use_simple else Worker


def main():
    parser = argparse.ArgumentParser(description="Run the MuscleVision RQ worker.")
    parser.add_argument("queues", nargs="*", default=["video_processing"])
    parser.add_argument("--url", default=settings.redis_url)
    parser.add_argument("--simple", action="store_true", help="Force SimpleWorker mode.")
    parser.add_argument(
        "--fork-worker",
        action="store_true",
        help="Force the standard Worker implementation.",
    )
    parser.add_argument("--burst", action="store_true")
    parser.add_argument("--logging-level", default="INFO")
    args = parser.parse_args()

    if args.simple and args.fork_worker:
        raise SystemExit("Choose either --simple or --fork-worker, not both.")

    force_simple = True if args.simple else False if args.fork_worker else None
    worker_cls = _choose_worker_class(force_simple)

    connection = Redis.from_url(args.url)
    queues = [Queue(name, connection=connection) for name in args.queues]
    worker = worker_cls(queues, connection=connection, prepare_for_work=True)
    worker.work(burst=args.burst, logging_level=args.logging_level)


if __name__ == "__main__":
    main()
