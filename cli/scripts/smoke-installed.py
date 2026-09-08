"""Customer workflow checks against an installed bea executable; standard library only."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from decimal import Decimal
from pathlib import Path


def smoke(binary: Path, directory: Path) -> None:
    env = dict(os.environ, BEA_CONFIG_DIR=str(directory / "config"), BEA_NO_UPDATE_NOTIFIER="1")
    env.pop("BEA_FILE", None)
    commands = 0

    def run(*args: str, exit_code: int = 0):
        nonlocal commands
        commands += 1
        completed = subprocess.run(
            [str(binary), "--json", "--no-input", *args],
            cwd=directory,
            env=env,
            text=True,
            capture_output=True,
            timeout=30,
        )
        assert completed.returncode == exit_code, (args, completed.stdout, completed.stderr)
        return json.loads(completed.stdout if exit_code == 0 else completed.stderr)

    version = subprocess.run([str(binary), "--version"], env=env, capture_output=True, text=True, check=True)
    assert version.stdout.startswith("bea ")
    run("init", "books", "--currency", "USD", "--date", "2026-08-01", "--opening-balance", "Assets:Checking 1000")
    file = directory / "books/main.bean"
    target = ("--file", str(file))
    run(*target, "check")
    for account, number in (("Income:Salary", "-100"), ("Expenses:Dining", "25")):
        run(
            *target,
            "add",
            "transaction",
            "--date",
            "2026-08-02",
            "--narration",
            "Smoke transaction",
            "-p",
            f"{account} {number} USD",
            "-p",
            f"Assets:Checking {-Decimal(number)} USD",
        )
    result = run(*target, "query", "SELECT sum(number) WHERE account = 'Expenses:Dining'")
    assert Decimal(result["data"]["rows"][0][0]) == 25
    result = run(*target, "report", "income-statement", "--time", "2026-08")
    assert Decimal(result["data"]["net_profit"]["USD"]) == 75
    result = run(*target, "report", "balance-sheet", "--time", "2026-08")
    assert Decimal(result["data"]["net_worth"]["USD"]) == 1075
    assert Decimal(result["data"]["equity_total"]["USD"]) == -1075
    original = file.read_bytes()
    run(
        *target,
        "add",
        "transaction",
        "--date",
        "2026-08-03",
        "-p",
        "Assets:Checking -5 USD",
        "-p",
        "Expenses:Dining 4 USD",
        exit_code=1,
    )
    assert file.read_bytes() == original
    config = Path(__file__).with_name("csv_importers.py")
    if not config.exists():
        config = Path(__file__).resolve().parents[1] / "docs/examples/csv_importers.py"
    source = directory / "bank.csv"
    source.write_text(
        "Date,Payee,Narration,Amount,Currency,Category,BankID\n"
        "2026-08-03,Cafe,Coffee,-5.25,USD,Expenses:Dining,bank-001\n"
    )
    importing = (*target, "import", str(source), "--config", str(config))
    assert run(*importing)["data"]["ready"] == 1
    assert file.read_bytes() == original
    assert run(*importing, "--apply")["data"]["written"] == 1
    imported = file.read_bytes()
    assert run(*importing, "--apply")["data"]["written"] == 0
    assert file.read_bytes() == imported
    run(*target, "add", "open", "--date", "2026-08-01", "--account", "Assets:Stock", "--currency", "AAPL")
    investment = directory / "investment.json"
    investment.write_text(
        json.dumps(
            [
                {
                    "date": "2026-08-04",
                    "postings": [
                        {
                            "account": "Assets:Stock",
                            "units": {"number": "1", "currency": "AAPL"},
                            "cost": {"number": "100", "currency": "USD"},
                        },
                        {"account": "Assets:Checking", "units": {"number": "-100", "currency": "USD"}},
                    ],
                }
            ]
        )
    )
    run(*target, "add", "transactions", "--from", str(investment))
    run(*target, "add", "price", "--date", "2026-08-31", "--currency", "AAPL", "--amount", "150 USD")
    valued = run(*target, "report", "balance-sheet", "--time", "2026-08")["data"]
    assert Decimal(valued["net_worth"]["USD"]) == Decimal("1119.75")
    assert Decimal(valued["valuation_adjustment"]["USD"]) == -50
    comment = 'A "quoted" café receipt \\ path'
    run(*target, "add", "note", "--date", "2026-08-03", "--account", "Assets:Checking", "--comment", comment)
    assert run(*target, "list", "note")["data"][0]["comment"] == comment
    run("format", str(file))
    run(*target, "check")
    run(
        "init",
        "euro.beancount",
        "--currency",
        "EUR",
        "--date",
        "2026-08-01",
        "--opening-balance",
        "Assets:Checking 1000",
    )
    euro = ("--file", str(directory / "euro.beancount"))
    run(*euro, "report", "balance-sheet", "--conversion", "USD", exit_code=1)
    result = run(*euro, "report", "balance-sheet", "--conversion", "USD", "--allow-errors")
    assert result["data"]["net_worth"] == {"USD": None}
    run("unknown-command", exit_code=2)
    run("--file", exit_code=2)
    print(f"Installed CLI smoke passed: {commands + 1} commands ({version.stdout.strip()}).")


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="bea-smoke-") as work:
        smoke(Path(sys.argv[1]).resolve(), Path(work))
