"""`bea init --opening-balance` names what is wrong with a refused value (w1/262).

Every refusal printed one message, "must be 'ACCOUNT NUMBER' for one of the
template's asset/liability accounts", whether the value had a trailing
currency, named an unknown account, or named an expense, and none of them
listed the accounts the new ledger accepts.

A currency after the amount is read as `--currency` reads it (w1/367): `eur`
was compared as typed against the upper-cased `--currency eur`, refused, and
told to pass the `--currency eur` that had just been refused.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

ROOT = Path(__file__).resolve().parents[1]
FIXED = "Opening balances accept: Assets:Checking, Assets:Savings, Assets:Cash, Liabilities:CreditCard."
PERSONAL = "Opening balances accept: Assets:Cash, Assets:Bank, Liabilities:CreditCard, Liabilities:Loan."


def _init(tmp_path: Path, *args: str, currency: str | None = "USD") -> subprocess.CompletedProcess[str]:
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
        [sys.executable, "-m", "cli.main", "--no-input", "init", "books", "--date", "2026-01-01"]
        + ([] if currency is None else ["--currency", currency])
        + list(args),
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )


@pytest.mark.parametrize(
    ("args", "message"),
    [
        (
            ["--opening-balance", "Assets:Bank:Checking 100"],
            "--opening-balance 'Assets:Bank:Checking 100': Assets:Bank:Checking is not an account the new ledger "
            f"opens. {FIXED}",
        ),
        (
            ["--opening-balance", "Expenses:Rent 10"],
            f"--opening-balance 'Expenses:Rent 10': Expenses:Rent is not an asset or liability account. {FIXED}",
        ),
        (
            ["--preset", "personal@1", "--opening-balance", "Assets:Nope 5"],
            f"--opening-balance 'Assets:Nope 5': Assets:Nope is not an account the new ledger opens. {PERSONAL}",
        ),
        (
            ["--opening-balance", "Assets:Checking 1000 EUR"],
            "--opening-balance 'Assets:Checking 1000 EUR': Opening balances are in the operating currency USD, "
            "not EUR.",
        ),
        (
            ["--opening-balance", "Assets:Checking"],
            "--opening-balance 'Assets:Checking': Expected 'ACCOUNT NUMBER' with the amount in the operating currency",
        ),
    ],
    ids=["unknown-account", "expense-account", "preset-unknown-account", "other-currency", "no-amount"],
)
def test_each_refusal_names_its_own_problem(tmp_path: Path, args: list[str], message: str) -> None:
    result = _init(tmp_path, *args)
    assert result.returncode == 2, result.stdout + result.stderr
    assert message in " ".join(result.stderr.split())
    assert not (tmp_path / "books").exists()


@pytest.mark.parametrize("value", ["Assets:Checking 1000", "Assets:Checking 1000 USD"])
def test_the_operating_currency_may_follow_the_amount(tmp_path: Path, value: str) -> None:
    result = _init(tmp_path, "--opening-balance", value)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "Assets:Checking          1000 USD" in (tmp_path / "books" / "main.bean").read_text(encoding="utf-8")


@pytest.mark.parametrize(
    ("currency", "value", "written"),
    [
        ("eur", "Assets:Checking 1000.50 eur", "Assets:Checking          1000.50 EUR"),
        ("usd", "Assets:Checking 1000.50 usd", "Assets:Checking          1000.50 USD"),
        ("EUR", "Assets:Checking 1000.50 Eur", "Assets:Checking          1000.50 EUR"),
        ("eur", "Assets:Checking 1000", "Assets:Checking          1000 EUR"),
    ],
    ids=["lowercase-eur", "lowercase-usd", "mixed-case", "no-currency"],
)
def test_the_stated_currency_reads_as_currency_reads_it(
    tmp_path: Path, currency: str, value: str, written: str
) -> None:
    result = _init(tmp_path, "--opening-balance", value, currency=currency)
    assert result.returncode == 0, result.stdout + result.stderr
    assert written in (tmp_path / "books" / "main.bean").read_text(encoding="utf-8")


@pytest.mark.parametrize(
    ("currency", "args", "message"),
    [
        (
            None,
            ["--opening-balance", "Assets:Checking 1000.50 eur"],
            "--opening-balance 'Assets:Checking 1000.50 eur': Give the amount without a currency ('ACCOUNT NUMBER'); "
            "it is in the operating currency. To write 'EUR', also pass --currency EUR.",
        ),
        (
            "EUR",
            ["--opening-balance", "Assets:Checking 1000 gbp"],
            "--opening-balance 'Assets:Checking 1000 gbp': Opening balances are in the operating currency EUR, "
            "not GBP. Use --currency GBP, or give the amount in EUR.",
        ),
        (
            "USD",
            ["--opening-balance", "Assets:Checking 1000 $"],
            "--opening-balance 'Assets:Checking 1000 $': Invalid operating currency: '$'. Use a symbol such as USD "
            "or EUR.",
        ),
        (
            "USD",
            ["--opening-balance", "Assets:Checking 1000 true"],
            "--opening-balance 'Assets:Checking 1000 true': Invalid operating currency: 'TRUE' is a reserved word",
        ),
        (
            "EUR",
            ["--preset", "personal@1", "--opening-balance", "Assets:Cash 100 btc"],
            "--opening-balance 'Assets:Cash 100 btc': Unsupported operating currency 'BTC' for a preset ledger.",
        ),
    ],
    ids=["no-currency-flag", "other-currency-lowercase", "not-a-symbol", "reserved-word", "preset-unsupported"],
)
def test_a_refused_stated_currency_suggests_only_what_works(
    tmp_path: Path, currency: str | None, args: list[str], message: str
) -> None:
    result = _init(tmp_path, *args, currency=currency)
    assert result.returncode == 2, result.stdout + result.stderr
    assert message in " ".join(result.stderr.split())
    assert not (tmp_path / "books").exists()


def test_the_checking_prompt_reads_a_trailing_currency(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """`1,000.50 eur` at the prompt was refused as a bad thousands separator."""
    monkeypatch.setattr("cli.context._stdin_is_a_terminal", lambda: True)
    monkeypatch.setattr("cli.context._stderr_is_a_terminal", lambda: True)
    destination = tmp_path / "books"

    result = CliRunner().invoke(
        app,
        ["init", str(destination), "--currency", "USD", "--date", "2026-01-01"],
        input="1,000.50 eur\n1,000.50 usd\n",
    )

    assert result.exit_code == 0, result.output
    assert "The opening balance is in the operating currency USD, not EUR; type the number alone" in result.output
    assert "thousands separator" not in result.output
    assert "Assets:Checking          1000.50 USD" in (destination / "main.bean").read_text(encoding="utf-8")
