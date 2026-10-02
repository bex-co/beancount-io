"""Directive query exports must reload with their original values (w3/457)."""

from __future__ import annotations

import io
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from beancount import loader
from beancount.core.data import Custom, Transaction
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

NUMBERS = """2024-01-01 open Assets:Cash USD
2024-02-01 custom "negative-middle" 5 (-2) 7
2024-02-02 custom "negative-first" (-2) 5
2024-02-03 custom "negative-last" 5 (-2)
2024-02-04 custom "amount-last" 5 (-2.50) USD
2024-02-05 custom "amount-first" (-2.50) USD 5
2024-02-06 custom "tiny-values" 0.00000001 (-0.00000002) 0.00000003 USD
  precision: 0.00000004
2024-03-01 query "export" "PRINT"
"""

STRINGS = r"""2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-02-01 custom "multiline" "first line
    Assets:Fake 12 USD
last<TAB>line"
  description: "custom metadata \"quoted\" C:\\books
second line"
2024-02-02 * "Cafe \"North\"" "first line
second \"quoted\" line C:\\books<TAB>end"
  receipt: "receipt \"123\"
second line"
  Assets:Cash  -2 USD
    description: "posting \"note\"
continued"
  Expenses:Food  2 USD
""".replace("<TAB>", "\t")


def _semantic_entries(text: str) -> list[Any]:
    entries, errors, _options = loader.load_string(text)
    assert not errors, f"Export did not reload: {errors}\n{text}"

    def metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
        return {
            key: value
            for key, value in (meta or {}).items()
            if key not in {"filename", "lineno"} and not key.startswith("__")
        }

    result = []
    for entry in entries:
        entry = entry._replace(meta=metadata(entry.meta))
        if isinstance(entry, Transaction):
            entry = entry._replace(postings=[p._replace(meta=metadata(p.meta)) for p in entry.postings])
        result.append(entry)
    return result


@pytest.fixture
def numeric_ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "numbers.bean"
    ledger.write_text(NUMBERS, encoding="utf-8")
    custom = [entry for entry in _semantic_entries(NUMBERS) if isinstance(entry, Custom)]
    assert len(custom) == 6
    assert [value.value for value in custom[0].values] == [Decimal("5"), Decimal("-2"), Decimal("7")]
    return ledger


@pytest.mark.parametrize(
    ("statement", "format_args", "to_file"),
    [
        ("PRINT", [], False),
        ("PRINT", ["-f", "beancount"], False),
        (".run export", ["-f", "beancount"], False),
        ("PRINT", ["-f", "beancount"], True),
    ],
    ids=["print-default", "print-beancount", "stored-query", "output-file"],
)
def test_cli_directive_exports_preserve_custom_value_types_and_numbers(
    numeric_ledger: Path, statement: str, format_args: list[str], to_file: bool
) -> None:
    before = numeric_ledger.read_bytes()
    destination = numeric_ledger.with_name("export.bean")
    output_args = ["--output", str(destination)] if to_file else []

    result = runner.invoke(app, ["--file", str(numeric_ledger), "query", *format_args, *output_args, statement])

    assert result.exit_code == 0, result.output
    assert numeric_ledger.read_bytes() == before
    if to_file:
        assert result.stdout == ""
        exported = destination.read_text(encoding="utf-8")
    else:
        exported = result.stdout
    assert _semantic_entries(exported) == _semantic_entries(NUMBERS)


def test_select_entry_keeps_small_transaction_and_posting_metadata(tmp_path: Path) -> None:
    opens = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
    transaction = """2024-02-01 * "Lunch"
  precision: 0.00000001
  Assets:Cash  -2 USD
    adjustment: -0.00000002
  Expenses:Food  2 USD
"""
    ledger = tmp_path / "transaction.bean"
    ledger.write_text(opens + transaction, encoding="utf-8")
    before = ledger.read_bytes()
    expected = _semantic_entries(opens + transaction)

    result = runner.invoke(app, ["--file", str(ledger), "query", "SELECT entry LIMIT 1", "-f", "beancount"])

    assert result.exit_code == 0, result.output
    assert ledger.read_bytes() == before
    assert _semantic_entries(opens + result.stdout) == expected


def test_interactive_shared_shell_preserves_values_and_does_not_mutate_its_entries(numeric_ledger: Path) -> None:
    from bea_engine.query import build_shell

    stream = io.StringIO()
    shell = build_shell(numeric_ledger, stream, interactive=True, show_errors=False)
    before = numeric_ledger.read_bytes()
    source_entries = repr(shell.context.tables["entries"].entries)

    shell.onecmd(".format beancount")
    shell.onecmd("PRINT")

    assert numeric_ledger.read_bytes() == before
    assert repr(shell.context.tables["entries"].entries) == source_entries
    assert _semantic_entries(stream.getvalue()) == _semantic_entries(NUMBERS)


def test_print_keeps_loaded_multiline_strings_escapes_and_metadata(tmp_path: Path) -> None:
    ledger = tmp_path / "strings.bean"
    ledger.write_text(STRINGS, encoding="utf-8")
    before = ledger.read_bytes()
    source = _semantic_entries(STRINGS)

    result = runner.invoke(app, ["--file", str(ledger), "query", "PRINT"])

    assert result.exit_code == 0, result.output
    assert ledger.read_bytes() == before
    assert _semantic_entries(result.stdout) == source
