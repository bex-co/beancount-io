"""A quoted CSV reference reaches the update locator exactly as written (w5/1037).

The mapping was split into physical lines before CSV parsing, so a quoted
`statement\\n2026` lost its line break, and cells were trimmed, so
` statement2026` lost its space: each selected the different
`statement2026` transaction and categorized a 20 USD taxi instead of the
10 USD coffee.
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


def _ledger(tmp_path: Path, identity: str) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food USD\n"
        "2026-01-01 open Expenses:Uncategorized USD\n"
        f'2026-01-02 ! "Coffee"\n  ref: {json.dumps(identity)}\n'
        "  Expenses:Uncategorized 10.00 USD\n  Assets:Cash -10.00 USD\n"
        '2026-01-03 ! "Taxi"\n  ref: "statement2026"\n'
        "  Expenses:Uncategorized 20.00 USD\n  Assets:Cash -20.00 USD\n"
    )
    return ledger


def _mapping(identity: str) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n", quoting=csv.QUOTE_ALL)
    writer.writerows([["id", "account", "flag"], [identity, "Expenses:Food", "*"]])
    return out.getvalue()


@pytest.mark.parametrize(
    "identity",
    ["statement\n2026", " statement2026", "statement2026 ", "statement2026\n"],
    ids=["inner-lf", "leading-space", "trailing-space", "trailing-lf"],
)
@pytest.mark.parametrize("stdin", [False, True], ids=["file", "stdin"])
def test_the_exact_reference_selects_its_own_transaction(tmp_path: Path, identity: str, stdin: bool) -> None:
    ledger = _ledger(tmp_path, identity)
    mapping = tmp_path / "map.csv"
    mapping.write_text(_mapping(identity))
    source = ["--from", "-"] if stdin else ["--from", str(mapping)]

    result = runner.invoke(
        app,
        ["--file", str(ledger), "update", "transactions", *source, "--apply"],
        input=mapping.read_text() if stdin else None,
    )

    assert result.exit_code == 0, result.output
    text = ledger.read_text()
    assert "Expenses:Food 10.00 USD" in text
    assert "Expenses:Uncategorized 20.00 USD" in text
