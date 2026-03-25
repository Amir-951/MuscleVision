from .database import execute


WORKOUT_SESSION_RUNTIME_ALTERS = [
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'webcam'))",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS video_format TEXT",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS analysis_text TEXT",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS analysis_artifact_url TEXT",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS keypoints_artifact_url TEXT",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS feedback TEXT",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS rep_count INTEGER DEFAULT 0",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS tempo_seconds DECIMAL(6,2)",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS symmetry_score DECIMAL(4,3)",
    "ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS stability_score DECIMAL(4,3)",
]


def ensure_runtime_schema() -> None:
    for statement in WORKOUT_SESSION_RUNTIME_ALTERS:
        execute(statement)
