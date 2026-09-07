from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://mios:mios_dev@localhost:5432/mios"
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    storage_dir: str = "./storage"

    embedding_provider: str = "openai"  # openai | local
    embedding_dim: int = 384
    openai_api_key: str = ""

    # D-1 decision: OpenAI-primary. Falls back to extractive/local when no key set.
    llm_provider: str = "openai"  # openai | anthropic | grok | none
    anthropic_api_key: str = ""
    xai_api_key: str = ""
    xai_model: str = ""  # Select an available Grok model in the xAI console.
    auth_provider: str = "legacy"  # legacy | supabase; never auto-fallback between them
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    dev_bootstrap_schema: bool = False
    production_drafts_enabled: bool = False
    cors_origins: list[str] = []
    payment_sandbox_enabled: bool = False
    sslcommerz_store_id: str = ""
    sslcommerz_store_password: str = ""
    api_public_base_url: str = ""

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
