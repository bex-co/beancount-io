"""A tag, link, flag or commodity value must be exactly one token (w1/046).

These fields are printed bare, so a value carrying a line break wrote extra
directives (an `open` the caller never asked for) and a value carrying a
sigil or comma split into several tags, links or currencies — all exit 0.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

from bea_engine import protocol
from bea_engine.ledger import write

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash
2026-01-01 open Equity:Opening
2026-01-01 open Expenses:Food USD
"""
INJECTED = "\n2026-01-01 open Assets:Evil"
POSTINGS = [{"account": "Expenses:Food", "amount": "1 USD"}, {"account": "Assets:Cash"}]


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    (tmp_path / "r.pdf").write_bytes(b"%PDF")
    return file


def _bea(ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    tmp = ledger.parent
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp / "config"),
        XDG_CACHE_HOME=str(tmp / "cache"),
        XDG_DATA_HOME=str(tmp / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "add", *args],
        env=env,
        cwd=tmp,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _bulk(ledger: Path, row: dict[str, object]) -> subprocess.CompletedProcess[str]:
    rows = ledger.parent / "rows.json"
    rows.write_text(json.dumps([{"date": "2026-02-01", "narration": "x", "postings": POSTINGS, **row}]))
    return _bea(ledger, "transactions", "--from", str(rows))


TRANSACTION = [
    "transaction",
    "--date",
    "2026-02-01",
    "--narration",
    "x",
    "-p",
    "Expenses:Food 1 USD",
    "-p",
    "Assets:Cash",
]
DOCUMENT = ["document", "--date", "2026-02-01", "-a", "Assets:Cash", "--filename", "r.pdf"]
OPEN = ["open", "--date", "2026-02-01", "-a", "Assets:New"]


@pytest.mark.parametrize(
    ("args", "option"),
    [
        ([*TRANSACTION, "--tag", "a ^b"], "--tag"),
        ([*TRANSACTION, "--link", "x^y"], "--link"),
        ([*TRANSACTION, "--tag", "trip" + INJECTED], "--tag"),
        ([*TRANSACTION, "--flag", "*" + INJECTED], "--flag"),
        ([*DOCUMENT, "--tag", "a#b"], "--tag"),
        ([*DOCUMENT, "--link", "q" + INJECTED], "--link"),
        ([*OPEN, "-c", "USD" + INJECTED], "--currency"),
        ([*OPEN, "-c", "EUR,GBP"], "--currency"),
        (["commodity", "--date", "2026-02-01", "-c", "ABC" + INJECTED], "--currency"),
        (["price", "--date", "2026-02-01", "-c", "BTC" + INJECTED, "--amount", "1 USD"], "--currency"),
    ],
)
def test_a_value_that_is_not_one_token_is_refused(ledger: Path, args: list[str], option: str) -> None:
    result = _bea(ledger, *args)
    assert result.returncode == 2, result.stdout + result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "Nothing was written" in error["message"]
    assert any(detail.startswith(f"{option}: ") for detail in error["details"]), error["details"]
    assert ledger.read_text() == LEDGER


@pytest.mark.parametrize(
    ("row", "field"),
    [
        ({"tags": ['trip\n2026-01-01 open Assets:Evil\n2026-02-01 * "y"']}, "tags.0"),
        ({"links": ["a ^b"]}, "links.0"),
        ({"flag": "*\n2026-01-01 open Assets:Evil\n2026-02-01 *"}, "flag"),
        (
            {"postings": [{"account": "Expenses:Food", "amount": "1 USD"}, {"account": "Assets:Cash", "flag": "!!"}]},
            "postings.1.flag",
        ),
        (
            {
                "postings": [
                    {"account": "Expenses:Food", "units": {"number": "1", "currency": "USD" + INJECTED}},
                    {"account": "Assets:Cash"},
                ]
            },
            "postings.0.units.currency",
        ),
    ],
)
def test_bulk_rows_reject_a_value_that_is_not_one_token(ledger: Path, row: dict[str, object], field: str) -> None:
    result = _bulk(ledger, row)
    assert result.returncode != 0, result.stdout
    error = json.loads(result.stderr)["error"]
    assert error["result"]["written"] == 0
    assert any(detail.startswith(f"Row 1, {field}: ") for detail in error["details"]), error["details"]
    assert ledger.read_text() == LEDGER


