"""A `--rules` entry may attribute the rows it matches (w2/m55/t003).

The suite's client/project keys (docs/adrs/ADR025-skills-business-books.md)
ride on a rule as optional `client` and `project` strings. A matched row
carries them as transaction metadata in the preview and the written entry;
an unmatched row carries none. Anything else a rule names is still refused.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
HEADER = "Date,Payee,Narration,Amount\n"
ROWS = "2026-08-02,Acme Hosting,Server,-40.00\n2026-08-03,Corner Cafe,Coffee,-5.25\n"
MAPPING = "date=Date,amount=Amount,payee=Payee,narration=Narration"


@pytest.fixture
def book(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setenv("BEA_CONFIG_DIR", str(tmp_path / "cfg"))
    result = runner.invoke(app, ["--json", "init", str(tmp_path), "--currency", "USD", "--date", "2026-08-01"])
    assert result.exit_code == 0, result.output
    opened = runner.invoke(
        app,
        [
            "--json",
            "--file",
            str(tmp_path / "main.bean"),
            "add",
            "open",
            "--date",
            "2026-08-01",
            "--account",
            "Expenses:Hosting",
        ],
    )
    assert opened.exit_code == 0, opened.output
    return tmp_path / "main.bean"


def _import(book: Path, rules: str, *flags: str):
    (book.parent / "bank.csv").write_text(HEADER + ROWS)
    (book.parent / "rules.toml").write_text(rules)
    return runner.invoke(
        app,
        [
            "--json",
            "--file",
            str(book),
            "import",
            str(book.parent / "bank.csv"),
            "--csv",
            MAPPING,
            "--account",
            "Assets:Checking",
            "--rules",
            str(book.parent / "rules.toml"),
            *flags,
        ],
    )


ATTRIBUTED = '[[rule]]\nmatch = "acme"\naccount = "Expenses:Hosting"\nclient = "acme"\nproject = "site"\n'


def test_a_matched_row_carries_the_rules_client_and_project(book: Path) -> None:
    before = book.read_text()
    preview = _import(book, ATTRIBUTED)
    assert preview.exit_code == 0, preview.output
    hosting, coffee = json.loads(preview.stdout)["data"]["rows"]
    assert 'client: "acme"' in hosting["entry"] and 'project: "site"' in hosting["entry"]
    assert "client:" not in coffee["entry"] and "project:" not in coffee["entry"]
    assert book.read_text() == before

    applied = _import(book, ATTRIBUTED, "--apply")
    assert applied.exit_code == 0, applied.output
    written = book.read_text()
    assert written.count('client: "acme"') == 1 and written.count('project: "site"') == 1
    entry = written[written.index('"Acme Hosting"') :].split("\n\n")[0]
    assert 'client: "acme"' in entry and "Expenses:Hosting" in entry
    check = runner.invoke(app, ["--json", "--file", str(book), "check"])
    assert check.exit_code == 0, check.output


def test_a_rule_may_set_one_key_alone(book: Path) -> None:
    preview = _import(book, '[[rule]]\nmatch = "acme"\naccount = "Expenses:Hosting"\nproject = "site"\n')
    assert preview.exit_code == 0, preview.output
    hosting = json.loads(preview.stdout)["data"]["rows"][0]["entry"]
    assert 'project: "site"' in hosting and "client:" not in hosting


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ('""', "Rule 1 client must be a non-empty string; got ''."),
        ("7", "Rule 1 client must be a non-empty string; got 7."),
        ('"ac\\tme"', "Rule 1 client 'ac\\tme' contains the control character '\\t'."),
    ],
)
def test_an_unusable_client_value_is_refused_and_nothing_is_written(book: Path, value: str, expected: str) -> None:
    before = book.read_text()
    result = _import(book, f'[[rule]]\nmatch = "acme"\naccount = "Expenses:Hosting"\nclient = {value}\n', "--apply")
    assert result.exit_code == 2, result.output
    assert expected in json.loads(result.output)["error"]["message"]
    assert book.read_text() == before


def test_any_other_rule_key_is_still_refused(book: Path) -> None:
    result = _import(book, '[[rule]]\nmatch = "acme"\naccount = "Expenses:Hosting"\ncustomer = "acme"\n')
    assert result.exit_code == 2, result.output
    message = json.loads(result.output)["error"]["message"]
    expected = "unknown key 'customer'; each rule holds only match and account, and optionally client and project."
    assert expected in message
