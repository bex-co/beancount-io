"""A second `commodity` names the declaration to edit, and the metadata it would add (w1/286)."""

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
ROOT = 'option "operating_currency" "USD"\ninclude "accounts.bean"\n2026-01-01 commodity USD\n'
ACCOUNTS = "2026-01-01 open Assets:Cash USD\n"
REMEDY = "(bea add commodity cannot change an existing commodity)"


def _add_commodity(root: Path, date: str, *extra: str, json_output: bool) -> str:
    before = {path: path.read_bytes() for path in root.parent.glob("*.bean")}
    result = runner.invoke(
        app,
        [
            *(["--json"] if json_output else []),
            "--file",
            str(root),
            "add",
            "commodity",
            "--date",
            date,
            "-c",
            "USD",
            *extra,
        ],
    )
    assert result.exit_code == 1, result.output
    assert {path: path.read_bytes() for path in root.parent.glob("*.bean")} == before
    diagnostic = json.dumps(json.loads(result.stderr)["error"]) if json_output else result.output
    return " ".join(diagnostic.split()).replace('\\"', '"')


@pytest.fixture
def root(tmp_path: Path) -> Path:
    (tmp_path / "accounts.bean").write_text(ACCOUNTS)
    ledger = tmp_path / "main.bean"
    ledger.write_text(ROOT)
    return ledger


# Beancount blames the later-dated declaration: the proposed one, or the existing one.
@pytest.mark.parametrize("date", ["2025-12-01", "2026-02-01"])
@pytest.mark.parametrize("json_output", [False, True])
def test_metadata_goes_on_the_existing_declaration(root: Path, date: str, json_output: bool) -> None:
    text = _add_commodity(root, date, "--meta", "name:US Dollar", "--meta", "precision:2", json_output=json_output)

    assert "Duplicate commodity directives for 'USD'" in text
    assert (
        f'USD is already declared at {root}:3; a commodity is declared once. To add name: "US Dollar", '
        f"precision: 2, edit that directive's metadata {REMEDY}." in text
    )
    assert ".bea-" not in text


@pytest.mark.parametrize("date", ["2025-12-01", "2026-02-01"])
@pytest.mark.parametrize("json_output", [False, True])
def test_without_metadata_only_the_location_is_named(root: Path, date: str, json_output: bool) -> None:
    text = _add_commodity(root, date, json_output=json_output)

    assert f"USD is already declared at {root}:3; a commodity is declared once." in text
    assert REMEDY not in text


@pytest.mark.parametrize("json_output", [False, True])
def test_a_changed_value_is_set_and_an_unchanged_one_is_not_repeated(tmp_path: Path, json_output: bool) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text('2026-01-01 commodity USD\n  name: "Dollar"\n')

    changed = _add_commodity(ledger, "2026-02-01", "--meta", "name:US Dollar", json_output=json_output)
    assert f'To set name: "US Dollar", edit that directive\'s metadata {REMEDY}.' in changed

    same = _add_commodity(ledger, "2026-02-01", "--meta", "name:Dollar", json_output=json_output)
    assert f"USD is already declared at {ledger}:1; a commodity is declared once." in same
    assert REMEDY not in same


def test_a_declaration_in_an_included_file_is_located_there(tmp_path: Path) -> None:
    (tmp_path / "commodities.bean").write_text("2026-01-01 commodity USD\n")
    ledger = tmp_path / "main.bean"
    ledger.write_text('include "commodities.bean"\n')

    text = _add_commodity(ledger, "2026-02-01", "--meta", "name:US Dollar", json_output=False)

    assert f"USD is already declared at {tmp_path / 'commodities.bean'}:1;" in text
