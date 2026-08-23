from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://mios:mios_dev@localhost:5432/mios"
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7
    storage_dir: str = "./storage"

    embedding_provider: str = "local"  # local | openai
    embedding_dim: int = 384
    openai_api_key: str = ""

    llm_provider: str = "none"  # none | openai | anthropic
    anthropic_api_key: str = ""

    chunk_size: int = 1200
    chunk_overlap: int = 150
    retrieve_top_k: int = 8

    ocr_dpi: int = 300
    analytics_max_rows: int = 50000
    analytics_result_limit: int = 1000
    analytics_timeout_ms: int = 5000


@lru_cache
def get_settings() -> Settings:
    return Settings()
