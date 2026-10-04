"""The ledger must hold the value, sign and commodity that were asked for (w3/m49).

Every assertion here reads the written file back through Beancount, because the
bugs these cover all passed `bea check`: the printed preview and the JSON answer
said one thing and the parsed ledger meant another.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest
from beancount import loader
from beancount.core.data import Custom, Transaction

ROOT = Path(__file__).resolve().parents[1]

LOT_LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Brokerage
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-01 * "Fund"
  Assets:Cash  1000.00 USD
  Equity:Opening
2026-03-01 * "Buy"
  Assets:Brokerage  10 HOOL {100.00 USD}
  Assets:Cash  -1000.00 USD
"""

CUSTOM_LEDGER = 'option "operating_currency" "USD"\n2024-01-01 open Expenses:Food USD\n'


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """One `bea` run in a fresh process with its own config, cache and data dirs."""
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
        timeout=60,
    )


def _reloaded_values(ledger: Path) -> list[list[Any]]:
    """Every custom directive's values, as Beancount reads them back."""
    entries, errors, _ = loader.load_file(ledger)
    assert not errors, errors
    return [[value.value for value in entry.values] for entry in entries if isinstance(entry, Custom)]


class TestCustomNegativeValues:
    """`custom` values must reload as the values that were requested (w3/430)."""

    def test_a_negative_number_does_not_merge_into_the_number_before_it(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(CUSTOM_LEDGER)

        result = _bea(
            tmp_path,
            "--file",
            str(ledger),
            "add",
            "custom",
            "--date",
            "2024-02-05",
            "--type",
            "budget",
            "-v",
            "number:5",
            "-v",
            "number:-2",
        )

        assert result.returncode == 0, result.stderr
        # `5 -2` is a subtraction to Beancount's grammar and used to reload as 3.
        assert _reloaded_values(ledger) == [[Decimal("5"), Decimal("-2")]]

    def test_a_negative_amount_stays_its_own_value(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(CUSTOM_LEDGER)

        result = _bea(
            tmp_path,
            "--file",
            str(ledger),
            "add",
            "custom",
            "--date",
            "2024-02-06",
            "--type",
            "target",
            "-v",
            "account:Expenses:Food",
            "-v",
            "number:100",
            "-v",
            "amount:-20 USD",
        )

        assert result.returncode == 0, result.stderr
        values = _reloaded_values(ledger)[0]
        assert [str(value) for value in values] == ["Expenses:Food", "100", "-20 USD"]

    def test_positive_values_are_written_exactly_as_before(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(CUSTOM_LEDGER)

        result = _bea(
            tmp_path,
            "--file",
            str(ledger),
            "add",
            "custom",
            "--date",
            "2024-02-07",
            "--type",
            "budget",
            "-v",
            "text:monthly",
            "-v",
            "number:5",
            "-v",
            "amount:20.00 USD",
            "-v",
            "bool:true",
            "-v",
            "date:2024-03-01",
        )

        assert result.returncode == 0, result.stderr
        assert '2024-02-07 custom "budget" "monthly" 5 20.00 USD TRUE 2024-03-01' in ledger.read_text()

    def test_a_negative_number_after_a_boolean_also_reloads_whole(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(CUSTOM_LEDGER)

        result = _bea(
            tmp_path,
            "--file",
            str(ledger),
            "add",
            "custom",
            "--date",
            "2024-02-08",
            "--type",
            "budget",
            "-v",
            "bool:true",
            "-v",
            "number:-3",
        )

        assert result.returncode == 0, result.stderr
        assert _reloaded_values(ledger) == [[True, Decimal("-3")]]


class TestCostSpecWrites:
    """A cost constraint is written and reported as given (w3/414, w3/416)."""

    @pytest.mark.parametrize("spec", ["{}", "{2026-03-01}"])
    def test_a_currencyless_cost_appends_once_and_answers(self, tmp_path: Path, spec: str) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(LOT_LEDGER)

        result = _bea(
            tmp_path,
            "--json",
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2026-03-02",
            "--narration",
            "Sell",
            "-p",
            f"Assets:Brokerage -5 HOOL {spec}",
            "-p",
            "Assets:Cash 500.00 USD",
        )

        # The answer used to be encoded after the write: exit 1 with the entry
        # already appended, so every retry appended another sale.
        assert result.returncode == 0, result.stderr
        cost = json.loads(result.stdout)["data"]["directive"]["postings"][0]["cost"]
        assert cost["number"] is None and cost["number_total"] is None
        assert cost["currency"] is None
        entries, errors, _ = loader.load_file(ledger)
        assert not errors, errors
        assert sum(1 for e in entries if isinstance(e, Transaction) and e.narration == "Sell") == 1

    def test_a_currency_only_cost_is_never_relaxed_to_an_empty_one(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(LOT_LEDGER)

        result = _bea(
            tmp_path,
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2026-03-02",
            "--narration",
            "Sell",
            "-p",
            "Assets:Brokerage -5 HOOL {EUR}",
            "-p",
            "Assets:Cash 500.00 USD",
        )

        # {EUR} against a USD lot is what Beancount refuses; it used to be
        # written as {} instead, booking against the wrong lot.
        assert result.returncode == 1, result.stdout
        assert "No position matches" in result.stderr
        assert ledger.read_text() == LOT_LEDGER

    def test_a_matching_currency_only_cost_keeps_its_currency(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(LOT_LEDGER)

        result = _bea(
            tmp_path,
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2026-03-02",
            "--narration",
            "Sell",
            "-p",
            "Assets:Brokerage -5 HOOL {USD}",
            "-p",
            "Assets:Cash 500.00 USD",
        )

        assert result.returncode == 0, result.stderr
        assert "-5 HOOL {USD}" in ledger.read_text()

    def test_a_total_cost_round_trips_back_through_bulk_add(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(LOT_LEDGER)

        added = _bea(
            tmp_path,
            "--json",
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2026-03-03",
            "--narration",
            "Buy2",
            "-p",
            "Assets:Brokerage 2 HOOL {{250.00 USD}}",
            "-p",
            "Assets:Cash -250.00 USD",
        )

        assert added.returncode == 0, added.stderr
        directive = json.loads(added.stdout)["data"]["directive"]
        cost = directive["postings"][0]["cost"]
        # It used to report the parser's per-unit zero, which reloaded as a
        # transaction that does not balance.
        assert cost["number"] is None
        assert cost["number_total"] == "250.00"

        ledger.write_text(LOT_LEDGER)
        rows = tmp_path / "rows.json"
        rows.write_text(
            json.dumps(
                [{"date": directive["date"], "narration": directive["narration"], "postings": directive["postings"]}]
            )
        )
        bulk = _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(rows))

        assert bulk.returncode == 0, bulk.stderr
        entries, errors, _ = loader.load_file(ledger)
        assert not errors, errors
        posting = next(p for e in entries if isinstance(e, Transaction) and e.narration == "Buy2" for p in e.postings)
        assert posting.cost.number == Decimal("125.00")

    @pytest.mark.parametrize("cash", [[], ["-p", "Assets:Cash -250.00 USD"]], ids=["inferred-cash", "explicit-cash"])
    def test_a_total_cost_answer_with_an_inferred_leg_round_trips(self, tmp_path: Path, cash: list[str]) -> None:
        """w1/092: `number: null` beside a total is the total cost `{{...}}`, not `{# ...}`.

        Written as `{# total}`, the per-unit cost was left to interpolate, so
        with an amount-less cash leg Beancount had two unknowns and refused it.
        """
        ledger = tmp_path / "main.bean"
        ledger.write_text(LOT_LEDGER)
        added = _bea(
            tmp_path,
            *("--json", "--file", str(ledger), "add", "transaction", "--date", "2026-03-03"),
            *("--narration", "Buy2", "-p", "Assets:Brokerage 2 HOOL {{250.00 USD}}"),
            *(cash or ["-p", "Assets:Cash"]),
        )
        assert added.returncode == 0, added.stderr
        first = ledger.read_text()[len(LOT_LEDGER) :]
        directive = json.loads(added.stdout)["data"]["directive"]

        ledger.write_text(LOT_LEDGER)
        rows = tmp_path / "rows.json"
        fields = ("date", "narration", "postings")
        rows.write_text(json.dumps([{key: directive[key] for key in fields}]))
        bulk = _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(rows))

        assert bulk.returncode == 0, bulk.stderr
        assert ledger.read_text()[len(LOT_LEDGER) :] == first
        assert "{0 # 250.00 USD}" in first
        entries, errors, _ = loader.load_file(ledger)
        assert not errors, errors
        posting = next(p for e in entries if isinstance(e, Transaction) and e.narration == "Buy2" for p in e.postings)
        assert posting.cost.number == Decimal("125.00")

    def test_nothing_is_written_when_the_answer_cannot_be_encoded(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The write must follow the answer, not the other way round."""
        from bea_engine import protocol
        from bea_engine.ledger import adding

        ledger = tmp_path / "main.bean"
        ledger.write_text(LOT_LEDGER)

        def explode(value: Any) -> Any:
            raise TypeError("Object of type type is not JSON serializable")

        monkeypatch.setattr(protocol, "jsonable", explode)
        with pytest.raises(TypeError):
            adding.answer(
                ledger,
                "transaction",
                {
                    "date": "2026-03-02",
                    "narration": "Sell",
                    "postings": ["Assets:Brokerage -5 HOOL {}", "Assets:Cash 500.00 USD"],
                },
            )

        assert ledger.read_text() == LOT_LEDGER
