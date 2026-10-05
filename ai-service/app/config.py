"""Environment-driven configuration. No secrets or URLs are hard-coded."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ai_host: str = "127.0.0.1"
    ai_port: int = 8000
    ai_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    ai_log_level: str = "info"

    ai_model_mode: str = "heuristic"
    ai_model_path: str = ""
    ai_labels_path: str = ""

    ai_max_upload_mb: int = 10

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ai_cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.ai_max_upload_mb * 1024 * 1024

    @property
    def uses_model(self) -> bool:
        return self.ai_model_mode.lower() == "model" and bool(self.ai_model_path)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
