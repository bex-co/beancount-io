"""Write remedies follow the actual assertion and balancing legs (w5/660)."""

import json
import shlex
from pathlib import Path

import pytest
from click.testing import Result
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
OPENS = (
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Equity:Opening USD\n"
    "2026-01-01 open Expenses:Dining\n"
    "2026-01-01 open Expenses:Other\n"
    "2026-01-01 open Assets:Broker\n"
    "2026-01-01 open Liabilities:CreditCard USD\n"
)


def _diagnostic(result: Result, json_output: bool) -> str:
    if json_output:
        error = json.loads(result.stderr)["error"]
        return " ".join([error["message"], *error.get("details", [])])
    return " ".join(result.output.split())


@pytest.mark.parametrize("pad", [False, True])
@pytest.mark.parametrize("json_output", [False, True])
def test_a_forced_conflicting_balance_never_recommends_another_balance_with_a_pad(
    tmp_path: Path, pad: bool, json_output: bool
) -> None:
    # Refused before staging since w1/366: Beancount allows one balance number
    # per account, currency and day, so the remedy is the existing line.
    root = tmp_path / "main.bean"
    original = OPENS + "2026-01-25 balance Assets:Cash 0 USD\n"
    root.write_text(original)

    result = runner.invoke(
        app,
        [
            *(["--json"] if json_output else []),
            "--file", str(root), "add", "balance", "--date", "2026-01-25",
            "-a", "Assets:Cash", "--amount", "7 USD", "--force",
            *(["--pad-from", "Equity:Opening"] if pad else []),
        ],
    )  # fmt: skip

    assert result.exit_code == 4, result.output
    text = _diagnostic(result, json_output)
    assert f"correct or delete the assertion at {root}:7 instead" in text
    assert "--force" not in text
    assert "Opening adjustment command" not in text
    assert "--pad-from SOURCE_ACCOUNT" not in text
    assert root.read_text() == original


@pytest.mark.parametrize(
    ("legs", "examples", "corrected"),
    [
        (
            ["Expenses:Dining 45 EUR @ 1.1 GBP"],
            ["'Expenses:Dining 45 EUR @ RATE USD'"],
            ["Expenses:Dining 45 EUR @ 1.2 USD"],
        ),
        (
            ['Assets:Broker 2 HOOL {10 EUR, 2026-01-01, "lot one"}'],
            ["'Assets:Broker 2 HOOL {COST USD, 2026-01-01, \"lot one\"}'"],
            ['Assets:Broker 2 HOOL {12 USD, 2026-01-01, "lot one"}'],
        ),
        (
            ['Assets:Broker 2 HOOL {10 EUR, 2026-01-01, "O\'Reilly"}'],
            [shlex.quote('Assets:Broker 2 HOOL {COST USD, 2026-01-01, "O\'Reilly"}')],
            ['Assets:Broker 2 HOOL {12 USD, 2026-01-01, "O\'Reilly"}'],
        ),
        (
            ["Expenses:Dining 45 EUR", "Expenses:Other 5 EUR"],
            ["'Expenses:Dining 45 EUR @ RATE USD'", "'Expenses:Other 5 EUR @ RATE USD'"],
            ["Expenses:Dining 45 EUR @ 1.2 USD", "Expenses:Other 5 EUR @ 1.2 USD"],
        ),
        (
            ["Assets:Broker 2 HOOL {10 EUR}", "Expenses:Other 5 EUR"],
            ["'Assets:Broker 2 HOOL {COST USD, 2026-01-05}'", "'Expenses:Other 5 EUR @ RATE USD'"],
            ["Assets:Broker 2 HOOL {12 USD, 2026-01-05}", "Expenses:Other 5 EUR @ 1.2 USD"],
        ),
    ],
    ids=["third-currency-price", "cost-with-lot", "shell-quoted-lot", "two-priced-legs", "mixed-cost-and-price"],
)
@pytest.mark.parametrize("json_output", [False, True])
def test_inferred_currency_advice_names_all_actual_weight_contributors(
    tmp_path: Path, legs: list[str], examples: list[str], corrected: list[str], json_output: bool
) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS)
    prefix = [*(["--json"] if json_output else []), "--file", str(root)]

    def add(postings: list[str]) -> Result:
        args = [*prefix, "add", "transaction", "Dinner", "--date", "2026-01-05"]
        for leg in [*postings, "Liabilities:CreditCard"]:
            args.extend(["-p", leg])
        return runner.invoke(app, args)

    refused = add(legs)

    assert refused.exit_code == 1, refused.output
    text = _diagnostic(refused, json_output)
    for example in examples:
        assert example in text
    assert "'NUMBER " not in text
    if any("COST USD" in example for example in examples):
        assert "record the cost in USD" in text
    assert root.read_text() == OPENS
    # Replacing the placeholders with actual rates/costs yields valid advice.
    accepted = add(corrected)
    assert accepted.exit_code == 0, accepted.output
    assert runner.invoke(app, ["--file", str(root), "check"]).exit_code == 0


