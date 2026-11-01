"""A sale's lot label selects its lot raw, and the add answer echoes the written label (w5/733).

w5/542 escapes control characters in lot labels, but applied it to
reduction selectors too: a sale for a tab-labelled lot was rendered with
an escaped label that matched nothing, and the sought and held labels
printed identically so the refusal could not be understood. Reductions
now match — and write — their label exactly as typed. The JSON answer
meanwhile echoed the pre-normalization entry, reporting the raw label
while the file held the escaped one; it is built from the normalized
entry now.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from bea_engine import managed_load, protocol
from bea_engine.ledger import adding

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Assets:Brokerage\n"
    "2026-01-01 open Income:Gains USD\n"
    '2026-01-10 * "Buy"\n'
    '  Assets:Brokerage  10 HOOL {40 USD, "lot\tA"}\n'
    "  Assets:Checking  -400 USD\n"
)
TAB_SALE = [
    'Assets:Brokerage -10 HOOL {"lot\tA"} @ 50 USD',
    "Assets:Checking 500 USD",
    "Income:Gains",
]


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _gains(entries: list[Any]) -> Any:
    return sum(
        posting.units.number
        for entry in entries
        if hasattr(entry, "postings")
        for posting in entry.postings
        if posting.account == "Income:Gains"
    )


def test_a_sale_selects_its_tab_labelled_lot(ledger: Path) -> None:
    result = adding.answer(
        ledger, "transaction", {"date": "2026-02-01", "narration": "Sell tab lot", "postings": TAB_SALE}
    )

    assert result["written"] == 1
    written = ledger.read_text(encoding="utf-8")
    # Buy and sale lines both spell the raw tab.
    assert written.count("lot\tA") == 2, written
    entries, errors, _ = managed_load.load_file(ledger)
    assert errors == []
    sale = next(entry for entry in entries if getattr(entry, "narration", None) == "Sell tab lot")
    assert sale.postings[0].cost.number == 40
    assert _gains(entries) == -100


def test_a_bulk_sale_selects_its_tab_labelled_lot(ledger: Path) -> None:
    result = adding.answer(
        ledger,
        "transactions",
        {
            "rows": [
                {
                    "date": "2026-02-01",
                    "narration": "Sell tab lot",
                    "postings": [
                        {
                            "account": "Assets:Brokerage",
                            "units": {"number": "-10", "currency": "HOOL"},
                            "cost": {"number": "40", "currency": "USD", "label": "lot\tA"},
                            "price": {"number": "50", "currency": "USD"},
                        },
                        {"account": "Assets:Checking", "amount": "500 USD"},
                        {"account": "Income:Gains"},
                    ],
                }
            ]
        },
    )

    assert result["written"] == 1
    entries, errors, _ = managed_load.load_file(ledger)
    assert errors == []
    assert _gains(entries) == -100


def test_a_miss_spells_the_controls_and_suggests_cost_or_date(ledger: Path) -> None:
    postings = ['Assets:Brokerage -10 HOOL {"lot\tB"} @ 50 USD', *TAB_SALE[1:]]
    with pytest.raises(protocol.LedgerError) as raised:
        adding.answer(ledger, "transaction", {"date": "2026-02-01", "narration": "Sell", "postings": postings})

    detail = raised.value.details[0]
    assert 'the label holds control characters (escaped: "lot\\x09B")' in detail, detail
    assert "select the lot by its cost or date instead" in detail, detail


def test_the_answer_echoes_the_written_label(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2026-01-01 open Assets:Checking USD\n2026-01-01 open Assets:Brokerage\n'
    )
    label = "e\x1b[2JL\u202eX"

    result = adding.answer(
        ledger,
        "transaction",
        {
            "date": "2026-02-01",
            "narration": "buy",
            "postings": [f'Assets:Brokerage 1 HOOL {{5 USD, "{label}"}}', "Assets:Checking"],
        },
    )

    echoed = result["directive"]["postings"][0]["cost"]["label"]
    assert echoed == "e\\x1b[2JL\\u202eX", ascii(echoed)
    entries, errors, _ = managed_load.load_file(ledger)
    assert errors == []
    assert entries[-1].postings[0].cost.label == echoed


def test_a_sale_with_an_inferred_quantity_selects_its_newline_labelled_lot(tmp_path: Path) -> None:
    """The quantity is left to booking, so the sign is unknown and the label must stay as typed (w5/1085)."""
    path = tmp_path / "main.bean"
    path.write_text(LEDGER.replace("lot\tA", "lot\\nA"), encoding="utf-8")
    sale = {
        "date": "2026-02-01",
        "narration": "Sell inferred",
        "postings": [
            {
                "account": "Assets:Brokerage",
                "units": {"number": None, "currency": "HOOL"},
                "cost": {"number": "40", "currency": "USD", "label": "lot\nA"},
                "price": {"number": "50", "currency": "USD"},
            },
            {"account": "Assets:Checking", "amount": "500 USD"},
            {"account": "Income:Gains", "amount": "-100 USD"},
        ],
    }

    result = adding.answer(path, "transactions", {"rows": [sale]})

    assert result["written"] == 1
    entries, errors, _ = managed_load.load_file(path)
    assert errors == []
    held = [
        (posting.units.number, posting.cost.label)
        for entry in entries
        if hasattr(entry, "postings")
        for posting in entry.postings
        if posting.account == "Assets:Brokerage"
    ]
    # The sale reduced the labelled long lot rather than opening a lot labelled "lot A".
    assert sum(number for number, _ in held) == 0
    assert {label for _, label in held} == {"lot\nA"}
