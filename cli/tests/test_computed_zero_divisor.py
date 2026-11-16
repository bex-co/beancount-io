"""A parenthesised or computed zero divisor in an `add` amount is refused, not an engine crash (w1/274).

Both guards matched only a slash followed directly by an all-zero number, so
`100/(0)` and `100/(2-2)` reached Beancount's parser inside the engine, which
segfaulted: exit 4 "outcome unknown", and `add transactions --partial` wrote
none of the valid rows. One amount's arithmetic is now evaluated exactly.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.amounts import refuse_zero_divisor
from cli.amounts import check_decimal_notation
from cli.errors import UsageError

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Bank USD
2026-01-01 open Assets:Brokerage
2026-01-01 open Expenses:Food USD
"""

ZERO = ["100/(0)", "100/(2-2)", "0*5/(0)", "1/(1/(0))", "1/-(3-3)", "2/((1+1)*0)", "1/(1,000-1,000)"]
SHAPES = ["{} USD", "1 HOOL {{{} USD}}", "1 HOOL {{{{{} USD}}}}", "1 HOOL {{100 USD}} @ {} USD", "1 USD @@ {} USD"]


@pytest.mark.parametrize("shape", SHAPES)
@pytest.mark.parametrize("expression", ZERO)
def test_a_computed_zero_divisor_is_refused_in_units_cost_and_price(expression: str, shape: str) -> None:
    text = shape.format(expression)
    with pytest.raises(UsageError, match="Division by zero"):
        check_decimal_notation(f"Assets:Brokerage {text}")
    with pytest.raises(ValueError, match="Division by zero"):
        refuse_zero_divisor(text)


@pytest.mark.parametrize(
    "text",
    [
        "100/0.5 USD",
        "100/10 USD",
        "100/(2-1) USD",
        "(2-2)/5 USD",
        "0*5 USD",
        "100/(0.5) USD",
        "1 /0J {100/(2) USD}",
        '1 HOOL {100 USD, "a/(0)"}',
        "1/(1/3*3-1) USD",
    ],
)
def test_a_nonzero_divisor_still_passes(text: str) -> None:
    check_decimal_notation(f"Assets:Brokerage {text}")
    refuse_zero_divisor(text)


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
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
        [sys.executable, "-m", "cli.main", "--file", str(tmp_path / "main.bean"), *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.mark.parametrize(
    "args",
    [
        ("-p", "Expenses:Food 100/(2-2) USD", "-p", "Assets:Bank"),
        ("-p", "Expenses:Food 1 USD @ 1/(0) USD", "-p", "Assets:Bank"),
    ],
)
def test_add_transaction_refuses_as_usage_and_writes_nothing(tmp_path: Path, args: tuple[str, ...]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    result = _bea(tmp_path, "add", "transaction", "z", "--date", "2026-03-08", *args)
    assert result.returncode == 2, result.stderr
    assert "Division by zero" in result.stderr
    assert "killed by" not in result.stderr
    assert ledger.read_text(encoding="utf-8") == LEDGER


def test_add_balance_refuses_as_usage(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    result = _bea(tmp_path, "add", "balance", "--date", "2026-03-08", "-a", "Assets:Bank", "--amount", "1/(0) USD")
    assert result.returncode == 2, result.stderr
    assert "Division by zero" in result.stderr
    assert ledger.read_text(encoding="utf-8") == LEDGER


def test_partial_batch_writes_the_valid_row_and_names_the_rejected_one(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    rows = [
        {
            "date": "2026-03-09",
            "narration": "ok",
            "postings": [{"account": "Expenses:Food", "amount": "5 USD"}, {"account": "Assets:Bank"}],
        },
        {
            "date": "2026-03-09",
            "narration": "bad",
            "postings": [{"account": "Expenses:Food", "amount": "100/(0) USD"}, {"account": "Assets:Bank"}],
        },
    ]
    batch = tmp_path / "rows.json"
    batch.write_text(json.dumps(rows), encoding="utf-8")

    result = _bea(tmp_path, "--json", "add", "transactions", "--partial", "--from", str(batch))

    assert result.returncode == 1, result.stderr or result.stdout
    error = json.loads(result.stderr)["error"]
    assert error["result"] == {"written": 1, "written_rows": [0], "rejected_rows": [1]}
    assert any("Row 2, postings.0" in detail and "Division by zero" in detail for detail in error["details"])
    text = ledger.read_text(encoding="utf-8")
    assert '"ok"' in text and '"bad"' not in text
    assert _bea(tmp_path, "check").returncode == 0
