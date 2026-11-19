"""A header with no payee, narration, tag or link ends at its flag (w1/295).

Upstream's printer writes `<date> <flag> ` with a space after the flag when
it has no strings to join, so `bea add transaction` with no narration, a bulk
add of the help's minimal row, a CSV row with empty payee and narration cells,
`query -f beancount PRINT` and `list transaction --details` all left a trailing
space that `git diff --check` reports as a whitespace error.
"""

from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from beancount.core.amount import Amount
from beancount.core.data import EMPTY_SET, Posting, Transaction

from bea_engine.ledger.writer import format_entry

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Misc USD
2026-01-01 open Expenses:Uncategorized USD
"""
POSTINGS = ["-p", "Expenses:Misc 1.00 USD", "-p", "Assets:Cash"]


def _bea(tmp_path: Path, *args: str, stdin: str | None = None) -> subprocess.CompletedProcess[str]:
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
        [sys.executable, "-m", "cli.main", "-f", str(tmp_path / "main.bean"), *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        input=stdin,
        stdin=None if stdin is not None else subprocess.DEVNULL,
    )


def _headers(text: str) -> list[str]:
    return [line for line in text.splitlines() if line.startswith("2026-01-") and not line.startswith("2026-01-01")]


def _entry(payee: str | None = None, narration: str = "", tags=EMPTY_SET, links=EMPTY_SET) -> Transaction:
    return Transaction(
        meta={},
        date=datetime.date(2026, 1, 5),
        flag="*",
        payee=payee,
        narration=narration,
        tags=tags,
        links=links,
        postings=[
            Posting("Expenses:Misc", Amount(Decimal("1.00"), "USD"), None, None, None, None),
            Posting("Assets:Cash", None, None, None, None, None),
        ],
    )


@pytest.mark.parametrize(
    ("entry", "header"),
    [
        (_entry(), "2026-01-05 *"),
        (_entry(tags=frozenset({"x"})), "2026-01-05 * #x"),
        (_entry(links=frozenset({"L1"})), "2026-01-05 * ^L1"),
        (_entry(payee="P"), '2026-01-05 * "P" ""'),
        (_entry(narration="Coffee"), '2026-01-05 * "Coffee"'),
        (_entry(payee="P", narration="Coffee", tags=frozenset({"x"})), '2026-01-05 * "P" "Coffee" #x'),
    ],
)
def test_format_entry_header_ends_at_its_last_token(entry: Transaction, header: str) -> None:
    first, _, rest = format_entry(entry).partition("\n")
    assert first == header
    assert rest == "  Expenses:Misc  1.00 USD\n  Assets:Cash\n"


def test_add_transaction_without_narration_writes_no_trailing_space(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    result = _bea(tmp_path, "add", "transaction", "--date", "2026-01-05", *POSTINGS)
    assert result.returncode == 0, result.stderr
    result = _bea(tmp_path, "add", "transaction", "--date", "2026-01-06", "--tag", "x", *POSTINGS)
    assert result.returncode == 0, result.stderr
    result = _bea(tmp_path, "add", "transaction", "--date", "2026-01-07", "--link", "L1", *POSTINGS)
    assert result.returncode == 0, result.stderr
    assert _headers((tmp_path / "main.bean").read_text()) == ["2026-01-05 *", "2026-01-06 * #x", "2026-01-07 * ^L1"]


def test_add_transactions_minimal_and_empty_string_rows_write_no_trailing_space(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    postings = [{"account": "Expenses:Misc", "amount": "1 USD"}, {"account": "Assets:Cash"}]
    rows = [
        {"date": "2026-01-07", "postings": postings},
        {"date": "2026-01-08", "payee": "", "narration": "", "postings": postings},
    ]
    result = _bea(tmp_path, "add", "transactions", "--from", "-", stdin=json.dumps(rows))
    assert result.returncode == 0, result.stderr
    assert _headers((tmp_path / "main.bean").read_text()) == ["2026-01-07 *", "2026-01-08 *"]


def test_csv_row_with_empty_payee_and_narration_writes_no_trailing_space(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "s.csv").write_text("Date,Payee,Description,Amount\n2026-01-11,,,-3.00\n")
    result = _bea(
        tmp_path,
        "import",
        "s.csv",
        "--account",
        "Assets:Cash",
        "--csv",
        "date=Date,amount=Amount,payee=Payee,narration=Description",
        "--apply",
    )
    assert result.returncode == 0, result.stderr
    assert _headers((tmp_path / "main.bean").read_text()) == ["2026-01-11 !"]


def test_print_and_list_details_render_a_bare_header_without_trailing_space(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(
        LEDGER + "\n2026-01-05 *\n  Expenses:Misc  1.00 USD\n  Assets:Cash\n"
        "\n2026-01-06 * #x\n  Expenses:Misc  1.00 USD\n  Assets:Cash\n"
    )
    printed = _bea(tmp_path, "query", "-f", "beancount", "PRINT")
    assert printed.returncode == 0, printed.stderr
    assert _headers(printed.stdout) == ["2026-01-05 *", "2026-01-06 * #x"]
    listed = _bea(tmp_path, "list", "transaction", "--details")
    assert listed.returncode == 0, listed.stderr
    assert sorted(_headers(listed.stdout)) == ["2026-01-05 *", "2026-01-06 * #x"]