@pytest.mark.parametrize("price", ["@ 0.909 EUR", "@@ 45 EUR"])
@pytest.mark.parametrize("mode", ["text", "json", "bulk"])
def test_a_leg_already_in_the_account_currency_is_told_to_drop_its_price(tmp_path: Path, price: str, mode: str) -> None:
    """A USD leg priced in EUR is never told to price itself in USD (w1/276)."""
    root = tmp_path / "main.bean"
    root.write_text(OPENS)
    leg = f"Expenses:Dining 49.50 USD {price}"
    if mode == "bulk":
        rows = tmp_path / "rows.json"
        number, currency = price.split()[1:]
        # The QA row's shape: a per-unit price object; a total price rides in the amount.
        priced = (
            {"amount": f"49.50 USD {price}"}
            if "@@" in price
            else {"amount": "49.50 USD", "price": {"number": number, "currency": currency}}
        )
        rows.write_text(
            json.dumps(
                [
                    {
                        "date": "2026-01-05",
                        "narration": "Dinner",
                        "postings": [{"account": "Expenses:Dining", **priced}, {"account": "Liabilities:CreditCard"}],
                    }
                ]
            )
        )
        args = ["--json", "--file", str(root), "add", "transactions", "--from", str(rows)]
    else:
        args = [*(["--json"] if mode == "json" else []), "--file", str(root), "add", "transaction", "Dinner"]
        args += ["--date", "2026-01-05", "-p", leg, "-p", "Liabilities:CreditCard"]

    refused = runner.invoke(app, args)

    assert refused.exit_code == 1, refused.output
    if mode == "bulk":
        text = " ".join((refused.stdout + refused.stderr).split())
    else:
        text = _diagnostic(refused, mode == "json")
    assert "drop the EUR price from 'Expenses:Dining 49.50 USD', which is already in USD" in text
    assert "'Expenses:Dining NUMBER EUR @ RATE USD'" in text
    assert "USD @ RATE USD" not in text
    assert root.read_text() == OPENS
    # Both remedies are valid: dropping the price, or recording the EUR amount at a rate.
    for corrected in ["Expenses:Dining 49.50 USD", "Expenses:Dining 45 EUR @ 1.1 USD"]:
        command = ["add", "transaction", "Dinner", "--date", "2026-01-05", "-p", corrected]
        accepted = runner.invoke(app, ["--file", str(root), *command, "-p", "Liabilities:CreditCard"])
        assert accepted.exit_code == 0, accepted.output
    assert runner.invoke(app, ["--file", str(root), "check"]).exit_code == 0


