from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from pathlib import Path

from .api.routes import workouts, coach, nutrition
from .core.config import settings
from .core.schema_guard import ensure_runtime_schema

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


@app.on_event("startup")
async def startup() -> None:
    ensure_runtime_schema()


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Erreur backend non gérée: {str(exc)}"},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MuscleVision API"}
