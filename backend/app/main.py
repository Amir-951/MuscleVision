from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pathlib import Path

from .api.routes import workouts, coach, nutrition
from .core.config import settings

app = FastAPI(
    title="MuscleVision API",
    description="Backend pour l'analyse de mouvement et le coaching IA",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restreindre en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workouts.router)
app.include_router(coach.router)
app.include_router(nutrition.router)

static_root = Path(settings.local_storage_path)
static_root.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_root), name="static")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MuscleVision API"}
