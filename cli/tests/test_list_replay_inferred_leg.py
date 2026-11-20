"""A listing replays an omitted leg number-less, not as booking's quotient (w1/327).

`list transaction` completes every leg the ledger line left open with the
amount booking inferred for it, and only an undated lot's quantity said so
(w5/1018). `add transactions` therefore wrote every other inferred leg as a
literal: a `{{100.00 USD}}` purchase of 3 units came back as
`-99.99999999999999999999999999 USD`, exit 0, and every report from then on
printed USD to 26 decimals. The listing now marks such a leg `inferred`, so
the replay leaves it to booking again.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BASE = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Broker
2026-01-01 open Assets:Euro EUR
2026-01-01 open Assets:Wallet
2026-01-01 open Equity:Opening USD
2026-01-01 open Expenses:Food
2026-01-01 open Income:Gains USD

2026-01-01 * "Start"
  Assets:Cash  1000.00 USD
  Equity:Opening
"""
ENTRIES = {
    "Buy": "  Assets:Broker  3 HOOL {{100.00 USD}}\n  Assets:Cash\n",
    "Exchange": "  Assets:Euro  50.00 EUR @ 1.1 USD\n  Assets:Cash\n",
    "Total price": "  Assets:Euro  3 EUR @@ 10.00 USD\n  Assets:Cash\n",
    "Lunch": "  Expenses:Food  12.50 USD\n  Assets:Cash\n",
    "Sale": "  Assets:Broker  -1 HOOL {} @ 40.00 USD\n  Assets:Cash  40.00 USD\n  Income:Gains\n",
    # Booking fills in the cost, not the quantity: the line states its units.
    "Costed": "  Assets:Broker  3 HOOL {USD}\n  Assets:Cash  -100.00 USD\n",
    # One bare line booked as two postings, one per currency.
    "Split": "  Expenses:Food  10.00 USD\n  Expenses:Food  5.00 EUR\n  Assets:Wallet\n",
    # Two open legs, one per currency group.
    "Groups": "  Expenses:Food  7.00 USD\n  Assets:Cash  USD\n  Expenses:Food  3.00 EUR\n  Assets:Euro  EUR\n",
}


def _bea(tmp_path: Path, book: Path, *args: str, json_output: bool = True) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
        COLUMNS="200",
    )
    mode = ["--json"] if json_output else []
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *mode, "--no-input", "-f", str(book), *args],
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


def _book(tmp_path: Path, *narrations: str) -> Path:
    book = tmp_path / "main.bean"
    text = BASE
    for day, narration in enumerate(narrations, start=2):
        text += f'\n2026-01-{day:02d} * "{narration}"\n{ENTRIES[narration]}'
    book.write_text(text)
    assert _bea(tmp_path, book, "check").returncode == 0
    return book


def _listed(tmp_path: Path, book: Path, narration: str) -> dict[str, Any]:
    (row,) = _data(_bea(tmp_path, book, "list", "transaction", "--search", narration))
    return dict(row, date="2026-02-02")


def _replay(tmp_path: Path, book: Path, rows: list[dict[str, Any]]) -> subprocess.CompletedProcess[str]:
    payload = tmp_path / "rows.json"
    payload.write_text(json.dumps(rows))
    return _bea(tmp_path, book, "add", "transactions", "--from", str(payload))


def _appended(book: Path, before: str) -> str:
    text = book.read_text()
    assert text.startswith(before)
    return text[len(before) :]


def _cash(tmp_path: Path, book: Path) -> str:
    report = _bea(tmp_path, book, "report", "balance-sheet", "-x", "units", json_output=False)
    assert report.returncode == 0, report.stderr
    (line,) = [line for line in report.stdout.splitlines() if line.strip().startswith("Cash ")]
    return line.split()[-2]


def test_an_omitted_leg_beside_a_total_cost_replays_number_less(tmp_path: Path) -> None:
    book = _book(tmp_path, "Buy", "Lunch")
    before = book.read_text()
    row = _listed(tmp_path, book, "Buy")
    # Readers still see the booked amount; the marker says booking chose it.
    assert row["postings"][1]["units"] == {
        "number": "-99.99999999999999999999999999",
        "currency": "USD",
        "inferred": True,
    }
    assert "inferred" not in row["postings"][0]["units"]

    replayed = _replay(tmp_path, book, [row])

    assert _data(replayed)["written"] == 1
    added = _appended(book, before)
    assert "\n  Assets:Cash  USD\n" in added
    assert "99999" not in added.split("Assets:Cash", 1)[1]
    assert _bea(tmp_path, book, "check").returncode == 0
    assert _cash(tmp_path, book) == "787.50"


