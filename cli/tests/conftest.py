import asyncio
from collections.abc import Iterator
from pathlib import Path

import pytest

from cli import context


@pytest.fixture(autouse=True)
def event_loop() -> Iterator[None]:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield
    loop.close()
    asyncio.set_event_loop(None)


@pytest.fixture(autouse=True)
def bea_config_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Give every test its own `~/.config/bea` and a clean `BEA_*` environment.

    Autouse, because a test that read the developer's real credentials or wrote
    to their config directory would be both flaky and rude.
    """
    directory = tmp_path / "bea-config"
    monkeypatch.setenv("BEA_CONFIG_DIR", str(directory))
    for name in ("BEA_FILE", "BEA_TOKEN", "CI"):
        monkeypatch.delenv(name, raising=False)
    context.configure()
    return directory


@pytest.fixture
def logged_in(monkeypatch: pytest.MonkeyPatch) -> None:
    """Authenticate the way an unattended job does, through the real credential path."""
    monkeypatch.setenv("BEA_TOKEN", "test-token")


@pytest.fixture
def tmp_bean_file(tmp_path: Path) -> Path:
    f = tmp_path / "main.bean"
    f.write_text("")
    return f
