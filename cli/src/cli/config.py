from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

from cli.paths import expand_path

if TYPE_CHECKING:
    from cli.settings import Settings

DEFAULT_ENTRY_FILE = Path("main.bean")
DEFAULT_ENTRY_FILE_FALLBACKS = (Path("main.bean"), Path("main.beancount"))


def default_entry(directory: Path = Path(".")) -> Path | None:
    """The root ledger bea finds in `directory`: `main.bean`, then `main.beancount`.

    Present, not just a file: a dangling `main.bean` link or a `main.bean`
    directory must not fall through to an older `main.beancount` (w5/295).
    """
    for name in DEFAULT_ENTRY_FILE_FALLBACKS:
        if os.path.lexists(directory / name):
            return directory / name
    return None


def _xdg_home(variable: str, default: Path) -> Path:
    """An XDG base directory, ignoring a relative value as the spec requires.

    A relative path would resolve against whatever directory a command ran
    from, so state would scatter across working directories.
    """
    value = expand_path(Path(os.environ.get(variable) or ""), f"${variable}")
    return value if value.is_absolute() else default


def config_dir() -> Path:
    """Per-user state directory: `$BEA_CONFIG_DIR`, else `$XDG_CONFIG_HOME/bea`, else `~/.config/bea`.

    Resolved on every call rather than at import: the environment is what tests
    and CI jobs set, and a value frozen at import time would ignore them.

    A relative `$BEA_CONFIG_DIR` is refused rather than ignored like a relative
    XDG value: it was set for bea alone, and falling back would quietly put
    credentials somewhere other than where the user pointed.
    """
    override = os.environ.get("BEA_CONFIG_DIR")
    if override:
        directory = expand_path(Path(override), "$BEA_CONFIG_DIR")
        if not directory.is_absolute():
            from cli.errors import UsageError

            raise UsageError(
                f"BEA_CONFIG_DIR must be an absolute path, got {override!r}. "
                "A relative one would keep separate state in every working directory."
            )
        return directory
    return _xdg_home("XDG_CONFIG_HOME", Path.home() / ".config") / "bea"


def credentials_path() -> Path:
    return config_dir() / "credentials.json"


def cache_dir() -> Path:
    """Local caches and locks, separate from ledger files and user settings."""
    return _xdg_home("XDG_CACHE_HOME", Path.home() / ".cache") / "bea"


def data_dir() -> Path:
    """Managed installations — today the Beancount engine — under `$XDG_DATA_HOME/bea`.

    Not `cache_dir()`: a provisioned engine is not recomputable from local
    state, so a cache cleaner deleting it would leave every local command
    needing a download before it could run again.
    """
    return _xdg_home("XDG_DATA_HOME", Path.home() / ".local" / "share") / "bea"


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
