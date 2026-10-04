"""Managed-engine provisioning across processes: parallel first use, abandoned builds (w1/120, w1/123).

Real processes and a real lock, with `uv` replaced by a slow shell script that
lays out the files `paths.is_provisioned` looks for — so the race windows are
wide, and no network is involved.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import textwrap
import time
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
              mkdir -p "$target/bin" "$target/lib/python3.12/site-packages/beanquery" \\
                "$target/lib/python3.12/site-packages/beancount"
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


def test_an_install_killed_by_sigterm_leaves_nothing_after_the_next_run(fake_uv: Path, tmp_path: Path) -> None:
    """w1/123: SIGTERM skips the build's own cleanup; the next provision sweeps it."""
    engine = tmp_path / "engines" / "0.3.1"
    env = _env(fake_uv, engine)
    killed = subprocess.Popen([sys.executable, "-c", PROVISION], env=env, stderr=subprocess.DEVNULL)
    partial = engine.with_name(f"{engine.name}.partial.{killed.pid}")
    deadline = time.monotonic() + 30
    while not (partial / "bin" / "python").exists():
        assert time.monotonic() < deadline, "the build never started"
        time.sleep(0.02)
    killed.send_signal(signal.SIGTERM)
    killed.wait(timeout=30)
    assert partial.is_dir(), "precondition: SIGTERM left the partial build behind"

    subprocess.run([sys.executable, "-c", PROVISION], env=env, check=True, capture_output=True)

    assert sorted(path.name for path in engine.parent.iterdir()) == ["0.3.1", "0.3.1.lock"]


def test_a_live_processs_build_is_left_alone(fake_uv: Path, tmp_path: Path) -> None:
    engine = tmp_path / "engines" / "0.3.1"
    with subprocess.Popen(["sleep", "30"]) as alive:
        try:
            busy = engine.with_name(f"{engine.name}.partial.{alive.pid}")
            busy.mkdir(parents=True)

            subprocess.run(
                [sys.executable, "-c", PROVISION], env=_env(fake_uv, engine), check=True, capture_output=True
            )

            assert busy.is_dir()
        finally:
            alive.kill()
