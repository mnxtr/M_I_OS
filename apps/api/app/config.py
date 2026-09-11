from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://localhost:5432/mios"
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_audience: str = "authenticated"
    supabase_auto_provision_pilot: bool = False
    auto_create_schema: bool = False
    storage_dir: str = "./storage"
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3100"
    )

    embedding_provider: str = "openai"  # openai | local
    embedding_dim: int = 384
    openai_api_key: str = ""
    openai_model: str = "gpt-5.6-terra"
    openai_reasoning_effort: str = "low"
    openai_verbosity: str = "low"
    openai_timeout_seconds: float = 30.0
    openai_store_responses: bool = False

    # D-1 decision: OpenAI-primary. Falls back to extractive/local when no key set.
    llm_provider: str = "openai"  # openai | anthropic | none
    anthropic_api_key: str = ""

    chunk_size: int = 1200
    chunk_overlap: int = 150
    retrieve_top_k: int = 8

    ocr_dpi: int = 300
    analytics_max_rows: int = 50000
    analytics_result_limit: int = 1000
    analytics_timeout_ms: int = 5000

    use_celery: bool = False
    redis_url: str = "redis://localhost:6379/0"

    # Payments (D-3: bKash-first)
    bkash_base_url: str = "https://tokenized.sandbox.bka.sh/v1.2.0-beta"
    bkash_app_key: str = ""
    bkash_app_secret: str = ""
    bkash_username: str = ""
    bkash_password: str = ""
    public_base_url: str = "http://localhost:5173"
    usd_to_bdt_rate: float = 120.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
