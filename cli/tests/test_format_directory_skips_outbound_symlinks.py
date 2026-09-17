"""Directory-scoped format must not follow outbound symlinks (w3/329)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
2020-01-02 * "T"
  Expenses:Food 5 USD
  Assets:Cash
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_format_directory_skips_outbound_symlinks(tmp_path: Path) -> None:
    books = tmp_path / "books"
    inner = books / "inner"
    inner.mkdir(parents=True)
    external = books / "external.bean"
    external.write_text(LEDGER)
    before = external.read_bytes()
    (inner / "link.bean").symlink_to(Path("..") / "external.bean")

    check = _bea(tmp_path, "format", "--check", str(inner))
    assert check.returncode == 0, check.stderr or check.stdout
    assert "external.bean" not in check.stdout + check.stderr

    applied = _bea(tmp_path, "format", "-i", str(inner))
    # Nothing was eligible to rewrite, so -i is a no-op failure (w1/m23/t006) —
    # the safety property is that the outbound target is still untouched.
    assert applied.returncode == 2, applied.stderr or applied.stdout
    assert "No .bean or .beancount files found to rewrite." in applied.stderr
    assert external.read_bytes() == before
    assert (inner / "link.bean").is_symlink()
