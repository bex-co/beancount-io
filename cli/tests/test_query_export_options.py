"""A Beancount export carries the options its validity rests on (w5/474).

The export printed result directives only, so renamed roots re-checked as
invalid account names and a transaction balanced by a tolerance option as
unbalanced, though USAGE says the export of a valid ledger passes `bea check`.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
RENAMED = """option "name_assets" "Activos"
option "name_equity" "Patrimonio"
option "operating_currency" "EUR"
2026-01-01 open Activos:Banco EUR
2026-01-01 open Patrimonio:Apertura EUR
2026-01-02 * "Apertura"
  Activos:Banco  100.00 EUR
  Patrimonio:Apertura
"""
TOLERANT = """option "inferred_tolerance_default" "USD:0.05"
option "tolerance_multiplier" "0.6"
option "booking_method" "FIFO"
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch"
  Assets:Cash  -10.00 USD
  Expenses:Food  9.98 USD
"""
PLAIN = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash  5.00 USD
  Equity:Opening
"""
RAW = """option "operating_currency" "USD"
option "plugin_processing_mode" "raw"
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening
2026-01-02 * "funding"
  Assets:Cash  1000.00 USD
  Equity:Opening
2026-01-03 balance Assets:Cash 999.00 USD
"""


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
        [sys.executable, "-m", "cli.main", *args],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


@pytest.mark.parametrize(
    ("ledger", "options"),
    [
        (RENAMED, ['option "name_assets" "Activos"', 'option "name_equity" "Patrimonio"']),
        (
            TOLERANT,
            [
                'option "booking_method" "FIFO"',
                'option "tolerance_multiplier" "0.6"',
                'option "inferred_tolerance_default" "USD:0.05"',
            ],
        ),
        (RAW, ['option "plugin_processing_mode" "raw"']),
    ],
    ids=["renamed-roots", "tolerance", "raw-mode"],
)
def test_the_export_of_a_valid_ledger_rechecks(tmp_path: Path, ledger: str, options: list[str]) -> None:
    (tmp_path / "main.bean").write_text(ledger)
    assert _bea(tmp_path, "-f", "main.bean", "check").returncode == 0

    exported = _bea(tmp_path, "-f", "main.bean", "query", "-o", "export.bean", "PRINT")
    assert exported.returncode == 0, exported.stderr

    text = (tmp_path / "export.bean").read_text()
    assert text.splitlines()[: len(options) + 1] == [*options, ""]
    recheck = _bea(tmp_path, "-f", "export.bean", "check")
    assert recheck.returncode == 0, recheck.stdout + recheck.stderr


def test_a_ledger_on_the_defaults_exports_no_options(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(PLAIN)

    result = _bea(tmp_path, "-f", "main.bean", "query", "-f", "beancount", "PRINT")

    assert result.returncode == 0, result.stderr
    assert "option" not in result.stdout
    assert result.stdout.startswith("2026-01-01 open Assets:Cash")


PRECISE = """option "operating_currency" "USD"
option "use_precise_interpolation" "TRUE"
option "infer_tolerance_from_cost" "TRUE"
2023-01-01 open Assets:Cash USD
2023-01-01 open Assets:Source HOOL
2023-01-01 open Assets:Fine HOOL
2023-01-01 open Assets:Destination HOOL
2023-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Acquire"
  Assets:Source 2.00 HOOL {10 USD}
  Assets:Fine 0.010 HOOL {10 USD}
  Assets:Cash -20.10 USD
2024-02-01 * "Transfer"
  Assets:Source -1.00 HOOL {10 USD, 2024-01-02}
  Assets:Fine -0.001 HOOL {10 USD, 2024-01-02}
  Assets:Destination HOOL {10 USD}
2024-02-02 balance Assets:Destination 1.001 ~ 0 HOOL
"""


def test_precise_interpolation_survives_the_export(tmp_path: Path) -> None:
    """Without the option, the reload recomputed the inferred transfer as 1.00 HOOL (w5/1090)."""
    source = tmp_path / "main.bean"
    source.write_text(PRECISE)
    export = tmp_path / "export.bean"

    assert _bea(tmp_path, "-f", str(source), "check").returncode == 0
    exported = _bea(tmp_path, "-f", str(source), "query", "PRINT", "-f", "beancount", "-o", str(export))

    assert exported.returncode == 0, exported.stderr
    assert 'option "use_precise_interpolation" "TRUE"' in export.read_text()
    assert _bea(tmp_path, "-f", str(export), "check").returncode == 0
