from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_ENTRY_FILE = Path("main.bean")


def config_dir() -> Path:
    """Per-user state directory: `$BEA_CONFIG_DIR`, else `$XDG_CONFIG_HOME/bea`, else `~/.config/bea`.

    Resolved on every call rather than at import: the environment is what tests
    and CI jobs set, and a value frozen at import time would ignore them.
    """
    override = os.environ.get("BEA_CONFIG_DIR")
    if override:
        return Path(override).expanduser()
    xdg = os.environ.get("XDG_CONFIG_HOME")
    if xdg:
        return Path(xdg).expanduser() / "bea"
    return Path.home() / ".config" / "bea"


def credentials_path() -> Path:
    return config_dir() / "credentials.json"


def history_path() -> Path:
    return config_dir() / "ask_history"


def user_skills_dir() -> Path:
    return config_dir() / "skills"


class Settings(BaseSettings):
    api_url: str = "https://api.v3.beancount.io"
    dashboard_url: str = "https://beancount.io"

    model_config = SettingsConfigDict(env_prefix="BEA_", extra="ignore")

    @property
    def graphql_endpoint(self) -> str:
        return f"{self.api_url.rstrip('/')}/api-gateway/"


settings = Settings()


def package_version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("beancount-io")
    except PackageNotFoundError:
        return "0+unknown"
