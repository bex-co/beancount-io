"""Reciprocal-price checks share one rule across `add price` and import (w5/741).

`add price` refused a disagreeing same-day reciprocal, but import wrote one
— against a recorded quote and against an earlier row of the same import —
though IMPORTING.md says a price follows `add price`. A quote losing its
day to an `implicit_prices` reciprocal was written silently though no read
uses it. And "agrees" meant the product is exactly 1, so `0.3333` beside
`3` was refused though it names the same rate at its typed precision.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

HEADER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:EUR EUR
2026-01-01 open Equity:Opening
"""

IMPORTER = """\
import datetime
from decimal import Decimal
from beancount.core import amount, data


class Quotes:
    name = "quotes"

    def identify(self, filepath):
        return filepath.endswith("quotes.txt")

    def account(self, filepath):
        return "Assets:Broker"

    def extract(self, filepath, existing):
        out = []
        for line, text in enumerate(open(filepath).read().split(), start=1):
            day, base, number, cur = text.split("=")
            out.append(
                data.Price(
                    data.new_metadata(filepath, line),
                    datetime.date.fromisoformat(day),
                    base,
                    amount.Amount(Decimal(number), cur),
                )
            )
        return out


CONFIG = [Quotes()]
"""

IMPLIED = """\
option "operating_currency" "USD"
plugin "beancount.plugins.implicit_prices"
2026-01-01 open Assets:EUR EUR
2026-01-01 open Assets:USD USD
2026-01-01 open Equity:Opening
2026-01-02 * "Fund"
  Assets:EUR  1000.00 EUR
  Equity:Opening
2026-01-05 * "Buy USD with EUR"
  Assets:USD  100.00 USD @ 0.80 EUR
  Equity:Opening
"""


def _add(tmp_path: Path, ledger: str, *args: str) -> tuple[Any, Path]:
    path = tmp_path / "main.bean"
    path.write_text(ledger)
    result = runner.invoke(app, ["--file", str(path), "add", "price", *args])
    return result, path


def test_import_refuses_a_reciprocal_of_a_recorded_quote(tmp_path: Path) -> None:
    path = tmp_path / "main.bean"
    ledger = HEADER + "2026-01-05 price USD 0.80 EUR\n"
    path.write_text(ledger)
    (tmp_path / "imp.py").write_text(IMPORTER)
    (tmp_path / "quotes.txt").write_text("2026-01-05=EUR=1.20=USD")

    result = runner.invoke(
        app,
        [
            "--json",
            "--no-input",
            "--file",
            str(path),
            "import",
            str(tmp_path / "quotes.txt"),
            "--config",
            str(tmp_path / "imp.py"),
            "--apply",
        ],
    )

    assert result.exit_code == 4, result.output
    body = json.loads(result.output)
    (detail,) = body["error"]["details"]
    assert "USD already has a 2026-01-05 price of 0.80 EUR" in detail, detail
    assert "the other direction of this pair; refusing 1.20 USD" in detail, detail
    assert path.read_text() == ledger


def test_two_reciprocal_rows_in_one_import_conflict(tmp_path: Path) -> None:
    path = tmp_path / "main.bean"
    path.write_text(HEADER)
    (tmp_path / "imp.py").write_text(IMPORTER)
    (tmp_path / "quotes.txt").write_text("2026-01-05=EUR=1.20=USD 2026-01-05=USD=0.80=EUR")

    result = runner.invoke(
        app,
        [
            "--json",
            "--no-input",
            "--file",
            str(path),
            "import",
            str(tmp_path / "quotes.txt"),
            "--config",
            str(tmp_path / "imp.py"),
            "--apply",
        ],
    )

    assert result.exit_code == 4, result.output
    (detail,) = json.loads(result.output)["error"]["details"]
    assert "at row 1 of this import, the other direction of this pair" in detail, detail
    assert path.read_text() == HEADER


def test_agreeing_reciprocal_rows_are_written(tmp_path: Path) -> None:
    path = tmp_path / "main.bean"
    path.write_text(HEADER)
    (tmp_path / "imp.py").write_text(IMPORTER)
    (tmp_path / "quotes.txt").write_text("2026-01-05=USD=0.80=EUR 2026-01-05=EUR=1.25=USD")

    result = runner.invoke(
        app,
        [
            "--file",
            str(path),
            "import",
            str(tmp_path / "quotes.txt"),
            "--config",
            str(tmp_path / "imp.py"),
            "--apply",
        ],
    )

    assert result.exit_code == 0, result.output
    assert path.read_text().count("2026-01-05 price") == 2