@pytest.mark.parametrize("json_output", [False, True])
def test_a_sale_keeps_the_held_lots_cost_currency(tmp_path: Path, json_output: bool) -> None:
    root = tmp_path / "main.bean"
    original = OPENS + ('2026-01-02 * "Buy"\n  Assets:Broker 2 HOOL {10 EUR}\n  Expenses:Other\n')
    root.write_text(original)
    prefix = [*(["--json"] if json_output else []), "--file", str(root)]
    sale = ["add", "transaction", "Sell", "--date", "2026-01-05", "-p", "Assets:Broker -2 HOOL {10 EUR}", "-p"]

    refused = runner.invoke(app, [*prefix, *sale, "Assets:Cash"])

    assert refused.exit_code == 1, refused.output
    text = _diagnostic(refused, json_output)
    assert "keep the recorded EUR cost of an existing Assets:Broker lot" in text
    assert "explicit settlement and FX postings" in text
    assert "COST USD" not in text
    assert root.read_text() == original
    # A price on explicit USD settlement balances the original EUR cost lot.
    accepted = runner.invoke(app, [*prefix, *sale, "Assets:Cash 40 USD @ 0.5 EUR"])
    assert accepted.exit_code == 0, accepted.output
    assert runner.invoke(app, ["--file", str(root), "check"]).exit_code == 0


@pytest.mark.parametrize("missing_amount", [False, True])
def test_partial_postings_do_not_crash_the_inferred_currency_advice(missing_amount: bool) -> None:
    from decimal import Decimal
    from types import SimpleNamespace

    from beancount.core.amount import Amount
    from beancount.core.data import Posting
    from beancount.core.number import MISSING

    from bea_engine.ledger.write import _interpolated_leg_hint

    entry = SimpleNamespace(
        postings=[
            Posting("Assets:Cash", Amount(Decimal(-20), "EUR"), None, None, None, {"__automatic__": True}),
            Posting("Expenses:Dining", Amount(MISSING, "EUR") if missing_amount else None, None, None, None, {}),
        ]
    )

    hint = _interpolated_leg_hint(entry, "Assets:Cash", "EUR", SimpleNamespace(currencies=["USD"]))

    assert hint is not None
    assert "review the other legs' prices and costs in USD" in hint
    assert "NUMBER" not in hint


@pytest.mark.parametrize("space", ["\u00a0", "\u2009", "\u202f", "\u3000"])
@pytest.mark.parametrize("tolerance", [False, True])
@pytest.mark.parametrize("json_output", [False, True])
def test_balance_amounts_accept_unicode_space_separators(
    tmp_path: Path, space: str, tolerance: bool, json_output: bool
) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS)
    amount = f"0{space}~{space}0.5{space}USD" if tolerance else f"0{space}USD"
    prefix = [*(["--json"] if json_output else []), "--file", str(root)]
    command = ["add", "balance", "--date", "2026-01-02", "-a", "Assets:Cash", "--amount"]

    result = runner.invoke(app, [*prefix, *command, amount])

    assert result.exit_code == 0, result.output
    assert space not in root.read_text()
    normalized = "0 ~ 0.5 USD" if tolerance else "0 USD"
    assert normalized in root.read_text()
    after = root.read_bytes()
    repeated = runner.invoke(app, [*prefix, *command, normalized])
    assert repeated.exit_code == 0, repeated.output
    assert root.read_bytes() == after
    if json_output:
        assert json.loads(repeated.stdout)["data"]["duplicate"] is True


@pytest.mark.parametrize("separator", ["\n", "\r", "\u2028", "\u2029", "\u0085"])
def test_line_and_control_separators_are_still_refused(tmp_path: Path, separator: str) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS)

    result = runner.invoke(
        app,
        [
            "--file",
            str(root),
            "add",
            "balance",
            "--date",
            "2026-01-02",
            "-a",
            "Assets:Cash",
            "--amount",
            f"0{separator}USD",
        ],
    )

    assert result.exit_code == 2, result.output
    assert root.read_text() == OPENS
