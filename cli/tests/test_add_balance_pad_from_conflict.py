"""`add balance --pad-from` refuses a second, different assertion for the day, as without it (w5/487).

The pad path skipped the same-day conflict check, so the write failed
validation with advice to date the pad after that very day, a command to
rerun the same write, and Beancount's duplicate error last. A different
number is refused under `--force` too, before staging (w1/366).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD

2026-01-25 balance Assets:Cash 0 USD
"""
ADD = ("add", "balance", "--date", "2026-01-25", "-a", "Assets:Cash", "--amount", "7 USD")


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "-f", str(tmp_path / "main.bean"), *args],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


@pytest.mark.parametrize("force", [(), ("--force",)], ids=["unforced", "forced"])
@pytest.mark.parametrize("pad", [(), ("--pad-from", "Equity:Opening")], ids=["plain", "pad-from"])
def test_the_same_refusal_with_or_without_a_pad(tmp_path: Path, pad: tuple[str, ...], force: tuple[str, ...]) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)

    result = _bea(tmp_path, *ADD, *pad, *force)

    assert result.returncode == 4, result.stdout + result.stderr
    flat = " ".join(result.stderr.split())
    assert "Assets:Cash already has a 2026-01-25 balance of 0 USD" in flat
    assert "refusing 7 USD. Beancount allows one balance per account, currency and day" in flat
    assert f"correct or delete the assertion at {tmp_path / 'main.bean'}:5 instead." in flat
    assert "--force" not in flat
    assert "Date the pad after" not in flat
    assert "Opening adjustment command" not in flat
    assert (tmp_path / "main.bean").read_text() == LEDGER
