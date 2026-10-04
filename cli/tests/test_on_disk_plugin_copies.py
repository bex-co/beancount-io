"""Plugin copies of a written entry are not on disk (w1/113).

The bundled forecast and amortize plugins clone a written transaction to
other dates with `_replace`, so every copy keeps the template's filename and
line, and that line does start a transaction. `--on-disk` counted each copy
as written, disagreeing with `grep`. Only the copy dated as the line declares
is the written one.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORECAST = """plugin "fava.plugins.forecast"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Rent USD
2024-01-05 # "Landlord" "Rent [MONTHLY REPEAT 3 TIMES]"
  Expenses:Rent  100 USD
  Assets:Cash
2024-01-07 * "Shop" "real one"
  Expenses:Rent  1 USD
  Assets:Cash
"""

AMORTIZE = """plugin "fava.plugins.amortize_over"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Insurance USD
2024/1/5 * "Insurer" "Yearly policy"
  amortize_months: 3
  Expenses:Insurance  300 USD
  Assets:Cash  -300 USD
"""


def _rows(tmp_path: Path, text: str, *extra: str) -> list[dict]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text, encoding="utf-8")
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    done = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--json",
            "--file",
            str(ledger),
            "list",
            "transaction",
            "--sort",
            "oldest",
            *extra,
        ],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert done.returncode == 0, done.stderr
    return list(json.loads(done.stdout)["data"])


def test_forecast_copies_are_generated_and_off_disk(tmp_path: Path) -> None:
    rows = _rows(tmp_path, FORECAST)
    assert [(row["date"], bool(row.get("generated"))) for row in rows] == [
        ("2024-01-05", False),
        ("2024-01-07", False),
        ("2024-02-05", True),
        ("2024-03-05", True),
    ]

    on_disk = _rows(tmp_path, FORECAST, "--on-disk")
    assert [row["date"] for row in on_disk] == ["2024-01-05", "2024-01-07"]


def test_amortize_copies_are_generated_and_off_disk(tmp_path: Path) -> None:
    on_disk = _rows(tmp_path, AMORTIZE, "--on-disk")
    assert [row["date"] for row in on_disk] == ["2024-01-05"]
    assert len(_rows(tmp_path, AMORTIZE)) == 3


def test_a_plugin_free_ledger_is_unchanged(tmp_path: Path) -> None:
    plain = FORECAST.replace('plugin "fava.plugins.forecast"\n', "").replace(" # ", " * ")
    rows = _rows(tmp_path, plain, "--on-disk")
    assert [row["date"] for row in rows] == ["2024-01-05", "2024-01-07"]
