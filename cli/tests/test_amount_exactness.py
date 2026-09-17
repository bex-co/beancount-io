"""Every write path records exactly the decimal the caller sent.

The same adversarial corpus — a binary-hostile fraction, an integer, a
large whole, a sub-decimal speck, a signed cents value, and a wide balance —
goes through `add transaction`, `add transactions --from -`, and `import
--apply`, and the bytes on disk must spell exactly those decimals (each with
its inferred balancing leg). No floats may appear anywhere on the way.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest
from beancount import loader
from beancount.core.data import Transaction
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
CLI_ROOT = Path(__file__).resolve().parents[1]
CONFIG = CLI_ROOT / "docs/examples/csv_importers.py"
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking
2026-01-01 open Expenses:Food
"""
AMOUNTS = ["0.3", "3", "1000", "0.0000001", "-45.00", "10.50", "123456789.125"]
TOKEN = re.compile(r"(-?[\d.]+) USD")


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _negate(amount: str) -> str:
    return amount[1:] if amount.startswith("-") else f"-{amount}"


def _assert_exact(ledger: Path, *, explicit_legs: bool) -> None:
    """The disk spells every corpus decimal exactly, and nothing else does.

    Flag and bulk writes leave the elided leg bare, so only the corpus
    amounts reach the disk; the importer writes both legs of every posting.
    """
    text = ledger.read_text()
    if explicit_legs:
        expected = sorted(token for amount in AMOUNTS for token in (amount, _negate(amount)))
    else:
        expected = sorted(AMOUNTS)
    assert sorted(TOKEN.findall(text)) == expected
    entries, errors, _ = loader.load_file(ledger)
    assert not errors
    assert sum(isinstance(entry, Transaction) for entry in entries) == len(AMOUNTS)
    numbers = sorted(
        (
            posting.units.number
            for entry in entries
            if isinstance(entry, Transaction)
            for posting in entry.postings
            if posting.units is not None
        ),
        key=str,
    )
    # Booking fills the bare legs, so the loaded values pair up on every path.
    wanted = [number for amount in AMOUNTS for number in (Decimal(amount), -Decimal(amount))]
    assert numbers == sorted(wanted, key=str)


def test_flag_path_writes_exact_decimals(ledger: Path) -> None:
    for index, amount in enumerate(AMOUNTS):
        result = runner.invoke(
            app,
            [
                "--file",
                str(ledger),
                "add",
                "transaction",
                "--date",
                f"2026-02-{index + 1:02d}",
                "--narration",
                f"exact {amount}",
                "--posting",
                f"Expenses:Food {amount} USD",
                "--posting",
                "Assets:Checking",
            ],
        )
        assert result.exit_code == 0, result.output

    _assert_exact(ledger, explicit_legs=False)


def test_bulk_path_writes_exact_decimals(ledger: Path) -> None:
    rows = [
        {
            "date": f"2026-02-{index + 1:02d}",
            "narration": f"exact {amount}",
            "postings": [
                {"account": "Expenses:Food", "units": {"number": amount, "currency": "USD"}},
                {"account": "Assets:Checking"},
            ],
        }
        for index, amount in enumerate(AMOUNTS)
    ]

    result = runner.invoke(app, ["--file", str(ledger), "add", "transactions", "--from", "-"], input=json.dumps(rows))

    assert result.exit_code == 0, result.output
    _assert_exact(ledger, explicit_legs=False)


def test_import_path_writes_exact_decimals(ledger: Path) -> None:
    source = ledger.parent / "bank.csv"
    lines = ["Date,Payee,Narration,Amount,Currency,Category,BankID"]
    lines += [
        f"2026-02-{index + 1:02d},Cafe,exact {amount},{amount},USD,Expenses:Food,bank-{index:03d}"
        for index, amount in enumerate(AMOUNTS)
    ]
    source.write_text("\n".join(lines) + "\n")

    result = runner.invoke(app, ["--file", str(ledger), "import", str(source), "--config", str(CONFIG), "--apply"])

    assert result.exit_code == 0, result.output
    _assert_exact(ledger, explicit_legs=True)


WRITE_PATH = [
    *sorted((CLI_ROOT / "src/bea_engine/ledger").glob("*.py")),
    CLI_ROOT / "src/bea_engine/amounts.py",
    CLI_ROOT / "src/bea_engine/csv_mapper.py",
    CLI_ROOT / "src/bea_engine/importing.py",
    CLI_ROOT / "src/cli/commands/add.py",
    CLI_ROOT / "src/cli/commands/import_.py",
]


def test_no_write_path_parses_a_float() -> None:
    """The amount path has no float conversion to sneak binary error through."""
    offenders = []
    for path in WRITE_PATH:
        for lineno, line in enumerate(path.read_text().splitlines(), start=1):
            stripped = line.split("#", 1)[0]
            if re.search(r"[^_.a-zA-Z]float\(", stripped) and "isinstance" not in stripped:
                offenders.append(f"{path.relative_to(CLI_ROOT)}:{lineno}: {line.strip()}")
    assert offenders == []


def test_bulk_stdin_is_the_documented_skills_primitive(tmp_path: Path) -> None:
    """`--from -` reads one JSON array from stdin — the shape skills pipe in."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = [
        {
            "date": "2026-02-01",
            "narration": "stdin",
            "postings": [
                {"account": "Expenses:Food", "units": {"number": "0.3", "currency": "USD"}},
                {"account": "Assets:Checking"},
            ],
        }
    ]

    env = {
        "PATH": "/usr/bin:/bin",
        "PYTHONPATH": str(CLI_ROOT / "src"),
        "BEA_CONFIG_DIR": str(tmp_path / "config"),
        "XDG_CACHE_HOME": str(tmp_path / "cache"),
        "XDG_DATA_HOME": str(tmp_path / "data"),
        "BEA_NO_UPDATE_NOTIFIER": "1",
        "TERM": "dumb",
        "NO_COLOR": "1",
    }
    result = subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "add", "transactions", "--from", "-"],
        env=env,
        cwd=tmp_path,
        input=json.dumps(rows),
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert "0.3 USD" in ledger.read_text()
