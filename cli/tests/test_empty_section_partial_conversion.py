"""Empty report sections under partial conversion print — not 0.00 GBP (w3/313)."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Equity:Opening USD
2020-01-01 open Income:Salary USD
2020-01-02 * "seed"
  Assets:Cash 100 USD
  Equity:Opening -100 USD
2020-02-01 * "pay"
  Assets:Cash 50 USD
  Income:Salary -50 USD
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
        timeout=30,
    )


def test_empty_section_under_partial_conversion_is_not_labeled_gbp(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    human = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "report",
        "trial-balance",
        "-x",
        "GBP",
        "--allow-errors",
    )
    assert human.returncode == 0, human.stderr or human.stdout
    assert "0.00 GBP" not in human.stdout
    assert "Liabilities" in human.stdout
