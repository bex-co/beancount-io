"""`bea init --opening-balance` names what is wrong with a refused value (w1/262).

Every refusal printed one message, "must be 'ACCOUNT NUMBER' for one of the
template's asset/liability accounts", whether the value had a trailing
currency, named an unknown account, or named an expense, and none of them
listed the accounts the new ledger accepts.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
FIXED = "Opening balances accept: Assets:Checking, Assets:Savings, Assets:Cash, Liabilities:CreditCard."
PERSONAL = "Opening balances accept: Assets:Cash, Assets:Bank, Liabilities:CreditCard, Liabilities:Loan."


def _init(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        [sys.executable, "-m", "cli.main", "--no-input", "init", "books", "--currency", "USD", "--date", "2026-01-01"]
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
