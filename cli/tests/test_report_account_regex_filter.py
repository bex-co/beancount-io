"""`report --account` honors the regular expressions it documents (w3/379).

`--account` promises "a parent account or a regular expression", and the
invalid-filter error even suggests `'Expenses:(Food|Rent)'`. Parent accounts
worked; every true regex came back with empty totals and exit 0, because the
entry filter matched by `has_component`-or-regex while the statement-tree prune
matched by substring — and a pattern is a substring of no account name.

`bea balance` documents *substrings*, so its behavior is pinned here too: the
two commands must keep their own documented matchers.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Dining USD
2026-01-01 open Expenses:Groceries USD
2026-01-01 open Income:Salary USD
2026-01-10 txn "Employer" "Pay"
  Income:Salary -3000.00 USD
  Assets:Checking 3000.00 USD
2026-01-12 txn "Store" "Food"
  Expenses:Groceries 85.50 USD
  Assets:Checking -85.50 USD
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "books.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _report(tmp_path: Path, ledger: Path, kind: str, account: str) -> dict:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "report", kind, "--account", account)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)["data"]


def test_alternation_regex_totals_the_accounts_it_names(tmp_path: Path, ledger: Path) -> None:
    """The exact shape the invalid-filter error suggests to the user."""
    data = _report(tmp_path, ledger, "overview", "Expenses:(Dining|Groceries)")
    assert data["totals"]["expenses"] == {"USD": "85.50"}
    assert data["account_filter_empty"] is False


def test_match_everything_regex_matches_everything(tmp_path: Path, ledger: Path) -> None:
    data = _report(tmp_path, ledger, "overview", ".*")
    assert data["totals"]["expenses"] == {"USD": "85.50"}
    assert data["totals"]["income"] == {"USD": "-3000.00"}
    assert data["totals"]["assets"] == {"USD": "2914.50"}


def test_matching_nothing_says_so_instead_of_printing_a_bare_header(tmp_path: Path, ledger: Path) -> None:
    """A regex with no accounts behind it is reported, not rendered as empty success."""
    data = _report(tmp_path, ledger, "overview", "Expenses:Nope.*")
    assert data["totals"]["expenses"] == {}
    assert data["account_filter_empty"] is True

    human = _bea(tmp_path, "--file", str(ledger), "report", "trial-balance", "--account", "Expenses:Nope.*")
    assert human.returncode == 0
    assert "No accounts match Expenses:Nope.*." in human.stderr, "a bare header is not an answer"


@pytest.mark.parametrize("kind", ["overview", "income-statement", "balance-sheet", "trial-balance"])
def test_every_subcommand_shares_the_fixed_prune(tmp_path: Path, ledger: Path, kind: str) -> None:
    """All four report kinds prune through one call, so all four must agree."""
    regex = _report(tmp_path, ledger, kind, "Expenses:(Dining|Groceries)")
    parent = _report(tmp_path, ledger, kind, "Expenses")
    # `Expenses` names exactly the two accounts the alternation names, so the
    # working parent form is the oracle for the regex form — over the whole
    # payload, not just the totals, since each kind reports its own sections.
    del regex["account_filter"], parent["account_filter"]
    assert regex == parent


def test_parent_filter_still_prunes_the_counterparty(tmp_path: Path, ledger: Path) -> None:
    """w3/322's guarantee: a parent filter must not drag in the other leg."""
    data = _report(tmp_path, ledger, "overview", "Expenses")
    assert data["totals"]["expenses"] == {"USD": "85.50"}
    assert data["totals"]["assets"] == {}, "the Assets:Checking counterparty leg must stay pruned"


def test_balance_keeps_its_documented_substring_matcher(tmp_path: Path, ledger: Path) -> None:
    """`bea balance` documents substrings, and did not change with `report`."""
    substring = _bea(tmp_path, "--file", str(ledger), "balance", "Groceries")
    assert substring.returncode == 0, substring.stderr
    assert "85.50 USD" in substring.stdout

    regex = _bea(tmp_path, "--file", str(ledger), "balance", "Expenses:(Dining|Groceries)")
    assert regex.returncode == 0
    assert "No accounts match" in regex.stderr, "a pattern is still a substring of no account name here"


def test_balance_and_report_agree_on_a_parent_filter(tmp_path: Path, ledger: Path) -> None:
    """The parity w3/322 established, restated against the new matcher split."""
    data = _report(tmp_path, ledger, "trial-balance", "Expenses")
    human = _bea(tmp_path, "--file", str(ledger), "balance", "Expenses")
    assert human.returncode == 0, human.stderr
    assert data["expenses"]["balance_children"] == {"USD": "85.50"}
    assert "85.50 USD" in human.stdout