def test_single_token_spellings_still_write(ledger: Path) -> None:
    result = _bea(ledger, *TRANSACTION, "--tag", "trip", "--tag", "#travel.2026", "--link", "^inv-001", "--flag", "txn")
    assert result.returncode == 0, result.stderr
    result = _bea(ledger, *OPEN, "-c", "USD", "-c", "EUR", "-c", "NT.TO", "-c", "/6J")
    assert result.returncode == 0, result.stderr
    result = _bulk(ledger, {"tags": ["#bulk"], "links": ["^b-1"], "flag": "!"})
    assert result.returncode == 0, result.stderr
    added = ledger.read_text().removeprefix(LEDGER)
    assert '2026-02-01 * "x" #travel.2026 #trip ^inv-001' in added
    assert "2026-02-01 open Assets:New USD,EUR,NT.TO,/6J" in added
    assert '2026-02-01 ! "x" #bulk ^b-1' in added
    assert "Assets:Evil" not in added


@pytest.mark.parametrize(
    "text",
    [
        '2026-02-01 * "x" #trip\n2026-01-01 open Assets:Evil\n2026-02-01 * "y"\n  Assets:Cash  1 USD\n',
        'option "operating_currency" "EUR"\n',
        '2026-02-01 commodity ABC\ninclude "other.bean"\n',
    ],
)
def test_an_append_reads_back_as_one_directive_per_text(ledger: Path, text: str) -> None:
    """The writer's last line of defence: whatever a field let through, one text is one directive."""
    with pytest.raises(protocol.UsageError, match="Nothing was written"):
        write.append(ledger, [text])
    assert ledger.read_text() == LEDGER
    write.append(ledger, ["2026-02-01 open Assets:New USD\n", '2026-02-01 note Assets:Cash "a\nb"\n'])
    assert ledger.read_text().count("2026-02-01") == 2


PLUGIN = '''
import datetime
from decimal import Decimal

from beancount.core.amount import Amount
from beancount.core.data import Commodity, Open, Posting, Transaction, new_metadata

__plugins__ = ("odd_entries",)


def odd_entries(entries, options):
    """Entries no lexer could produce: the read side must still list them."""
    day = datetime.date(2026, 3, 1)
    meta = new_metadata("<odd_entries>", 0)
    postings = [
        Posting("Assets:Cash", Amount(Decimal("1"), "odd cur"), None, None, "~", None),
        Posting("Equity:Opening", Amount(Decimal("-1"), "odd cur"), None, None, None, None),
    ]
    extra = [
        Transaction(meta, day, "~", None, "odd", frozenset({"has space"}), frozenset({"x^y"}), postings),
        Open(meta, day, "Assets:Odd", ["odd cur"], None),
        Commodity(meta, day, "odd cur"),
    ]
    return entries + extra, []
'''


def _list(ledger: Path, kind: str) -> list[dict[str, Any]]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(ledger.parent / "config"),
        XDG_CACHE_HOME=str(ledger.parent / "cache"),
        XDG_DATA_HOME=str(ledger.parent / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=os.pathsep.join([str(ROOT / "src"), str(ledger.parent)]),
    )
    result = subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--file", str(ledger), "list", kind, "--allow-errors"],
        env=env,
        cwd=ledger.parent,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    data = json.loads(result.stdout)["data"]
    rows = data if isinstance(data, list) else next(v for v in data.values() if isinstance(v, list))
    return list(rows)


def test_entries_a_plugin_generates_still_list(ledger: Path) -> None:
    """Token rules guard write input only; a read never refuses what a plugin made."""
    (ledger.parent / "odd_entries.py").write_text(PLUGIN)
    ledger.write_text('plugin "odd_entries"\n' + LEDGER)
    [odd] = [row for row in _list(ledger, "transaction") if row.get("narration") == "odd"]
    assert odd["flag"] == "~"
    assert odd["tags"] == ["has space"]
    assert odd["links"] == ["x^y"]
    assert [posting["units"]["currency"] for posting in odd["postings"]] == ["odd cur", "odd cur"]
    assert odd["postings"][0]["flag"] == "~"
    assert any(row.get("currencies") == ["odd cur"] for row in _list(ledger, "open"))
    assert any(row.get("currency") == "odd cur" for row in _list(ledger, "commodity"))