def test_a_quote_losing_to_an_implied_price_warns_and_is_unused(tmp_path: Path) -> None:
    result, path = _add(tmp_path, IMPLIED, "--date", "2026-01-05", "-c", "EUR", "--amount", "1.20 USD")

    assert result.exit_code == 0, result.output
    assert "USD already has a 2026-01-05 price of 0.80 EUR implied at " in result.output, result.output
    assert "main.bean:9" in result.output, result.output
    assert "so the new quote is never used" in result.output, result.output

    balance = runner.invoke(app, ["--json", "--file", str(path), "balance", "Assets:EUR"])
    assert balance.exit_code == 0, balance.output
    assert "1250.00" in balance.output, balance.output


def test_a_quote_winning_against_an_implied_price_does_not_warn(tmp_path: Path) -> None:
    ledger = """\
option "operating_currency" "USD"
plugin "beancount.plugins.implicit_prices"
2026-01-01 open Assets:EUR EUR
2026-01-01 open Assets:USD USD
2026-01-01 open Equity:Opening
2026-01-05 * "Buy EUR with USD"
  Assets:EUR  125.00 EUR @ 1.20 USD
  Equity:Opening
"""
    result, _ = _add(tmp_path, ledger, "--date", "2026-01-05", "-c", "USD", "--amount", "0.80 EUR")

    assert result.exit_code == 0, result.output
    assert "never used" not in result.output, result.output


def test_agreement_is_judged_at_the_typed_precision(tmp_path: Path) -> None:
    result, path = _add(
        tmp_path,
        HEADER + "2026-01-05 price USD 3 EUR\n",
        "--date",
        "2026-01-05",
        "-c",
        "EUR",
        "--amount",
        "0.3333 USD",
    )

    assert result.exit_code == 0, result.output
    assert "0.3333 USD" in path.read_text()

    result, _ = _add(
        tmp_path,
        HEADER + "2026-01-05 price EUR 1.0857 USD\n",
        "--date",
        "2026-01-05",
        "-c",
        "USD",
        "--amount",
        "0.9211 EUR",
    )

    assert result.exit_code == 0, result.output


def test_a_coarse_reciprocal_must_round_trip_both_ways(tmp_path: Path) -> None:
    # `1 EUR` passed beside `EUR 1.90 USD` because 1/1.90 rounds to 1 at one
    # digit, and then won the day and revalued the holding by 47 %, while
    # the same rate typed `1.0 EUR` was refused (w1/335).
    ledger = HEADER + "".join(f"2026-01-0{day} price EUR 1.90 USD\n" for day in (3, 4, 5))
    for typed in ("1 EUR", "1.0 EUR"):
        result, path = _add(tmp_path, ledger, "--date", "2026-01-05", "-c", "USD", "--amount", typed)

        assert result.exit_code == 4, (typed, result.output)
        assert f"{typed} disagrees with it" in result.output, result.output
        assert path.read_text() == ledger


def test_a_coarse_reciprocal_is_refused_whichever_quote_came_first(tmp_path: Path) -> None:
    ledger = HEADER + "2026-01-05 price USD 1 EUR\n"
    result, path = _add(tmp_path, ledger, "--date", "2026-01-05", "-c", "EUR", "--amount", "1.90 USD")

    assert result.exit_code == 4, result.output
    assert "1.90 USD disagrees with it" in result.output, result.output
    assert path.read_text() == ledger


def test_a_rounded_reciprocal_still_agrees_both_ways(tmp_path: Path) -> None:
    for recorded, currency, typed in (
        ("EUR 1.12 USD", "USD", "0.89 EUR"),
        ("EUR 1.12 USD", "USD", "0.8929 EUR"),
        ("USD 3 EUR", "EUR", "0.3333 USD"),
    ):
        ledger = HEADER + f"2026-01-05 price {recorded}\n"
        result, path = _add(tmp_path, ledger, "--date", "2026-01-05", "-c", currency, "--amount", typed)

        assert result.exit_code == 0, (recorded, typed, result.output)
        number, quote = typed.split()
        assert any(line.split()[2:] == [currency, number, quote] for line in path.read_text().splitlines()), (
            path.read_text()
        )


def test_import_refuses_a_coarse_reciprocal_of_a_recorded_quote(tmp_path: Path) -> None:
    path = tmp_path / "main.bean"
    ledger = HEADER + "2026-01-05 price EUR 1.90 USD\n"
    path.write_text(ledger)
    (tmp_path / "imp.py").write_text(IMPORTER)
    (tmp_path / "quotes.txt").write_text("2026-01-05=USD=1=EUR")

    result = runner.invoke(
        app,
        [
            "--json",
            "--no-input",
            "--file",
            str(path),
            "import",
            str(tmp_path / "quotes.txt"),
            "--config",
            str(tmp_path / "imp.py"),
            "--apply",
        ],
    )

    assert result.exit_code == 4, result.output
    (detail,) = json.loads(result.output)["error"]["details"]
    assert "EUR already has a 2026-01-05 price of 1.90 USD" in detail, detail
    assert "the other direction of this pair; refusing 1 EUR" in detail, detail
    assert path.read_text() == ledger
