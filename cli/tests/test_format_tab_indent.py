"""format -i normalizes tab postings to two-space indent (w3/267)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


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
        timeout=30,
    )


def test_tab_postings_become_two_spaces(tmp_path: Path) -> None:
    ledger = tmp_path / "tabs.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Cash USD\n"
        "2020-01-01 open Expenses:Food USD\n"
        "\n"
        '2020-02-01 * "x"\n'
        "\tAssets:Cash -1 USD\n"
        "\tExpenses:Food\n"
    )
    result = _bea(tmp_path, "format", "-i", str(ledger))
    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert "  Assets:Cash" in text
    assert "  Expenses:Food" in text
    assert "\tAssets:Cash" not in text
    assert not any(line.startswith(" Assets:") for line in text.splitlines())

    check = _bea(tmp_path, "format", "--check", str(ledger))
    assert check.returncode == 0, check.stderr
