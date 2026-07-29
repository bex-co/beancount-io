import asyncio
from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def event_loop() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield
    loop.close()
    asyncio.set_event_loop(None)


@pytest.fixture
def tmp_bean_file(tmp_path: Path) -> Path:
    f = tmp_path / "main.bean"
    f.write_text("")
    return f
