from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    groq_api_key: str | None = None
    groq_text_model: str = "llama-3.3-70b-versatile"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    ai_provider: str = "groq"
    redis_url: str = "redis://localhost:6379"
    database_url: str
    public_base_url: str = "http://localhost:8000"
    analysis_storage_mode: str = "local"
    analysis_bucket: str = "analysis-artifacts"
    local_storage_path: str = "storage"

    class Config:
        env_file = ".env"


settings = Settings()
