"""Exact omit-pad wording of every `add balance` duplicate/assertion-alone answer.

`_balance` builds the same "omitted the pad from --pad-from" sentences and the
same duplicate payload in several branches; these tests pin each sentence and
shape byte-for-byte so the branches can share one builder without any wording
drifting unnoticed.
"""

import json
from pathlib import Path

from click.testing import Result
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
OPENS = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n'


def _add(root: Path, *extra: str) -> Result:
    return runner.invoke(app, ["--json", "--file", str(root), "add", "balance", *extra])


def test_duplicate_with_matching_book_omits_pad_with_recorded_location(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS + "2026-01-25 balance Assets:Cash 0.00 USD\n")

    result = _add(
        root,
        "--date",
        "2026-01-25",
        "-a",
        "Assets:Cash",
        "--amount",
        "0.00 USD",
        "--pad-from",
        "Equity:Opening",
    )

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 0
    assert data["duplicate"] is True
    assert data["pad"] is None
    assert data["source"] == {"filename": str(root), "lineno": 4}
    assert data["target"] == str(root)
    assert "ledger_errors" not in data
    assert data["warnings"] == [
        f"Book balance already matches 0.00 USD; omitted the pad from --pad-from "
        f"(assertion already recorded at {root}:4)."
    ]
    assert root.read_text() == OPENS + "2026-01-25 balance Assets:Cash 0.00 USD\n"


def test_duplicate_without_pad_from_carries_ledger_errors(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS + "2026-01-25 balance Assets:Cash 0.00 USD\n")

    result = _add(root, "--date", "2026-01-25", "-a", "Assets:Cash", "--amount", "0.00 USD")

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 0
    assert data["duplicate"] is True
    assert data["warnings"] == []
    assert data["ledger_errors"] == []


def test_matching_book_writes_assertion_alone_with_exact_wording(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Bank:Checking USD\n"
        "2024-01-01 open Equity:Opening-Balances USD\n"
        '2024-01-01 * "seed"\n'
        "  Assets:Bank:Checking  3357.83 USD\n"
        "  Equity:Opening-Balances\n"
    )

    result = _add(
        root,
        "--date",
        "2024-03-10",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "3357.83 USD",
        "--pad-from",
        "Equity:Opening-Balances",
    )

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 1
    assert data["pad"] is None
    assert data["warnings"] == [
        "Book balance already matches 3357.83 USD; omitted the pad from --pad-from and wrote the assertion alone."
    ]
    text = root.read_text()
    assert "2024-03-10 balance Assets:Bank:Checking" in text
    assert "pad Assets:Bank:Checking" not in text


def test_existing_pad_fill_writes_assertion_alone_with_exact_wording(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Bank:Checking USD,EUR\n"
        "2026-01-01 open Equity:Opening\n"
        "2026-01-01 open Equity:Other\n"
        "2026-01-01 open Income:Salary\n"
        '2026-01-05 * "Pay"\n'
        "  Assets:Bank:Checking  1000.00 USD\n"
        "  Income:Salary\n"
        '2026-01-10 * "Euro"\n'
        "  Assets:Bank:Checking  50 EUR\n"
        "  Equity:Opening\n"
        "2026-02-28 pad Assets:Bank:Checking Equity:Opening\n"
        "2026-03-01 balance Assets:Bank:Checking  2000 USD\n"
    )

    result = _add(
        root,
        "--date",
        "2026-03-01",
        "--account",
        "Assets:Bank:Checking",
        "--amount",
        "200 EUR",
        "--pad-from",
        "Equity:Opening",
    )

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 1
    assert data["warnings"] == [
        f"The existing pad at {root}:12 (2026-02-28 from Equity:Opening) fills this assertion, "
        f"inserting 150 EUR; omitted the pad from --pad-from and wrote the assertion alone."
    ]
