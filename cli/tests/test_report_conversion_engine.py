"""Conversion syntax is checked before ledger loading, even for helper callers."""

from __future__ import annotations

from pathlib import Path

import pytest

from cli.engine import launch
from cli.errors import UsageError


@pytest.mark.parametrize("conversion", ["at-cost", "usd", "US D", "A.", "X_", "1USD", "USD\n", "USD;hi", "", "  "])
@pytest.mark.parametrize("command", [["report", "--kind", "overview"], ["balance"]])
def test_helper_rejects_invalid_conversion_before_loading_a_broken_ledger(
    tmp_path: Path, conversion: str, command: list[str]
) -> None:
    ledger = tmp_path / "broken.bean"
    ledger.write_text("not beancount\n")

    with pytest.raises(UsageError, match="Invalid --conversion") as error:
        launch.helper_json([*command, "--file", str(ledger), "--conversion", conversion])

    assert error.value.exit_code == 2
    assert "units, at_cost, at_value" in str(error.value)
    assert "Ledger has" not in str(error.value)


@pytest.mark.parametrize("symbol", ["F", "A-B", "A" * 80, "/OIL"])
def test_report_retains_valid_beancount_commodity_symbols(tmp_path: Path, symbol: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        "2026-01-01 open Assets:Cash\n"
        "2026-01-01 open Equity:Opening\n"
        '2026-01-02 * "Start"\n'
        f"  Assets:Cash 10 {symbol}\n"
        "  Equity:Opening\n"
    )

    result = launch.helper_json(["report", "--file", str(ledger), "--kind", "balance-sheet", "--conversion", symbol])

    assert result["conversion"] == symbol
    assert result["net_worth"] == {symbol: "10"}
    assert result["missing_prices"] == []
