"""A listing replays a dateless lot whose quantity booking inferred (w5/1018).

Two purchases that leave their HOOL quantity to interpolation book as one lot
without a cost date, and a partial sale reduces it. `list transaction`
reported the completed quantities only, so `add transactions` wrote them
explicitly: native booking then dated each purchase, the two lots no longer
merged, and the sale was refused as ambiguous — the whole replay with it.
The listing now marks such units `inferred`, bulk input writes them
number-less again, and a stated number booking would not infer is refused.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BASE = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Broker HOOL
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Gains USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
TRADES = [
    ("2024-01-02", "Trade buy A", ["Assets:Cash -10.00 USD", "Assets:Broker HOOL {5 USD}"]),
    ("2024-01-03", "Trade buy B", ["Assets:Cash -10.00 USD", "Assets:Broker HOOL {5 USD}"]),
    (
        "2024-01-04",
        "Trade sale",
        ["Assets:Broker -2 HOOL {5 USD} @ 6 USD", "Assets:Cash 12 USD", "Income:Gains -2 USD"],
    ),
]
LOTS = (
    "SELECT date, narration, account, number, currency, cost_number, cost_currency, cost_date, cost_label, price "
    "WHERE account ~ 'Broker'"
)


def _bea(tmp_path: Path, book: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "--no-input", "-f", str(book), *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _data(result: subprocess.CompletedProcess[str]) -> Any:
    assert result.returncode == 0, result.stderr or result.stdout
    return json.loads(result.stdout)["data"]


def _source(tmp_path: Path, *, dated: bool = False) -> tuple[Path, list[Any]]:
    """The three trades added through `add transaction`, and their replies."""
    book = tmp_path / "main.bean"
    book.write_text(BASE)
    replies = []
    for day, narration, postings in TRADES:
        if dated:
            postings = [p.replace("HOOL {5 USD}", "HOOL {5 USD, 2023-12-31}") for p in postings]
        flags = [part for posting in postings for part in ("--posting", posting)]
        added = _data(_bea(tmp_path, book, "add", "transaction", narration, "--date", day, *flags))
        replies.append(added["directive"])
    assert _bea(tmp_path, book, "check").returncode == 0
    return book, replies


def _listed(tmp_path: Path, book: Path) -> list[Any]:
    args = ["list", "transaction", "--search", "Trade", "--account", "Cash", "--on-disk", "--sort", "oldest"]
    rows: list[Any] = _data(_bea(tmp_path, book, *args))
    assert [row["narration"] for row in rows] == [narration for _, narration, _ in TRADES]
    return rows


def _replay(tmp_path: Path, rows: list[Any]) -> tuple[Path, subprocess.CompletedProcess[str]]:
    copy = tmp_path / "copy.bean"
    copy.write_text(BASE)
    payload = tmp_path / "rows.json"
    payload.write_text(json.dumps(rows))
    return copy, _bea(tmp_path, copy, "add", "transactions", "--from", str(payload))


def _lots(tmp_path: Path, book: Path) -> list[Any]:
    return list(_data(_bea(tmp_path, book, "query", LOTS))["rows"])


def _assert_same_books(tmp_path: Path, book: Path, rows: list[Any]) -> None:
    copy, replayed = _replay(tmp_path, rows)
    assert _data(replayed)["written"] == 3
    assert _bea(tmp_path, copy, "check").returncode == 0
    assert _lots(tmp_path, copy) == _lots(tmp_path, book)


def test_unedited_listing_replays_the_partial_sale_of_a_dateless_lot(tmp_path: Path) -> None:
    book, _ = _source(tmp_path)
    source_lots = _lots(tmp_path, book)
    # Both purchases hold one undated lot, and the sale reduces it.
    assert [(row[1], row[3], row[7]) for row in source_lots] == [
        ("Trade buy A", "2.00", None),
        ("Trade buy B", "2.00", None),
        ("Trade sale", "-2", None),
    ]
    rows = _listed(tmp_path, book)

    # Readers still see the booked quantities; only the inferred ones say so.
    buys = [next(p for p in row["postings"] if p["account"] == "Assets:Broker") for row in rows]
    assert [p["units"] for p in buys] == [
        {"number": "2.00", "currency": "HOOL", "inferred": True},
        {"number": "2.00", "currency": "HOOL", "inferred": True},
        {"number": "-2", "currency": "HOOL"},
    ]
    assert [p["cost"]["date"] for p in buys] == [None, None, None]
    for row in rows:
        assert row["matching_postings"] == [p for p in row["postings"] if p["account"] == "Assets:Cash"]
        assert all("inferred" not in p["units"] for p in row["postings"] if p["account"] != "Assets:Broker")

    copy, replayed = _replay(tmp_path, rows)

    assert _data(replayed)["written"] == 3
    assert copy.read_text().count("Assets:Broker  HOOL {5 USD}") == 2
    assert _bea(tmp_path, copy, "check").returncode == 0
    assert _lots(tmp_path, copy) == source_lots


def test_an_edited_inferred_number_is_refused_not_ignored(tmp_path: Path) -> None:
    book, _ = _source(tmp_path)
    rows = _listed(tmp_path, book)
    rows[0]["postings"][1]["units"]["number"] = "3"

    copy, replayed = _replay(tmp_path, rows)

    assert replayed.returncode == 1
    message = " ".join(replayed.stderr.split())
    assert "Row 1, postings.1.units: states 3 HOOL as inferred, but booking infers 2.00 HOOL" in message
    assert copy.read_text() == BASE


def test_null_numbers_in_the_listing_still_replay(tmp_path: Path) -> None:
    book, _ = _source(tmp_path)
    rows = _listed(tmp_path, book)
    for row in rows[:2]:
        units = row["postings"][1]["units"]
        units.pop("inferred", None)
        units["number"] = None

    _assert_same_books(tmp_path, book, rows)


def test_a_shared_explicit_cost_date_lists_and_replays_unmarked(tmp_path: Path) -> None:
    book, _ = _source(tmp_path, dated=True)
    rows = _listed(tmp_path, book)
    assert all("inferred" not in p["units"] for row in rows for p in row["postings"])
    assert {row["postings"][0 if row["narration"] == "Trade sale" else 1]["cost"]["date"] for row in rows} == {
        "2023-12-31"
    }

    _assert_same_books(tmp_path, book, rows)


def test_single_add_replies_still_replay(tmp_path: Path) -> None:
    book, replies = _source(tmp_path)
    assert [reply["postings"][1]["units"]["number"] for reply in replies[:2]] == [None, None]

    _assert_same_books(tmp_path, book, replies)


def test_an_explicit_quantity_keeps_its_default_dated_lot(tmp_path: Path) -> None:
    book = tmp_path / "main.bean"
    book.write_text(BASE)
    _data(
        _bea(
            tmp_path,
            book,
            "add",
            "transaction",
            "Trade buy",
            "--date",
            "2024-01-02",
            "--posting",
            "Assets:Cash -10.00 USD",
            "--posting",
            "Assets:Broker 2 HOOL {5 USD}",
        )
    )
    (row,) = _data(_bea(tmp_path, book, "list", "transaction", "--search", "Trade"))
    assert row["postings"][1]["units"] == {"number": "2", "currency": "HOOL"}
    assert row["postings"][1]["cost"]["date"] == "2024-01-02"

    copy, replayed = _replay(tmp_path, [row])

    assert _data(replayed)["written"] == 1
    assert _lots(tmp_path, copy) == _lots(tmp_path, book)
