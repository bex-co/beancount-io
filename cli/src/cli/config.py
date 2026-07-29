from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DATA_DIR = Path.home() / ".beancount-cli"
CREDENTIALS_DIR = DATA_DIR
CREDENTIALS_PATH = DATA_DIR / "credentials.json"
DEFAULT_ENTRY_FILE = Path("main.bean")


class Settings(BaseSettings):
    api_url: str = "https://api.v3.beancount.io"
    dashboard_url: str = "https://beancount.io"

    model_config = SettingsConfigDict(env_prefix="BEANCOUNT_", extra="ignore")

    @property
    def graphql_endpoint(self) -> str:
        return f"{self.api_url.rstrip('/')}/api-gateway/"


settings = Settings()
