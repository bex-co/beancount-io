"""Managed-engine provisioning across processes: parallel first use (w1/120).

Real processes and a real lock, with `uv` replaced by a slow shell script that
lays out the files `paths.is_provisioned` looks for — so the race windows are
wide, and no network is involved.
"""

from __future__ import annotations

import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="the fake uv is a POSIX shell script")

SOURCE_ROOT = Path(__file__).parent.parent / "src"

PROVISION = "from cli.engine.provision import ensure_engine; print(ensure_engine())"


@pytest.fixture
def fake_uv(tmp_path: Path) -> Path:
    """`uv venv` builds the layout slowly; `uv pip install` just takes its time."""
    script = tmp_path / "uv"
    script.write_text(
        textwrap.dedent(
            """\
            #!/bin/sh
            if [ "$1" = venv ]; then
              for target; do :; done
              mkdir -p "$target/bin" "$target/lib/python3.12/site-packages/beanquery"
              : > "$target/bin/python"
            fi
            sleep 0.4
            """
        )
    )
    script.chmod(0o755)
    return script


def _env(fake_uv: Path, engine: Path) -> dict[str, str]:
    env = {key: value for key, value in os.environ.items() if not key.startswith("BEA_")}
    return {**env, "BEA_UV": str(fake_uv), "BEA_ENGINE_DIR": str(engine), "PYTHONPATH": str(SOURCE_ROOT)}


def test_parallel_first_use_all_succeed_and_leave_one_engine(fake_uv: Path, tmp_path: Path) -> None:
    engine = tmp_path / "engines" / "0.3.1"
    env = _env(fake_uv, engine)

    children = [
        subprocess.Popen(
            [sys.executable, "-c", PROVISION], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        for _ in range(8)
    ]
    results = [(child.wait(timeout=120), *child.communicate()) for child in children]

    failures = [(code, err) for code, _out, err in results if code != 0]
    assert failures == [], failures
    assert {out.strip() for _code, out, _err in results} == {str(engine / "bin" / "python")}
    leftovers = sorted(path.name for path in engine.parent.iterdir() if path.name != engine.name)
    assert [name for name in leftovers if ".partial." in name or ".discarded." in name] == []
