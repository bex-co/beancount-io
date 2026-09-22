"""One bank row keeps one import-id across Unicode normalizations (w3/377).

Ledger text loads NFC-normalized while an export's rows arrive in whatever
form the bank wrote, so before this the same row hashed two ways: a re-import
of an accented export conflicted against the entry it had just written, and
the other normalization of it imported as a fresh transaction.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
NFC = unicodedata.normalize("NFC", "Café X")
NFD = unicodedata.normalize("NFD", "Café X")
assert NFC != NFD


def _books(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\n2020-01-01 open Assets:Checking USD\n2020-01-01 open Expenses:Food USD\n'
    )
    return file


def _export(tmp_path: Path, name: str, payee: str) -> Path:
    path = tmp_path / name
    path.write_text(f"Date,Payee,Amount\n2026-08-10,{payee},-28.40\n", encoding="utf-8")
    return path


def _rules(tmp_path: Path) -> Path:
    path = tmp_path / "rules.toml"
    path.write_text('[[rule]]\nmatch = "caf"\naccount = "Expenses:Food"\n')
    return path


def _import(file: Path, source: Path, tmp_path: Path, *apply: str) -> dict:
    result = runner.invoke(
        app,
        [
            "--json",
            "--file",
            str(file),
            "import",
            str(source),
            "--csv",
            "date=Date,amount=Amount,payee=Payee",
            "--account",
            "Assets:Checking",
            "--rules",
            str(_rules(tmp_path)),
            *apply,
        ],
    )
    assert result.exit_code == 0, result.output
    return json.loads(result.stdout)["data"]


def _only_row(data: dict) -> dict:
    assert len(data["rows"]) == 1, data["rows"]
    return data["rows"][0]


def _import_id(row: dict) -> str:
    found = re.search(r"csv:sha256:\w+", row["entry"])
    assert found, row["entry"]
    return found.group(0)


def test_normalizations_of_one_row_share_an_import_id(tmp_path: Path) -> None:
    nfd = _only_row(_import(_books(tmp_path), _export(tmp_path, "nfd.csv", NFD), tmp_path))
    nfc = _only_row(_import(_books(tmp_path), _export(tmp_path, "nfc.csv", NFC), tmp_path))

    assert _import_id(nfd) == _import_id(nfc)


def test_reimporting_an_accented_export_is_an_exact_duplicate(tmp_path: Path) -> None:
    file = _books(tmp_path)
    source = _export(tmp_path, "nfd.csv", NFD)
    _import(file, source, tmp_path, "--apply")

    row = _only_row(_import(file, source, tmp_path))

    # Previously "conflict": the written payee reloaded as NFC and no longer
    # matched the NFD row that produced it.
    assert row["status"] == "duplicate", row
    assert row["include"] is False


def test_the_other_normalization_does_not_import_again(tmp_path: Path) -> None:
    file = _books(tmp_path)
    _import(file, _export(tmp_path, "nfd.csv", NFD), tmp_path, "--apply")

    row = _only_row(_import(file, _export(tmp_path, "nfc.csv", NFC), tmp_path))

    assert row["status"] == "duplicate", row
    assert row["include"] is False


def test_an_ascii_id_is_the_documented_digest(tmp_path: Path) -> None:
    """The id is exactly what the published normalization says it is.

    This pinned a literal before, as the "ASCII ids are byte-identical across
    the NFC change" guarantee. w3/m45 changed the amount field — `-28.40`
    became `-28.4 USD` so that sub-cent amounts and commodities stay distinct
    — so the digest moved on purpose. Computing it from the documented base
    keeps the test saying what the format *is* rather than what it once
    hashed to; ledgers holding the older digest still dedupe, which
    `test_an_id_written_before_the_exact_amount_form_still_dedupes` covers.
    """
    import hashlib

    row = _only_row(_import(_books(tmp_path), _export(tmp_path, "ascii.csv", "Cafe X"), tmp_path))

    base = b"2026-08-10|-28.4 USD|CAFE X|Assets:Checking"
    assert _import_id(row) == "csv:sha256:" + hashlib.sha256(base).hexdigest()[:16]


def test_an_id_written_before_normalization_still_dedupes(tmp_path: Path) -> None:
    """A ledger carrying the pre-NFC digest must not re-import the same row."""
    file = _books(tmp_path)
    file.write_text(
        file.read_text()
        + f'2026-08-10 * "{NFD}" ""\n'
        + '  import-id: "csv:sha256:fafae216cb2748c5"\n'
        + "  Assets:Checking  -28.40 USD\n"
        + "  Expenses:Food     28.40 USD\n",
        encoding="utf-8",
    )

    row = _only_row(_import(file, _export(tmp_path, "nfd.csv", NFD), tmp_path))

    assert row["status"] == "duplicate", row
    assert "fafae216cb2748c5" in row["reason"]
