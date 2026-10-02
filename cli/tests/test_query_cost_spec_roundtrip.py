"""Directive exports retain unbooked cost constraints as well as booked lots (w3/457)."""

from __future__ import annotations

from decimal import Decimal
from io import StringIO
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.amount import Amount
from beancount.core.data import Transaction
from beancount.parser import parser

from bea_engine.query import LEDGER_DSN, build_shell


@pytest.mark.parametrize(
    "cost",
    [
        "{EUR}",
        '{EUR, 2024-01-01, "sale lot"}',
        "{# 250.00 USD}",
        "{0 # 250.00 USD}",
        "{{250.00 USD}}",
        "{100 # USD}",
        "{0 # USD}",
        "{2.500000001 # 250.00 USD, 2024-01-01}",
        r'{# 250.00 USD, "lot\\A\"B"}',
    ],
)
def test_print_retains_unbooked_cost_fields(tmp_path: Path, cost: str) -> None:
    # Normal loading books CostSpec into Cost. Attach parser entries directly
    # to exercise the renderer's unbooked input without inventing a replacement
    # for the BQL executor, its result rows, or its formatter.
    ledger = tmp_path / "main.bean"
    ledger.write_text("")
    stream = StringIO()
    shell = build_shell(ledger, stream, show_errors=False)
    entries, errors, options = parser.parse_string(
        f'2024-01-02 * "sale"\n  Assets:Stock -2.000000001 STOCK {cost}\n  Assets:Cash 250.000000001 USD\n'
    )
    assert not errors, errors
    shell.context.attach(LEDGER_DSN, entries=entries, errors=errors, options=options)

    shell.onecmd("PRINT")

    exported = stream.getvalue()
    reloaded, errors, _ = parser.parse_string(exported)
    assert not errors, (exported, errors)
    original = next(entry for entry in entries if isinstance(entry, Transaction))
    actual = next(entry for entry in reloaded if isinstance(entry, Transaction))
    assert len(actual.postings) == len(original.postings)
    for before, after in zip(original.postings, actual.postings, strict=True):
        assert after.units == before.units
        assert after.cost == before.cost
        assert after.price == before.price


@pytest.mark.parametrize("render", ["query", "writer"])
@pytest.mark.parametrize(
    ("cost", "balancing"),
    [("{{250.00 USD}}", ""), ("{100 # USD}", " -250.00 USD")],
    ids=["fixed-total", "inferred-total"],
)
def test_cost_fields_still_interpolate_a_balanced_transaction(
    tmp_path: Path, render: str, cost: str, balancing: str
) -> None:
    from bea_engine.ledger.writer import format_entry

    header = "2024-01-01 open Assets:Stock\n2024-01-01 open Assets:Cash USD\n"
    source = f'2024-01-02 * "buy"\n  Assets:Stock 2 STOCK {cost}\n  Assets:Cash{balancing}\n'
    entries, errors, options = parser.parse_string(source)
    assert not errors, errors
    if render == "writer":
        exported = format_entry(entries[0])
    else:
        ledger = tmp_path / "main.bean"
        ledger.write_text(header)
        stream = StringIO()
        shell = build_shell(ledger, stream, show_errors=False)
        shell.context.attach(LEDGER_DSN, entries=entries, errors=errors, options=options)
        shell.onecmd("PRINT")
        exported = stream.getvalue()

    reloaded, errors, _ = loader.load_string(header + exported)
    assert not errors, (exported, errors)
    actual = next(entry for entry in reloaded if isinstance(entry, Transaction))
    assert actual.postings[0].cost.number == Decimal("125.00")
    assert actual.postings[1].units == Amount(Decimal("-250.00"), "USD")
