"""A moved existing missing-commodity error cannot spend a new currency's refusal (w5/663)."""

import json
from pathlib import Path

import pytest
from click.testing import Result
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
OPENS = (
    'plugin "beancount.plugins.check_commodity"\n'
    "2026-01-01 commodity USD\n"
    "2026-01-01 open Assets:Bank\n"
    "2026-01-01 open Assets:Zed\n"
    "2026-01-01 open Equity:Opening\n"
)


def _ledger(tmp_path: Path, existing: list[str]) -> Path:
    root = tmp_path / "main.bean"
    root.write_text(
        OPENS
        + "".join(
            f'2026-01-02 * "Fund {currency}"\n  Assets:Zed 100 {currency}\n  Equity:Opening\n' for currency in existing
        )
    )
    return root


def _add(root: Path, currency: str, json_output: bool) -> Result:
    # Priced in another, declared commodity: a rate in its own is refused (w1/278).
    quote = "USD" if currency == "EUR" else "EUR"
    return runner.invoke(
        app,
        [
            *(["--json"] if json_output else []), "--file", str(root), "add", "transaction", "FX",
            "--date", "2026-01-05", "-p", f"Assets:Bank 100 {currency} @ 1.05 {quote}",
            "-p", f"Assets:Bank -105 {quote}", "--allow-errors",
        ],
    )  # fmt: skip


@pytest.mark.parametrize("existing", [["EUR"], ["EUR", "JPY"]], ids=["one-old-gap", "two-old-gaps"])
@pytest.mark.parametrize("currency", ["CHF", "GBP"])
@pytest.mark.parametrize("json_output", [False, True])
def test_refusal_names_the_new_currency_regardless_of_sort_order(
    tmp_path: Path, existing: list[str], currency: str, json_output: bool
) -> None:
    root = _ledger(tmp_path, existing)
    before = root.read_bytes()

    result = _add(root, currency, json_output)

    assert result.exit_code == 1, result.output
    if json_output:
        error = json.loads(result.stderr)["error"]
        details = " ".join(error["details"])
        warnings = " ".join(error["ledger_warnings"])
        for old in existing:
            assert f"Missing Commodity directive for '{old}'" in warnings
            assert f"Missing Commodity directive for '{old}'" not in details
        assert f"Missing Commodity directive for '{currency}'" not in warnings
    else:
        details = " ".join(result.output.split())
    assert f"Proposed append (not written): Missing Commodity directive for '{currency}'" in details
    assert f"--currency {currency}, then retry" in details
    assert "--currency EUR, then retry" not in details
    assert root.read_bytes() == before
    # Following the one new-currency remedy makes this retry succeed; the
    # unchanged existing currency failures remain tolerated.
    declared = runner.invoke(
        app,
        ["--file", str(root), "add", "commodity", "--date", "2026-01-01", "--currency", currency, "--allow-errors"],
    )
    assert declared.exit_code == 0, declared.output
    applied = _add(root, currency, json_output)
    assert applied.exit_code == 0, applied.output
    assert '2026-01-05 * "FX"' in root.read_text()


def test_an_old_currency_can_still_move_to_another_account_without_a_new_gap(tmp_path: Path) -> None:
    root = _ledger(tmp_path, ["EUR"])

    result = _add(root, "EUR", True)

    assert result.exit_code == 0, result.output
    warnings = " ".join(json.loads(result.stdout)["data"]["warnings"])
    assert "Missing Commodity directive for 'EUR' in 'Assets:Bank'" in warnings