def test_an_omitted_leg_beside_a_price_replays_number_less(tmp_path: Path) -> None:
    book = _book(tmp_path, "Exchange", "Total price")
    before = book.read_text()
    rows = [_listed(tmp_path, book, "Exchange"), _listed(tmp_path, book, "Total price")]
    assert [row["postings"][1]["units"] for row in rows] == [
        {"number": "-55.000", "currency": "USD", "inferred": True},
        {"number": "-9.999999999999999999999999999", "currency": "USD", "inferred": True},
    ]

    replayed = _replay(tmp_path, book, rows)

    assert _data(replayed)["written"] == 2
    assert _appended(book, before).count("\n  Assets:Cash  USD\n") == 2
    assert _bea(tmp_path, book, "check").returncode == 0
    assert _cash(tmp_path, book) == "870.00"


def test_a_plain_omitted_leg_and_an_inferred_gain_replay_unchanged_in_value(tmp_path: Path) -> None:
    book = _book(tmp_path, "Buy", "Lunch", "Sale")
    before = book.read_text()
    lunch, sale = _listed(tmp_path, book, "Lunch"), _listed(tmp_path, book, "Sale")
    assert lunch["postings"][1]["units"] == {"number": "-12.50", "currency": "USD", "inferred": True}
    assert sale["postings"][2]["units"]["inferred"] is True
    assert ["inferred" in p["units"] for p in sale["postings"]] == [False, False, True]

    replayed = _replay(tmp_path, book, [lunch, sale])

    assert _data(replayed)["written"] == 2
    added = _appended(book, before)
    assert "\n  Assets:Cash  USD\n" in added
    assert "\n  Income:Gains  USD\n" in added
    assert _bea(tmp_path, book, "check").returncode == 0
    assert _cash(tmp_path, book) == "955.00"


def test_an_edited_row_with_a_stale_inferred_leg_is_refused(tmp_path: Path) -> None:
    book = _book(tmp_path, "Lunch")
    before = book.read_text()
    row = _listed(tmp_path, book, "Lunch")
    row["postings"][0]["units"]["number"] = "20.00"

    replayed = _replay(tmp_path, book, [row])

    assert replayed.returncode == 1
    message = " ".join(replayed.stderr.split())
    assert "Row 1, postings.1.units: states -12.50 USD as inferred, but booking infers -20.00 USD" in message
    assert book.read_text() == before


def test_stated_units_and_several_open_legs_list_and_replay_unmarked(tmp_path: Path) -> None:
    book = _book(tmp_path, "Costed", "Split", "Groups")
    before = book.read_text()
    rows = [_listed(tmp_path, book, narration) for narration in ("Costed", "Split", "Groups")]
    # An interpolated cost leaves the stated quantity alone, and bulk input
    # lets one posting per row omit its number: a line booked as two, or two
    # open lines, keep their stated numbers.
    assert all("inferred" not in p["units"] for row in rows for p in row["postings"])
    assert [len(row["postings"]) for row in rows] == [2, 4, 4]

    replayed = _replay(tmp_path, book, rows)

    assert _data(replayed)["written"] == 3
    added = _appended(book, before)
    for posting in ("Assets:Wallet -10.00 USD", "Assets:Wallet -5.00 EUR", "Assets:Euro -3.00 EUR"):
        assert re.search(r"\n  " + r"\s+".join(map(re.escape, posting.split())) + r"\n", added), posting
    assert _bea(tmp_path, book, "check").returncode == 0


def test_details_still_show_an_inferred_leg_with_its_amount(tmp_path: Path) -> None:
    book = _book(tmp_path, "Buy", "Lunch")

    listed = _bea(tmp_path, book, "list", "transaction", "--details", json_output=False)

    assert listed.returncode == 0, listed.stderr
    # `--details` shows the booked amounts, as documented; only the JSON
    # listing marks them for a replay.
    assert re.search(r"\n  Assets:Cash\s+-99\.99999999999999999999999999 USD\n", listed.stdout), listed.stdout
    assert re.search(r"\n  Assets:Cash\s+-12\.50 USD\n", listed.stdout), listed.stdout
