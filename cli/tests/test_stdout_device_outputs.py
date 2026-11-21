"""`-o /dev/stdout` prints as `-o -` does, whatever stdout currently is (w5/795).

The device spellings were stat-ed: under a file redirect they look like
regular files, so treeify staged beside `/dev/fd`, example cried
conflict, and with stdout closed format blamed `/dev`. They now mean the
stream, as query already treats them.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BALANCES = "Assets:Cash  5\nAssets:Bank  7\n"
LEDGER = "2026-01-01 open Assets:Cash USD\n"

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="/dev/stdout names")


def _env(cwd: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(cwd / "config"),
        XDG_CACHE_HOME=str(cwd / "cache"),
        XDG_DATA_HOME=str(cwd / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _bea_to_file(cwd: Path, out: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run bea with stdout redirected to a file, as `> out` does."""
    with open(out, "wb") as stream:
        return subprocess.run(
            [sys.executable, "-m", "cli.main", "--no-input", *args],
            env=_env(cwd),
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=stream,
            stderr=subprocess.PIPE,
            text=True,
            timeout=120,
        )


def _close_stdout() -> None:
    try:
        os.close(1)
    except OSError:
        pass


def _bea_closed_stdout(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run bea with stdout closed, as `>&-` does."""
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *args],
        env=_env(cwd),
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        timeout=120,
        preexec_fn=_close_stdout,
    )


def test_treeify_stdout_device_matches_dash_under_a_file_redirect(tmp_path: Path) -> None:
    (tmp_path / "bal.txt").write_text(BALANCES)
    device = _bea_to_file(tmp_path, tmp_path / "device.txt", "treeify", "bal.txt", "-o", "/dev/stdout")
    assert device.returncode == 0, device.stderr
    dash = _bea_to_file(tmp_path, tmp_path / "dash.txt", "treeify", "bal.txt", "-o", "-")
    assert dash.returncode == 0, dash.stderr

    assert (tmp_path / "device.txt").read_bytes() == (tmp_path / "dash.txt").read_bytes() != b""


def test_example_stdout_device_writes_through_a_file_redirect(tmp_path: Path) -> None:
    # Seeded and bounded: an unseeded bean-example history sometimes trips its
    # own "Cash balance is negative" check, which is not what this pins.
    seeded = ("--seed", "1", "--date-begin", "2026-01-01", "--date-end", "2026-04-01")
    result = _bea_to_file(tmp_path, tmp_path / "out.bean", "example", *seeded, "-o", "/dev/stdout")

    assert result.returncode == 0, result.stderr
    text = (tmp_path / "out.bean").read_text()
    assert "open " in text


def test_format_stdout_device_matches_dash_under_a_file_redirect(tmp_path: Path) -> None:
    (tmp_path / "g.bean").write_text(LEDGER)
    device = _bea_to_file(tmp_path, tmp_path / "device.bean", "format", "g.bean", "-o", "/dev/stdout")
    assert device.returncode == 0, device.stderr
    dash = _bea_to_file(tmp_path, tmp_path / "dash.bean", "format", "g.bean", "-o", "-")
    assert dash.returncode == 0, dash.stderr

    assert (tmp_path / "device.bean").read_bytes() == (tmp_path / "dash.bean").read_bytes() != b""


@pytest.mark.parametrize("spelling", ["-", "/dev/stdout"])
def test_format_stdout_spellings_agree_when_stdout_is_closed(tmp_path: Path, spelling: str) -> None:
    (tmp_path / "g.bean").write_text(LEDGER)

    result = _bea_closed_stdout(tmp_path, "format", "g.bean", "-o", spelling)

    assert result.returncode == 0, result.stderr
    assert result.stderr == ""
