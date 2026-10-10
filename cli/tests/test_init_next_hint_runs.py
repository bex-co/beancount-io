"""The `Next:` command init prints must run as printed, home-relative paths included (w5/055)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SHELLS = [shell for shell in ("/bin/sh", "/bin/bash", "/bin/zsh") if Path(shell).exists()]


def _env(home: Path) -> dict[str, str]:
    """An isolated environment whose home is `home` and whose PATH resolves `bea` to this checkout."""
    bin_dir = home / ".bin"
    bin_dir.mkdir(exist_ok=True)
    shim = bin_dir / "bea"
    shim.write_text(f'#!/bin/sh\nexec "{sys.executable}" -m cli.main "$@"\n')
    shim.chmod(0o755)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        HOME=str(home),
        PATH=f"{bin_dir}{os.pathsep}{env.get('PATH', '')}",
        BEA_CONFIG_DIR=str(home / ".config"),
        XDG_CACHE_HOME=str(home / ".cache"),
        XDG_DATA_HOME=str(home / ".data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _init_hint(env: dict[str, str], cwd: Path, target: Path) -> str:
    result = subprocess.run(
        ["bea", "--no-input", "init", str(target), "--currency", "USD", "--date", "2026-01-01"],
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    hints = [line.removeprefix("Next: ") for line in result.stdout.splitlines() if line.startswith("Next: ")]
    assert len(hints) == 1, result.stdout
    return hints[0]


@pytest.mark.skipif(sys.platform == "win32" or not SHELLS, reason="executes the hint in a POSIX shell")
@pytest.mark.parametrize(
    "relative",
    [
        "books/custom.bean",
        "books/custom-b.beancount",
        "my books/custom repeat 空白.bean",
        "books/it's; mine.bean",
        "custom.bean",
        "books/main.beancount",
        # Controls: a main.bean elsewhere gets the `cd … && bea check` form.
        "regular/main.bean",
        "my regular 空白/main.bean",
        "main.bean",
    ],
)
def test_printed_next_command_checks_the_new_ledger(tmp_path: Path, relative: str) -> None:
    home = tmp_path / "home"
    elsewhere = tmp_path / "elsewhere"
    home.mkdir()
    elsewhere.mkdir()
    env = _env(home)
    target = home / relative
    target.parent.mkdir(parents=True, exist_ok=True)

    hint = _init_hint(env, elsewhere, target)
    assert "~" in hint, hint
    created = target.read_bytes()

    for shell in SHELLS:
        ran = subprocess.run([shell, "-c", hint], env=env, cwd=elsewhere, capture_output=True, text=True, timeout=120)
        assert ran.returncode == 0, f"{shell} -c {hint!r}: {ran.stderr or ran.stdout}"
    assert target.read_bytes() == created


@pytest.mark.skipif(sys.platform == "win32" or not SHELLS, reason="executes the hint in a POSIX shell")
def test_printed_next_command_outside_home_runs(tmp_path: Path) -> None:
    home = tmp_path / "home"
    outside = tmp_path / "out side"
    home.mkdir()
    outside.mkdir()
    env = _env(home)

    hint = _init_hint(env, home, outside / "custom.bean")
    assert "~" not in hint, hint
    for shell in SHELLS:
        ran = subprocess.run([shell, "-c", hint], env=env, cwd=home, capture_output=True, text=True, timeout=120)
        assert ran.returncode == 0, f"{shell} -c {hint!r}: {ran.stderr or ran.stdout}"
