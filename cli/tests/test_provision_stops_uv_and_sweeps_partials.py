"""Stopping `bea` mid-provision stops uv, and no partial survives the retry (w5/786).

`provision._run` was a bare `subprocess.run`: SIGTERM to `bea` alone left
`uv pip install` running, and a retry in that window swept the dead PID's
partial while uv was still writing into it — the resurrected directory then
survived forever, since provisioning never runs again. Install steps now run
through the w5/437 forwarding wrapper, and a successful publish sweeps
partials abandoned since the pre-build sweep.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

from tests.test_native_termination_reaches_child import _alive

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "2026-01-01 open Assets:Cash USD\n"
INSTALLED_CONTEXT = (
    "from pathlib import Path\nfrom cli.engine import paths\n"
    "paths.checkout_source_root = lambda: None\n"
    f"paths.helper_source_root = lambda: Path({str(ROOT / 'src')!r})\n"
)


def _hanging_uv(directory: Path) -> Path:
    """`uv venv` lays out a working interpreter fast; `uv pip install` hangs until flagged."""
    shim = directory / "uv"
    ready, pid, flag = directory / "ready", directory / "uv.pid", directory / "succeed"
    shim.write_text(
        "#!/bin/sh\n"
        'if [ "$1" = "venv" ]; then\n'
        "  for target; do :; done\n"
        '  mkdir -p "$target/bin" "$target/lib/python3.12/site-packages/beancount" '
        '"$target/lib/python3.12/site-packages/beanquery"\n'
        f'  printf "#!{sys.executable}\\nimport os, sys\\nos.execv(sys.executable, [sys.executable, *sys.argv[1:]])\\n"'
        ' > "$target/bin/python"\n'
        '  chmod +x "$target/bin/python"\n'
        "  exit 0\n"
        "fi\n"
        f'if [ -e "{flag}" ]; then exit 0; fi\n'
        f'echo $$ > "{pid}"\n'
        f': > "{ready}"\n'
        "exec sleep 30\n"
    )
    shim.chmod(0o755)
    return shim


def _first_use_env(directory: Path, shim: Path) -> dict[str, str]:
    (directory / "main.bean").write_text(LEDGER)
    bootstrap = directory / "bootstrap"
    bootstrap.mkdir(exist_ok=True)
    (bootstrap / "sitecustomize.py").write_text(INSTALLED_CONTEXT)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(directory / "config"),
        XDG_CACHE_HOME=str(directory / "cache"),
        XDG_DATA_HOME=str(directory / "data"),
        BEA_ENGINE_DIR=str(directory / "managed" / "engine"),
        BEA_UV=str(shim),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=os.pathsep.join([str(bootstrap), str(ROOT / "src")]),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")
def test_sigterm_mid_install_stops_uv_and_no_partial_survives_the_retry(tmp_path: Path) -> None:
    shim = _hanging_uv(tmp_path)
    env = _first_use_env(tmp_path, shim)
    ready, pidfile, flag = tmp_path / "ready", tmp_path / "uv.pid", tmp_path / "succeed"
    managed = tmp_path / "managed"
    process = subprocess.Popen(
        [sys.executable, "-m", "cli.main", "-f", "main.bean", "check"],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )
    try:
        deadline = time.monotonic() + 60
        while not ready.exists():
            if process.poll() is not None:
                pytest.fail(f"bea exited before uv started installing: {process.communicate()}")
            if time.monotonic() >= deadline:
                pytest.fail("uv never started installing")
            time.sleep(0.02)
        uv_pid = int(pidfile.read_text().strip())
        process.send_signal(signal.SIGTERM)
        assert process.wait(timeout=15) == -signal.SIGTERM
        deadline = time.monotonic() + 2
        while _alive(uv_pid) and time.monotonic() < deadline:
            time.sleep(0.05)
        assert not _alive(uv_pid), "uv outlived the bea it was installing for"
    finally:
        if process.poll() is None:
            process.kill()
        process.wait()
    assert list(managed.glob("engine.partial.*")), "the killed build left no partial to retry over"

    flag.write_text("ok")
    retry = subprocess.run(
        [sys.executable, "-m", "cli.main", "-f", "main.bean", "check"],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )
    assert retry.returncode == 0, retry.stdout + retry.stderr
    assert "Beancount engine" in retry.stderr and "ready." in retry.stderr
    assert list(managed.glob("engine.partial.*")) == []


def test_publish_sweeps_a_partial_abandoned_mid_build(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """A writer that dies after the pre-build sweep leaves nothing behind (no signals)."""
    from cli.engine import paths, provision

    root = tmp_path / "managed" / "engine"
    monkeypatch.setenv(paths.DIR_ENV, str(root))
    monkeypatch.delenv(paths.PYTHON_ENV, raising=False)
    planted: list[Path] = []

    def fake_run(command: list[str], *, failure: str) -> None:
        if command[1] == "venv":
            target = Path(command[-1])
            (target / "bin").mkdir(parents=True)
            (target / "bin" / "python").write_text("")
            for package in ("beancount", "beanquery"):
                (target / "lib" / "python3.12" / "site-packages" / package).mkdir(parents=True)
        else:
            stale = root.parent / f"{root.name}.partial.999999999"
            stale.mkdir(parents=True)
            planted.append(stale)

    monkeypatch.setattr(provision, "_find_uv", lambda: "uv")
    monkeypatch.setattr(provision, "_run", fake_run)

    provision.provision(root)

    assert planted, "the fixture never planted its stale partial"
    assert all(not stale.exists() for stale in planted)
    assert paths.is_provisioned(root)
