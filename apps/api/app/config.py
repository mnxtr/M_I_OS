from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://mios:mios_dev@localhost:5432/mios"
    # Supabase owns user sessions in production. `legacy` is retained only for the
    # migration test path and can be removed once the old auth tables are retired.
    auth_mode: str = "supabase"  # supabase | legacy
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""
    supabase_jwt_audience: str = "authenticated"
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    storage_dir: str = "./storage"
    db_bootstrap: bool = False
    create_vector_extension: bool = False

    embedding_provider: str = "openai"  # openai | local
    embedding_dim: int = 384
    openai_api_key: str = ""

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
    public_base_url: str = "http://localhost:3000"
    usd_to_bdt_rate: float = 120.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
