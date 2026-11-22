"""A cost that names no currency is refused when booking costs it in the units' own commodity (w1/355).

w1/278 refused `10 USD {USD}`, but `{}`, `{2026-01-10}` and `{"lbl"}` name no
currency, so the check on the parsed posting let them through. Booking then
took the currency from the other legs: a deposit or a card charge became a
USD lot at 1 USD beside the account's cash, exit 0 and a passing check, and
`report holdings` listed the user's own cash and card debt as investments.
The test is on what the write books, so a sale that names a real lot and a
USD lot costed in EUR still write.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from bea_engine import protocol
from bea_engine.ledger import appending
from cli.main import app

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Liabilities:Card USD
2026-01-01 open Assets:Broker
2026-01-01 open Assets:Euro EUR
2026-01-01 open Equity:Opening-Balances
2026-01-01 open Expenses:Food
2026-01-01 open Income:Gains

2026-01-01 * "Opening"
  Assets:Checking  1000.00 USD
  Equity:Opening-Balances

2026-01-02 * "Buy"
  Assets:Broker  10 AAPL {100 USD}
  Assets:Checking  -1000 USD
"""

SPECS = ["{}", "{2026-01-10}", '{"lbl"}']

# (postings, the refused posting's number, its account)
LEGS = {
    "deposit": (["Assets:Checking 12.50 USD {spec}", "Expenses:Food -12.50 USD"], 1, "Assets:Checking"),
    "card charge": (["Expenses:Food 8.00 USD", "Liabilities:Card -8.00 USD {spec}"], 2, "Liabilities:Card"),
}

TAIL = "is held at a cost in its own commodity USD"

