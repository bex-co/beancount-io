from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from cli.settings import Settings

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


def cache_dir() -> Path:
    """Local caches and locks, separate from ledger files and user settings."""
    base = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache").expanduser()
    return base / "bea"


def data_dir() -> Path:
    """Managed installations — today the Beancount engine — under `$XDG_DATA_HOME/bea`.

    Not `cache_dir()`: a provisioned engine is not recomputable from local
    state, so a cache cleaner deleting it would leave every local command
    needing a download before it could run again.
    """
    base = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share").expanduser()
    return base / "bea"


def history_path() -> Path:
    return config_dir() / "ask_history"


def user_skills_dir() -> Path:
    return config_dir() / "skills"


def settings() -> Settings:
    """Server endpoints, read from `BEA_*` at the moment a server is needed.

    Imported inside the function on purpose: declaring a `BaseSettings`
    subclass runs pydantic's plugin loader, which drags in logfire,
    OpenTelemetry, protobuf and requests — roughly 150 ms and 650 modules that
    `bea --help` and `bea --version` must never pay for, and that arrive on
    every machine where the optional `ask` extra is installed.
    """
    from cli.settings import Settings

    return Settings()


def package_version() -> str:
    from importlib.metadata import PackageNotFoundError, version

    try:
        return version("beancount-io")
    except PackageNotFoundError:
        return "0+unknown"
