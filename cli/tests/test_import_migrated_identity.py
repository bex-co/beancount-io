"""A bank import recognizes history migrated by beancount-migrate (w5/020).

beancount-migrate writes the generated-id digest under its source's prefix
(`monarch:sha256:<hex>`) and records a merged transfer's second source row as
`import-id-2`. The import compared ids as whole strings, so an overlapping
bank export previewed every migrated row as new and would double-book it.
With the prefix matched, it then compared payee and narration too; a
migrated payee, or a transfer's single narration, cannot equal every bank row,
so each overlap became a conflict that refused the import.

Expected ids here are computed from the documented hash input, independently
of the engine's helpers.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKING = "Assets:Bank:Checking"
SAVINGS = "Assets:Bank:Savings"
MAPPING = "date=Date,amount=Amount,narration=Description,sign=bank"


def _digest(date: str, amount: str, description: str, account: str) -> str:
    base = f"{date}|{amount} USD|{description}|{account}"
    return hashlib.sha256(base.encode()).hexdigest()[:16]


GROCERY = _digest("2026-03-08", "-54.2", "TRADER JOES #123 SEATTLE WA", CHECKING)
TRANSFER_OUT = _digest("2026-03-10", "-500", "TRANSFER TO SAVINGS", CHECKING)
TRANSFER_IN = _digest("2026-03-10", "500", "TRANSFER FROM CHECKING", SAVINGS)

MIGRATED = f"""\
option "operating_currency" "USD"
2026-03-04 open {CHECKING} USD
2026-03-04 open {SAVINGS} USD
2026-03-04 open Expenses:Food:Groceries USD
2026-03-04 open Expenses:Uncategorized USD
2026-03-04 open Income:Interest USD
2026-03-04 open Equity:OpeningBalances USD

2026-03-08 * "Trader Joes" "TRADER JOES #123 SEATTLE WA"
  import-id: "monarch:sha256:{GROCERY}"
  {CHECKING}  -54.20 USD
  Expenses:Food:Groceries

2026-03-10 * "Transfer" "TRANSFER TO SAVINGS"
  import-id: "monarch:sha256:{TRANSFER_OUT}"
  import-id-2: "monarch:sha256:{TRANSFER_IN}"
  {CHECKING}  -500.00 USD
  {SAVINGS}   500.00 USD
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        timeout=120,
    )


def _import(tmp_path: Path, ledger: Path, rows: str, account: str, *extra: str) -> dict:
    source = tmp_path / "export.csv"
    source.write_text("Date,Description,Amount\n" + rows)
    done = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        MAPPING,
        "--account",
        account,
        "--date-format",
        "%Y-%m-%d",
        *extra,
    )
    assert done.returncode == 0, done.stderr
    return dict(json.loads(done.stdout)["data"])


def _statuses(data: dict) -> list[str]:
    return [row["status"] for row in data["rows"]]


def test_overlap_from_the_checking_side_is_already_migrated(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(MIGRATED)
    before = ledger.read_bytes()

    data = _import(
        tmp_path,
        ledger,
        "2026-03-08,TRADER JOES #123 SEATTLE WA,-54.20\n2026-03-10,TRANSFER TO SAVINGS,-500.00\n",
        CHECKING,
        "--apply",
    )

    assert _statuses(data) == ["duplicate", "duplicate"]
    assert data["conflicts"] == 0 and data["written"] == 0
    assert f"monarch:sha256:{TRANSFER_OUT}" in data["rows"][1]["reason"]
    assert ledger.read_bytes() == before


def test_overlap_from_the_savings_side_matches_import_id_2(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(MIGRATED)
    before = ledger.read_bytes()

    data = _import(tmp_path, ledger, "2026-03-10,TRANSFER FROM CHECKING,500.00\n", SAVINGS, "--apply")

    assert _statuses(data) == ["duplicate"]
    assert f"monarch:sha256:{TRANSFER_IN}" in data["rows"][0]["reason"]
    assert ledger.read_bytes() == before


def test_new_activity_beside_the_overlap_is_written_once(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(MIGRATED)
    rows = "2026-03-10,TRANSFER FROM CHECKING,500.00\n2026-03-31,INTEREST PAYMENT,1.25\n"

    first = _import(tmp_path, ledger, rows, SAVINGS, "--apply")
    again = _import(tmp_path, ledger, rows, SAVINGS, "--apply")

    assert _statuses(first) == ["duplicate", "new"] and first["written"] == 1
    assert _statuses(again) == ["duplicate", "duplicate"] and again["written"] == 0
    assert ledger.read_text().count("INTEREST PAYMENT") == 1


def test_generated_id_survives_a_later_edit_to_the_ledger_amount(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(MIGRATED.replace("-54.20 USD", "-45.20 USD"))
    before = ledger.read_bytes()

    data = _import(tmp_path, ledger, "2026-03-08,TRADER JOES #123 SEATTLE WA,-54.20\n", CHECKING, "--apply")

    assert _statuses(data) == ["duplicate"]
    assert data["written"] == 0
    assert ledger.read_bytes() == before


def test_native_bank_id_survives_payee_and_narration_cleanup(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        f'option "operating_currency" "USD"\n2026-03-04 open {CHECKING} USD\n'
        "2026-03-04 open Expenses:Uncategorized USD\n\n"
        f'2026-03-08 * "Old payee" "COFFEE"\n  import-id: "bank:tx-1"\n  {CHECKING}  -4.00 USD\n'
        "  Expenses:Uncategorized\n"
    )
    source = tmp_path / "export.csv"
    source.write_text("Date,Description,Amount,Id\n2026-03-08,TEA,-4.00,tx-1\n")
    before = ledger.read_bytes()

    done = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        MAPPING + ",id=Id",
        "--account",
        CHECKING,
        "--date-format",
        "%Y-%m-%d",
        "--apply",
    )

    assert done.returncode == 0, done.stderr
    data = json.loads(done.stdout)["data"]
    assert _statuses(data) == ["duplicate"]
    assert data["written"] == 0
    assert ledger.read_bytes() == before


def test_migration_written_with_the_older_two_decimal_digest_still_matches(tmp_path: Path) -> None:
    # Before exact amounts, dedup.md hashed `-54.20` with no commodity; a
    # migration done then still owns its rows after an upgrade.
    older = hashlib.sha256(f"2026-03-08|-54.20|TRADER JOES #123 SEATTLE WA|{CHECKING}".encode()).hexdigest()[:16]
    ledger = tmp_path / "main.bean"
    ledger.write_text(MIGRATED.replace(f"monarch:sha256:{GROCERY}", f"monarch:sha256:{older}"))
    before = ledger.read_bytes()

    data = _import(tmp_path, ledger, "2026-03-08,TRADER JOES #123 SEATTLE WA,-54.20\n", CHECKING, "--apply")

    assert _statuses(data) == ["duplicate"] and data["written"] == 0
    assert ledger.read_bytes() == before


def test_every_documented_migration_prefix_matches(tmp_path: Path) -> None:
    for prefix in ("mint", "qbo"):
        ledger = tmp_path / f"{prefix}.bean"
        ledger.write_text(MIGRATED.replace("monarch:sha256:", f"{prefix}:sha256:"))
        before = ledger.read_bytes()

        data = _import(tmp_path, ledger, "2026-03-10,TRANSFER FROM CHECKING,500.00\n", SAVINGS, "--apply")

        assert _statuses(data) == ["duplicate"], prefix
        assert ledger.read_bytes() == before, prefix