IMPORTER = """\
import datetime
from decimal import Decimal
from beancount.core import amount, data, position
from beancount.core.number import MISSING


class Refunds:
    name = "refunds"

    def identify(self, filepath):
        return filepath.endswith("stmt.txt")

    def account(self, filepath):
        return "Assets:Checking"

    def extract(self, filepath, existing):
        out = []
        for line, currency in enumerate(open(filepath).read().split(), start=1):
            meta = data.new_metadata(filepath, line)
            lot = position.CostSpec(MISSING, None, MISSING, None, None, False)
            bank = data.Posting("Assets:Checking", amount.Amount(Decimal("12.50"), "USD"), lot, None, None, None)
            food = data.Posting("Expenses:Food", amount.Amount(Decimal("-10"), currency), None, None, None, None)
            out.append(
                data.Transaction(meta, datetime.date(2026, 2, line), "*", None, f"Refund {line}",
                                 data.EMPTY_SET, data.EMPTY_SET, [bank, food])
            )
        return out


CONFIG = [Refunds()]
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_bytes(LEDGER.encode())
    return path


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *args],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _add(ledger: Path, *postings: str) -> subprocess.CompletedProcess[str]:
    flags = [part for posting in postings for part in ("-p", posting)]
    return _bea(ledger.parent, "--file", str(ledger), "add", "transaction", "Refund", "--date", "2026-01-10", *flags)


@pytest.mark.parametrize("spec", SPECS)
@pytest.mark.parametrize("leg", sorted(LEGS))
def test_a_cost_booked_in_its_own_commodity_is_refused(ledger: Path, leg: str, spec: str) -> None:
    postings, number, account = LEGS[leg]
    result = _add(ledger, *(posting.format(spec=spec) for posting in postings))
    assert result.returncode == 2, result.stderr
    message = " ".join(result.stderr.split())
    assert f"--posting {number} {TAIL}" in message
    assert f"'{account} NUMBER COMMODITY {{…}}'" in message
    assert message.endswith("Nothing was written.")
    assert ledger.read_bytes() == LEDGER.encode()


@pytest.mark.parametrize(
    "postings",
    [
        # A sale names a real lot, costed in dollars, not in AAPL.
        ("Assets:Broker -5 AAPL {}", "Assets:Checking 600 USD", "Income:Gains"),
        # Dollars bought for euros are a lot costed in another commodity.
        ("Assets:Checking 12.50 USD {}", "Expenses:Food -10 EUR"),
        ("Assets:Euro 10 EUR @ 1.1 USD", "Assets:Checking"),
        ("Assets:Broker 5 ABC {10 USD}", "Assets:Checking"),
        ("Expenses:Food 10 USD", "Assets:Checking"),
    ],
)
def test_a_cost_in_another_commodity_is_still_written(ledger: Path, postings: tuple[str, ...]) -> None:
    result = _add(ledger, *postings)
    assert result.returncode == 0, result.stderr
    assert postings[0].split()[0] in ledger.read_text().split('"Refund"', 1)[1]


def _rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for spec in SPECS:
        # The amount shorthand for the deposit, units beside a structured cost for the charge.
        rows.append(
            {
                "date": "2026-01-10",
                "narration": "Refund",
                "postings": [
                    {"account": "Assets:Checking", "amount": f"12.50 USD {spec}"},
                    {"account": "Expenses:Food", "amount": "-12.50 USD"},
                ],
            }
        )
        cost = {"{}": {}, "{2026-01-10}": {"date": "2026-01-10"}, '{"lbl"}': {"label": "lbl"}}[spec]
        rows.append(
            {
                "date": "2026-01-11",
                "narration": "Lunch",
                "postings": [
                    {"account": "Expenses:Food", "amount": "8.00 USD"},
                    {"account": "Liabilities:Card", "units": {"number": "-8.00", "currency": "USD"}, "cost": cost},
                ],
            }
        )
    rows.append(
        {
            "date": "2026-01-12",
            "narration": "Sale",
            "postings": [
                {"account": "Assets:Broker", "amount": "-5 AAPL {}"},
                {"account": "Assets:Checking", "amount": "600 USD"},
                {"account": "Income:Gains"},
            ],
        }
    )
    return rows


def test_bulk_rows_booked_in_their_own_commodity_are_refused_per_row(ledger: Path) -> None:
    source = ledger.parent / "rows.json"
    source.write_text(json.dumps(_rows()))
    whole = _bea(ledger.parent, "--file", str(ledger), "add", "transactions", "--from", str(source))
    # Refused per row, as a typed `{USD}` row is: the batch exits 1 and writes nothing.
    assert whole.returncode == 1, whole.stderr
    assert "6 of 7 row(s) failed validation; nothing was written." in " ".join(whole.stderr.split())
    assert ledger.read_bytes() == LEDGER.encode()

    partial = _bea(ledger.parent, "--file", str(ledger), "add", "transactions", "--from", str(source), "--partial")
    assert partial.returncode == 1, partial.stderr
    message = " ".join(partial.stderr.split())
    for row in (1, 3, 5):
        assert f"Row {row}, postings.0: the posting {TAIL}" in message
    for row in (2, 4, 6):
        assert f"Row {row}, postings.1: the posting {TAIL}" in message
    assert "Row 7" not in message
    written = ledger.read_text()[len(LEDGER) :]
    assert '"Sale"' in written
    assert '"Refund"' not in written and '"Lunch"' not in written


@pytest.mark.parametrize("spec", SPECS)
def test_ask_text_booked_in_its_own_commodity_is_refused(ledger: Path, spec: str) -> None:
    text = f'2026-01-11 * "Lunch"\n  Expenses:Food  8.00 USD\n  Liabilities:Card  -8.00 USD {spec}\n'
    with pytest.raises(protocol.UsageError) as refused:
        appending.answer(ledger, text, dry_run=True)
    assert str(refused.value).startswith(f"Write rejected: Liabilities:Card {TAIL}")
    assert ledger.read_bytes() == LEDGER.encode()


def test_import_marks_a_row_booked_in_its_own_commodity_invalid(ledger: Path, bea_config_dir: Path) -> None:
    books = ledger.parent
    (books / "imp.py").write_text(IMPORTER)
    (books / "stmt.txt").write_text("USD EUR")
    runner = CliRunner()
    args = ["--json", "--no-input", "--file", str(ledger), "import", str(books / "stmt.txt")]
    args += ["--config", str(books / "imp.py")]
    preview = runner.invoke(app, args)
    payload = json.loads(preview.stdout)
    data = payload.get("data") or payload["error"]["result"]
    # Dollars bought with dollars are refused; dollars bought with euros are a lot.
    assert [row["status"] for row in data["rows"]] == ["invalid", "new"]
    assert data["rows"][0]["reason"].startswith(f"Assets:Checking {TAIL}")

    applied = runner.invoke(app, [*args, "--apply"])
    assert applied.exit_code == 1, applied.output
    assert f"Row 1: Assets:Checking {TAIL}" in applied.output
    assert ledger.read_bytes() == LEDGER.encode()
