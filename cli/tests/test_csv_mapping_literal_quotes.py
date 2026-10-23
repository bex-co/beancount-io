"""A `--csv` mapping can name a column whose header holds a literal quote (w5/967).

`split_spec` toggled its quote state on every `"`, with no escape, so a header
ending in `"` was an "unclosed double quote" and the CSV-style doubled form
named a different column. Inside a quoted stretch two quotes in a row are now
one literal quote.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path

import pytest

from bea_engine import csv_mapper as engine
from cli import csv_mapper as frontend
from tests.test_import_source_facts import _bea

CSV = [
    "--csv",
    'date=Date,narration="Memo """,amount=Amount',
    "--delimiter",
    ",",
    "--account",
    "Assets:Cash",
    "--default-account",
    "Expenses:Food",
]


@pytest.mark.parametrize("module", [frontend, engine], ids=["frontend", "engine"])
def test_a_doubled_quote_inside_quotes_is_one_literal_quote(module: object) -> None:
    parts = module.split_spec('date=Date,narration="Memo """,amount=Amount')  # type: ignore[attr-defined]

    assert parts == ["date=Date", 'narration="Memo """', "amount=Amount"]
    assert module.spec_value('"Memo """') == 'Memo "'  # type: ignore[attr-defined]
    assert module.spec_value('"Memo, details"') == "Memo, details"  # type: ignore[attr-defined]
    assert module.spec_value('"Memo ""label, note"", details"') == 'Memo "label, note", details'  # type: ignore[attr-defined]


@pytest.mark.parametrize("module", [frontend, engine], ids=["frontend", "engine"])
def test_ordinary_specs_and_an_unclosed_quote_behave_as_before(module: object) -> None:
    assert module.split_spec('amount="Amount (USD, net)",date=Date') == [  # type: ignore[attr-defined]
        'amount="Amount (USD, net)"',
        "date=Date",
    ]
    assert module.split_spec('narration=Memo "label"') == ['narration=Memo "label"']  # type: ignore[attr-defined]
    with pytest.raises(Exception, match="unclosed double quote"):
        module.split_spec('narration=Memo "')  # type: ignore[attr-defined]


def test_a_header_with_a_quote_is_rendered_so_it_reads_back() -> None:
    for header in ['Memo "', 'Memo "label, note", details', "Memo, details", "Memo"]:
        assert frontend.spec_value(frontend._spec_column(header)) == header


def test_a_quoted_header_imports_and_deduplicates(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'
    )
    with (tmp_path / "bank.csv").open("w", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(["Date", 'Memo "', "Amount"])
        writer.writerow(["2024-01-02", "Lunch", "-4.50"])

    preview = _bea(tmp_path, "import", "bank.csv", *CSV)
    applied = _bea(tmp_path, "import", "bank.csv", *CSV, "--apply")
    repeat = _bea(tmp_path, "import", "bank.csv", *CSV, "--apply")

    assert preview.returncode == 0, preview.stderr
    assert [row["narration"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["Lunch"]
    assert json.loads(applied.stdout)["data"]["written"] == 1
    assert json.loads(repeat.stdout)["data"]["written"] == 0
