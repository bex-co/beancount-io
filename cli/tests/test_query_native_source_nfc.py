"""A native Beancount source's commands are NFC-normalized like its loaded text (w5/944).

bea loads ledger text NFC-normalized, so a ledger spelling `Café` with a
combining accent answered to the composed `Café` only: the decomposed literal
copied from the file matched no row at exit 0 and the stored query of that name
was "not found" on `--source beancount:`, while `--file` already normalized its
input. A CSV source is raw text and keeps matching exactly as written.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_treeify_unicode_accounts import _bea

NFD = "Café"
NFC = "Café"
FOOD = "SELECT account,number WHERE account='Expenses:Food' AND narration='{}'"


def _ledger(tmp_path: Path, spelling: str) -> str:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n'
        "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
        f'2024-01-02 * "{spelling}"\n  Assets:Cash -10.00 USD\n  Expenses:Food 10.00 USD\n'
        f'2024-02-01 query "{spelling}" "SELECT number WHERE account=\'Expenses:Food\'"\n',
        encoding="utf-8",
    )
    return f"beancount:{tmp_path / 'main.bean'}"


@pytest.mark.parametrize("source_spelling", [NFD, NFC], ids=["nfd-ledger", "nfc-ledger"])
@pytest.mark.parametrize("input_spelling", [NFD, NFC], ids=["nfd-input", "nfc-input"])
def test_a_literal_matches_whatever_spelling_it_is_typed_in(
    tmp_path: Path, source_spelling: str, input_spelling: str
) -> None:
    source = _ledger(tmp_path, source_spelling)

    done = _bea(tmp_path, "query", FOOD.format(input_spelling), "--source", source, "--format", "csv")

    assert done.returncode == 0, done.stderr
    assert "Expenses:Food,10.00" in done.stdout


@pytest.mark.parametrize("source_spelling", [NFD, NFC], ids=["nfd-ledger", "nfc-ledger"])
@pytest.mark.parametrize("input_spelling", [NFD, NFC], ids=["nfd-input", "nfc-input"])
def test_a_stored_query_is_found_by_either_spelling(tmp_path: Path, source_spelling: str, input_spelling: str) -> None:
    source = _ledger(tmp_path, source_spelling)

    done = _bea(tmp_path, "query", f".run {input_spelling}", "--source", source, "--format", "csv")

    assert done.returncode == 0, done.stderr
    assert "10.00" in done.stdout


def test_a_name_the_ledger_never_stored_is_still_a_usage_error(tmp_path: Path) -> None:
    source = _ledger(tmp_path, NFD)

    done = _bea(tmp_path, "query", ".run Missinǵ", "--source", source, "--format", "csv")

    assert done.returncode == 2, done.stdout + done.stderr


def test_a_csv_source_keeps_matching_exactly_as_written(tmp_path: Path) -> None:
    (tmp_path / "t.csv").write_text(f"name,amount\n{NFD},10\n", encoding="utf-8")
    source = f"csv:{tmp_path / 't.csv'}"

    exact = _bea(tmp_path, "query", f"SELECT name FROM t WHERE name='{NFD}'", "--source", source, "--format", "csv")
    other = _bea(tmp_path, "query", f"SELECT name FROM t WHERE name='{NFC}'", "--source", source, "--format", "csv")

    assert exact.returncode == 0 and NFD in exact.stdout, exact.stderr
    assert other.returncode == 0 and NFD not in other.stdout and NFC not in other.stdout, other.stderr
