from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import Field


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "data" / "lector.db"


class Settings(BaseSettings):
    # App
    app_name: str = "Lector"
    debug: bool = True

    # Database
    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH}"

    # LLM
    llm_mode: str = Field(default="mock", description="LLM mode: disabled, mock, local, cloud")
    llm_timeout: int = Field(default=30, description="Timeout for LLM calls in seconds")

    # Mock LLM settings
    mock_lookup_delay_ms: int = Field(default=100, description="Simulated delay for mock lookup")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()