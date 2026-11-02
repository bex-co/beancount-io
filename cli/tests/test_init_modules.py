"""`bea init --module` adds the setup-catalog modules to a personal ledger (w3/m59/t003)."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

INVESTMENTS = {
    "Assets:Brokerage",
    "Income:Dividends",
    "Income:Interest",
    "Income:CapitalGains",
    "Expenses:Brokerage:Fees",
}


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _run(tmp_path: Path, module: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", module, *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def _init(tmp_path: Path, books: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _run(tmp_path, "cli.main", "--json", "--no-input", "init", str(books), "--currency", "USD", *args)


def test_modules_open_their_accounts_once_in_either_flag_order(tmp_path: Path) -> None:
    ledgers = []
    for order in (
        ["--module", "investments@1", "--module", "rental-property@1"],
        ["--module", "rental-property@1", "--module", "investments@1"],
    ):
        books = tmp_path / f"books{len(ledgers)}"
        result = _init(tmp_path, books, "--preset", "personal@1", "--date", "2026-01-01", *order)
        assert result.returncode == 0, result.stderr or result.stdout
        accounts = json.loads(result.stdout)["data"]["accounts"]
        assert len(accounts) == len(set(accounts))
        assert INVESTMENTS <= set(accounts)
        assert {"Income:Rent:Property1", "Liabilities:Deposits:Property1", "Expenses:Rental:Property1:Repairs"} <= set(
            accounts
        )
        ledgers.append((books / "main.bean").read_text(encoding="utf-8"))
    assert ledgers[0] == ledgers[1]
    # The brokerage holds instruments and books FIFO, as beancount-trade expects.
    assert '2026-01-01 open Assets:Brokerage "FIFO"\n' in ledgers[0]
    checked = _run(tmp_path, "cli.main", "--file", str(tmp_path / "books0" / "main.bean"), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout


def test_property_name_names_the_rental_group(tmp_path: Path) -> None:
    books = tmp_path / "books"
    result = _init(
        tmp_path, books, "--preset", "personal@1", "--module", "rental-property@1", "--property-name", "OakSt"
    )
    assert result.returncode == 0, result.stderr or result.stdout
    accounts = set(json.loads(result.stdout)["data"]["accounts"])
    assert {"Income:Rent:OakSt", "Expenses:Rental:OakSt:Other"} <= accounts
    assert not any("Property1" in account for account in accounts)


def test_a_module_account_takes_an_opening_balance(tmp_path: Path) -> None:
    books = tmp_path / "books"
    result = _init(
        tmp_path,
        books,
        "--preset",
        "personal@1",
        "--date",
        "2026-02-01",
        "--module",
        "side-business@1",
        "--opening-balance",
        "Assets:Business:Bank 250",
    )
    assert result.returncode == 0, result.stderr or result.stdout
    ledger = (books / "main.bean").read_text(encoding="utf-8")
    assert re.search(r"^2026-02-01 balance Assets:Business:Bank +250 USD$", ledger, re.M)


def test_without_modules_the_preset_ledger_is_unchanged(tmp_path: Path) -> None:
    plain = _init(tmp_path, tmp_path / "plain", "--preset", "personal@1", "--date", "2026-01-01")
    assert plain.returncode == 0, plain.stderr or plain.stdout
    accounts = json.loads(plain.stdout)["data"]["accounts"]
    assert not INVESTMENTS & set(accounts)
    assert "FIFO" not in (tmp_path / "plain" / "main.bean").read_text(encoding="utf-8")


@pytest.mark.parametrize(
    ("args", "reason"),
    [
        (["--module", "investments@1"], "add --preset personal@1"),
        (["--preset", "freelance@1", "--module", "investments@1"], "accepted only with --preset personal@1"),
        (["--preset", "personal@1", "--module", "crypto@1"], "Unknown module"),
        (
            ["--preset", "personal@1", "--module", "side-business@1", "--module", "side-business@1"],
            "more than once",
        ),
        (["--preset", "personal@1", "--property-name", "OakSt"], "add --module rental-property@1"),
        (
            ["--preset", "personal@1", "--module", "investments@1", "--property-name", "OakSt"],
            "add --module rental-property@1",
        ),
        (["--preset", "personal@1", "--module", "rental-property@1", "--property-name", "Oak St"], "--property-name"),
        (
            ["--preset", "personal@1", "--opening-balance", "Assets:Business:Bank 5"],
            "Opening balance must be",
        ),
    ],
)
def test_bad_module_selection_exits_2_and_writes_nothing(tmp_path: Path, args: list[str], reason: str) -> None:
    books = tmp_path / "books"
    result = _init(tmp_path, books, *args)
    assert result.returncode == 2, result.stderr or result.stdout
    assert reason in (result.stderr + result.stdout)
    assert not books.exists()


@pytest.mark.parametrize(
    ("args", "reason"),
    [
        (["--preset", "freelance@1", "--module", "investments@1"], "accepted only with preset personal@1"),
        (["--preset", "personal@1", "--module", "investments@1", "--module", "investments@1"], "more than once"),
        (["--preset", "personal@1", "--module", "rental-property@1", "--property-name", "oak"], "is not valid"),
        (["--module", "investments@1"], "only meaningful with --preset personal@1"),
    ],
)
def test_the_engine_refuses_a_bad_selection_itself(tmp_path: Path, args: list[str], reason: str) -> None:
    file = tmp_path / "books" / "main.bean"
    result = _run(
        tmp_path, "bea_engine", "init", "--file", str(file), "--currency", "USD", "--date", "2026-01-01", *args
    )
    assert result.returncode != 0
    assert reason in (result.stdout + result.stderr)
    assert not file.exists()
