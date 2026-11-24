"""A refusal of errors the ledger already has quotes them as the ledger holds them (w1/376).

"The ledger already has 1 error(s); nothing was written" listed the failing
assertion as the refused write would have left it: a backdated 5.00 USD lunch
made `accumulated 100.00 USD (10.00 too much)` read `accumulated 95.00 USD
(5.00 too much)`, and a 20.00 one `80.00 USD (10.00 too little)`, sending the
user after a missing deposit when the books hold an extra 10.00. The advice
under the assertion weighed the proposal's balance the same way. What the
write would make of the assertion now follows as a hint labelled as the
proposal's.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Income:Job USD
2026-01-02 * "pay"
  Income:Job  -100.00 USD
  Assets:Checking
2026-01-10 balance Assets:Checking 90.00 USD
"""
ON_DISK = "expected 90.00 USD != accumulated 100.00 USD (10.00 too much)"


def _refusal(tmp_path: Path, *args: str) -> tuple[str, str]:
    """The refusal's message and its `--json` details, joined."""
    result = _bea(tmp_path, *args)
    assert result.returncode == 1, result.stdout
    error = json.loads(result.stderr)["error"]
    return str(error["message"]), " ".join(error["details"])


def _lunch(amount: str, command: str, account: str = "Assets:Checking") -> list[str]:
    if command == "add":
        return [
            "add",
            "transaction",
            "lunch",
            "--date",
            "2026-01-05",
            "-p",
            f"Expenses:Food {amount} USD",
            "-p",
            account,
        ]
    return ["add", "transactions", "--from", "rows.json"]


@pytest.mark.parametrize(
    ("amount", "moved"),
    [("5.00", "95.00 USD (5.00 too much)"), ("20.00", "80.00 USD (10.00 too little)")],
    ids=["less-too-much", "too-little"],
)
@pytest.mark.parametrize("command", ["add", "bulk"])
def test_the_refusal_quotes_the_assertion_the_books_fail(tmp_path: Path, amount: str, moved: str, command: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = [
        {
            "date": "2026-01-05",
            "narration": "lunch",
            "postings": [{"account": "Expenses:Food", "amount": f"{amount} USD"}, {"account": "Assets:Checking"}],
        }
    ]
    (tmp_path / "rows.json").write_text(json.dumps(rows))
    checked = _bea(tmp_path, "check")
    assert checked.returncode == 1 and ON_DISK in checked.stdout + checked.stderr

    message, details = _refusal(tmp_path, *_lunch(amount, command))

    assert "The ledger already has 1 error(s); nothing was written." in message
    assert f"{ledger}:8: Balance failed for 'Assets:Checking': {ON_DISK}" in details
    labelled = f"With the proposed write (not written), it would read: expected 90.00 USD != accumulated {moved}."
    assert labelled in details
    assert details.replace(labelled, "").count(moved.split()[0]) == 0
    assert "Review transactions against the existing assertion" in details
    assert ledger.read_text() == LEDGER


CARD = """option "operating_currency" "USD"
2026-01-01 open Liabilities:Card USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "dinner"
  Expenses:Food  {held} USD
  Liabilities:Card
2026-01-10 balance Liabilities:Card 77.04 USD
"""


@pytest.mark.parametrize(
    ("held", "hinted"),
    [("67.04", False), ("77.04", True)],
    ids=["proposal-matches-the-sign", "books-match-the-sign"],
)
def test_the_sign_hint_weighs_the_books_not_the_proposal(tmp_path: Path, held: str, hinted: bool) -> None:
    # A card statement's 77.04 owed is -77.04 in Beancount. The hint says so
    # when the books hold -77.04, not when only the refused charge would.
    ledger = tmp_path / "main.bean"
    ledger.write_text(CARD.format(held=held))

    _, details = _refusal(tmp_path, *_lunch("10.00", "add", "Liabilities:Card"))

    assert f"Balance failed for 'Liabilities:Card': expected 77.04 USD != accumulated -{held} USD" in details
    assert ("Did you mean -77.04 USD?" in details) is hinted
    assert "Did you mean -87.04" not in details


PLUGIN = """from beancount.core import data
__plugins__ = ["corrupt"]
def corrupt(entries, options_map):
    return [e._replace(tags=None) if isinstance(e, data.Transaction) else e for e in entries], []
"""


def test_a_ledger_with_data_type_errors_quotes_its_assertion_on_disk(tmp_path: Path) -> None:
    # Plugin data-type errors take their own refusal ("tolerate existing
    # errors; new errors are still refused"), which quoted the proposal too.
    (tmp_path / "badtypes.py").write_text(PLUGIN)
    ledger = tmp_path / "main.bean"
    text = 'option "insert_pythonpath" "TRUE"\nplugin "badtypes"\n' + LEDGER.split("\n", 1)[1]
    ledger.write_text(text)

    message, details = _refusal(tmp_path, *_lunch("5.00", "add"))

    assert "Pass --allow-errors to tolerate existing errors" in message
    assert f"Balance failed for 'Assets:Checking': {ON_DISK}" in details
    assert "!= accumulated 95.00 USD (5.00 too much)." in details.split("(not written), it would read: ", 1)[1]
    assert "Invalid data types" in details
    assert ledger.read_text() == text
