"""A symlinked root ledger resolves its includes beside the link (w1/056).

Beancount's loader takes the entry path with `abspath`, which never follows a
link, so `bean-check main.bean` reads `include "sub/accounts.bean"` from the
link's directory. bea resolved the entry first and looked beside the target,
failing check, list, query, and add on a ledger upstream accepts.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
BOOKS = (
    'option "operating_currency" "USD"\n'
    'include "sub/accounts.bean"\n'
    '2026-01-02 * "Opening"\n'
    "  Assets:Checking  100.00 USD\n"
    "  Equity:Opening\n"
)
ACCOUNTS = (
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Equity:Opening USD\n"
    "2026-01-01 open Expenses:Uncategorized USD\n"
)


@pytest.fixture
def link(tmp_path: Path) -> Path:
    (tmp_path / "repo" / "sub").mkdir(parents=True)
    (tmp_path / "shared").mkdir()
    (tmp_path / "shared" / "books.bean").write_text(BOOKS)
    (tmp_path / "repo" / "sub" / "accounts.bean").write_text(ACCOUNTS)
    entry = tmp_path / "repo" / "main.bean"
    entry.symlink_to(Path("..") / "shared" / "books.bean")
    return entry


def test_check_list_and_query_load_includes_beside_the_link(link: Path) -> None:
    assert runner.invoke(app, ["--file", str(link), "check"]).exit_code == 0

    checked = runner.invoke(app, ["--json", "--file", str(link), "check"])
    assert checked.exit_code == 0, checked.output
    assert json.loads(checked.stdout)["data"] == {"valid": True, "errors": []}

    listed = runner.invoke(app, ["--json", "--file", str(link), "list", "transaction"])
    assert listed.exit_code == 0, listed.output
    assert [txn["narration"] for txn in json.loads(listed.stdout)["data"]] == ["Opening"]

    queried = runner.invoke(app, ["--file", str(link), "query", "SELECT account WHERE account ~ 'Equity'"])
    assert queried.exit_code == 0, queried.output
    assert "Equity:Opening" in queried.stdout


def test_cwd_discovery_and_bea_file_name_the_link_too(link: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(link.parent)
    assert runner.invoke(app, ["check"]).exit_code == 0

    monkeypatch.chdir(link.parent.parent)
    result = runner.invoke(app, ["check"], env={"BEA_FILE": str(link)})
    assert result.exit_code == 0, result.output


def test_add_writes_through_the_link(link: Path) -> None:
    result = runner.invoke(
        app,
        [
            "--file",
            str(link),
            "add",
            "transaction",
            "--date",
            "2026-01-03",
            "--narration",
            "Tea",
            "-p",
            "Assets:Checking -2 USD",
            "-p",
            "Equity:Opening",
        ],
    )

    assert result.exit_code == 0, result.output
    assert link.is_symlink()
    assert '"Tea"' in link.resolve().read_text()
    assert runner.invoke(app, ["--file", str(link), "check"]).exit_code == 0


def test_add_into_an_include_resolves_beside_the_link(link: Path) -> None:
    result = runner.invoke(
        app,
        [
            "--file",
            str(link),
            "add",
            "open",
            "--date",
            "2026-01-01",
            "-a",
            "Expenses:Food",
            "-c",
            "USD",
            "--into",
            "sub/accounts.bean",
        ],
    )

    assert result.exit_code == 0, result.output
    assert "Expenses:Food" in (link.parent / "sub" / "accounts.bean").read_text()


def test_import_applies_through_the_link(link: Path, tmp_path: Path) -> None:
    export = tmp_path / "bank.csv"
    export.write_text("Date,Amount,Payee\n2026-01-05,-3.00,Cafe\n")

    result = runner.invoke(
        app,
        [
            "--file",
            str(link),
            "import",
            str(export),
            "--csv",
            "date=Date,amount=Amount,payee=Payee",
            "--account",
            "Assets:Checking",
            "--apply",
        ],
    )

    assert result.exit_code == 0, result.output
    assert link.is_symlink()
    assert "Cafe" in link.resolve().read_text()


def test_an_output_alias_of_the_link_target_is_still_refused(link: Path) -> None:
    target = link.resolve()
    before = target.read_bytes()

    result = runner.invoke(app, ["--file", str(link), "query", "SELECT account", "-o", str(target)])

    assert result.exit_code == 2, result.output
    assert target.read_bytes() == before


def test_price_export_copies_the_root_under_its_own_name(link: Path, tmp_path: Path) -> None:
    out = tmp_path / "export"

    result = runner.invoke(app, ["--json", "--file", str(link), "price", "export", "--output", str(out)])

    assert result.exit_code == 0, result.output
    assert (out / "main.bean").read_text() == BOOKS
    assert (out / "sub" / "accounts.bean").read_text() == ACCOUNTS
    assert runner.invoke(app, ["--file", str(out / "main.bean"), "check"]).exit_code == 0
