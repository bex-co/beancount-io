"""Import refuses account names under a root the ledger does not use (w1/157).

`parse_account` checked only the shape of a name, so `Foo:Bar` passed. Every
row then came back `blocked` with a `bea add open --account Foo:Bar` remedy
that `add` itself refuses ("Invalid account name"). The root is now checked
against the ledger's `name_*` options: `--account`, `--default-account` and
rule accounts are refused up front, an unknown-root category cell falls back to
the review queue, and a Python importer's posting gets no impossible remedy.
"""

from __future__ import annotations

import json
import shlex
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Uncategorized USD
"""
CSV = "Date,Amount,Description\n2026-01-02,-5.00,Coffee\n"


@pytest.fixture
def ledger(tmp_path: Path, bea_config_dir: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _bea(ledger: Path, *args: str) -> tuple[int, dict[str, Any]]:
    result = CliRunner().invoke(app, ["--json", "--no-input", "--file", str(ledger), *args])
    stream = result.stdout if result.exit_code == 0 else result.stderr
    return result.exit_code, json.loads(stream)


def _import(ledger: Path, body: str, *extra: str) -> tuple[int, dict[str, Any]]:
    source = ledger.parent / "c.csv"
    source.write_text(body)
    return _bea(ledger, "import", str(source), "--csv", "auto", *extra)


@pytest.mark.parametrize(
    ("extra", "option"),
    [
        (("--account", "Foo:Bar"), "--account"),
        (("--account", "Assets:Cash", "--default-account", "Foo:Bar"), "--default-account"),
    ],
)
def test_an_option_under_an_unknown_root_is_a_usage_error(ledger: Path, extra: tuple[str, ...], option: str) -> None:
    code, payload = _import(ledger, CSV, *extra)

    assert code == 2
    message = payload["error"]["message"]
    assert message.startswith(f"{option}: Account 'Foo:Bar' has root 'Foo'")
    assert "add open" not in message
    assert ledger.read_text() == LEDGER


def test_a_rule_under_an_unknown_root_is_refused(ledger: Path) -> None:
    rules = ledger.parent / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "Coffee"\naccount = "Food:Coffee"\n')

    code, payload = _import(ledger, CSV, "--account", "Assets:Cash", "--rules", str(rules))

    assert code == 2
    assert "Rule 1: Account 'Food:Coffee' has root 'Food'" in payload["error"]["message"]


def test_an_unknown_root_category_queues_for_review(ledger: Path) -> None:
    body = "Date,Amount,Description,Category\n2026-01-02,-5.00,Coffee,Dining:Out\n"

    code, payload = _import(ledger, body, "--account", "Assets:Cash")

    assert code == 0
    (row,) = payload["data"]["rows"]
    assert row["status"] == "new"
    assert row["rule"] == "unmatched"
    assert "Dining:Out" not in payload["data"]["diff"]


def test_a_known_root_still_blocks_with_a_remedy_that_works(ledger: Path) -> None:
    code, payload = _import(ledger, CSV, "--account", "Assets:Cash", "--default-account", "Expenses:New")
    assert code == 0
    (row,) = payload["data"]["rows"]
    assert row["status"] == "blocked"
    remedy = row["reason"].split("Run: ", 1)[1].rstrip(".")
    argv = shlex.split(remedy)
    assert argv[:2] == ["bea", "add"]
    code, _ = _bea(ledger, *argv[1:])
    assert code == 0
    code, payload = _import(ledger, CSV, "--account", "Assets:Cash", "--default-account", "Expenses:New")
    assert payload["data"]["rows"][0]["status"] == "new"


def test_configured_root_names_are_the_ones_checked(ledger: Path) -> None:
    ledger.write_text('option "name_expenses" "Ausgaben"\n' + LEDGER.replace("Expenses:", "Ausgaben:"))

    code, payload = _import(ledger, CSV, "--account", "Assets:Cash", "--default-account", "Expenses:Food")
    assert code == 2
    assert "Ausgaben" in payload["error"]["message"]

    code, payload = _import(ledger, CSV, "--account", "Assets:Cash", "--default-account", "Ausgaben:Uncategorized")
    assert code == 0
    assert payload["data"]["rows"][0]["status"] == "new"


def test_a_python_importer_posting_gets_no_impossible_remedy(ledger: Path) -> None:
    config = ledger.parent / "importers.py"
    config.write_text(
        "import datetime\n"
        "from decimal import Decimal\n"
        "from beancount.core.amount import Amount\n"
        "from beancount.core.data import Posting, Transaction, new_metadata\n"
        "class Importer:\n"
        '    name = "i"\n'
        "    def identify(self, filepath): return True\n"
        '    def account(self, filepath): return "Assets:Cash"\n'
        "    def extract(self, filepath, existing):\n"
        "        return [Transaction(new_metadata(filepath, 1), datetime.date(2026, 1, 2), '*', None, 'x',"
        " frozenset(), frozenset(), [Posting('Assets:Cash', Amount(Decimal('-5'), 'USD'), None, None, None, None),"
        " Posting('Foo:Bar', Amount(Decimal('5'), 'USD'), None, None, None, None)])]\n"
        "CONFIG = [Importer()]\n"
    )
    source = ledger.parent / "export.txt"
    source.write_text("x\n")

    code, payload = _bea(ledger, "import", str(source), "--config", str(config))

    assert code == 0
    (row,) = payload["data"]["rows"]
    assert row["status"] == "blocked"
    assert row["reason"].startswith("Account 'Foo:Bar' has root 'Foo'")
    assert "add open" not in row["reason"]
