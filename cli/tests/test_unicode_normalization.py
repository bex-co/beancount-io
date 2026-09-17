"""NFC and NFD spellings of one name resolve, match, and write as one (w3/275, w3/278)."""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
NFC = unicodedata.normalize("NFC", "Café")
NFD = unicodedata.normalize("NFD", "Café")
assert NFC != NFD


def _books(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\ninclude "sub.bean"\n'
        "2020-01-01 open Assets:Cash USD\n"
        f"2020-01-01 open Expenses:{NFC} USD\n"
        f'2026-01-01 * "Lunch" "{NFD} break"\n'
        f"  Expenses:{NFC} 10.00 USD\n"
        "  Assets:Cash\n"
    )
    (tmp_path / "sub.bean").write_text(f'2026-02-01 * "More"\n  Expenses:{NFD} 5.00 USD\n  Assets:Cash\n')
    return file


def test_mixed_normalization_account_resolves_to_one(tmp_path: Path) -> None:
    file = _books(tmp_path)

    assert runner.invoke(app, ["--file", str(file), "check"]).exit_code == 0
    assert runner.invoke(app, ["--json", "--file", str(file), "check"]).exit_code == 0

    result = runner.invoke(app, ["--json", "--file", str(file), "balance", f"Expenses:{NFC}"])

    assert result.exit_code == 0, result.output
    # Neither leg is 15.00 alone: the total proves the two spellings merged.
    assert '"15.00"' in result.stdout
    assert "unknown account" not in result.output.lower()


def test_search_matches_across_normalizations(tmp_path: Path) -> None:
    file = _books(tmp_path)

    for term in (NFC, NFD):
        result = runner.invoke(app, ["--json", "--file", str(file), "list", "transaction", "--search", term])

        assert result.exit_code == 0, result.output
        assert len(json.loads(result.stdout)["data"]) == 1, term


def test_bql_regex_matches_across_normalizations(tmp_path: Path) -> None:
    file = _books(tmp_path)

    for literal in (NFC, NFD):
        result = runner.invoke(
            app, ["--json", "--file", str(file), "query", f"SELECT narration WHERE narration ~ '{literal}'"]
        )

        assert result.exit_code == 0, result.output
        rows = json.loads(result.stdout)["data"]["rows"]
        assert [row[0] for row in rows] == [f"{NFC} break"] * len(rows) and rows, literal


def test_add_writes_nfc_and_leaves_other_bytes_alone(tmp_path: Path) -> None:
    file = _books(tmp_path)
    sub_before = (tmp_path / "sub.bean").read_bytes()

    result = runner.invoke(
        app,
        [
            "--file",
            str(file),
            "add",
            "transaction",
            "--date",
            "2026-03-01",
            "--narration",
            "Tea",
            "-p",
            f"Expenses:{NFD} 2 USD",
            "-p",
            "Assets:Cash",
        ],
    )
    opened = runner.invoke(
        app, ["--file", str(file), "add", "open", "--date", "2020-01-01", "-a", f"Income:{NFD}", "-c", "USD"]
    )

    assert result.exit_code == 0, result.output
    assert opened.exit_code == 0, opened.output
    appended = file.read_text().split("2026-03-01")[1]
    assert unicodedata.is_normalized("NFC", appended)
    assert NFD.encode("utf-8") not in appended.encode("utf-8")
    assert (tmp_path / "sub.bean").read_bytes() == sub_before
    assert runner.invoke(app, ["--file", str(file), "check"]).exit_code == 0


def test_amounts_dates_and_metadata_survive_normalization(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(
        'option "operating_currency" "USD"\n'
        "2020-01-01 open Assets:Cash USD\n"
        f"2020-01-01 open Expenses:{NFD} USD\n"
        f'2026-01-01 * "Lunch"\n  receipt: "qr-123"\n  Expenses:{NFD} 10.00 USD\n  Assets:Cash\n'
    )

    result = runner.invoke(app, ["--json", "--file", str(file), "list", "transaction"])

    assert result.exit_code == 0, result.output
    (txn,) = json.loads(result.stdout)["data"]
    assert txn["date"] == "2026-01-01"
    assert txn["postings"][0]["units"] == {"number": "10.00", "currency": "USD"}
    assert txn["meta"] == {"receipt": "qr-123"}
