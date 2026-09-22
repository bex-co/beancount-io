"""A failed `bea query -o FILE` leaves the previous export intact (w3/380).

`cli/docs/USAGE.md`: "a failed query or write preserves an existing export."
`text_answer` opened the destination for write *before* running the query, so
any execution failure left a 0-byte file where the last good export had been —
and a query that failed mid-render left a partial one.

The `--json` path was never affected (the frontend emits only on success), so
it is pinned here as the working control.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-05 * "Cafe" "Coffee"
  Expenses:Food  5.00 USD
  Assets:Checking
"""

BAD_QUERY = "SELECT FROM WHERE bad"
GOOD_QUERY = "SELECT account, position"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "books.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


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


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.mark.parametrize("export_format", ["text", "csv", "beancount"])
def test_failed_query_leaves_the_export_byte_identical(tmp_path: Path, ledger: Path, export_format: str) -> None:
    export = tmp_path / f"export.{export_format}"
    export.write_text("SENTINEL — the last good export\n", encoding="utf-8")
    before = _sha256(export)

    failed = _bea(tmp_path, "--file", str(ledger), "query", BAD_QUERY, "--format", export_format, "-o", str(export))

    assert failed.returncode == 2, failed.stderr
    assert _sha256(export) == before, "a failed query must not touch the previous export"


def test_successful_query_still_replaces_the_export(tmp_path: Path, ledger: Path) -> None:
    """Preserving on failure must not turn into refusing to write on success."""
    export = tmp_path / "export.txt"
    export.write_text("SENTINEL\n", encoding="utf-8")

    done = _bea(tmp_path, "--file", str(ledger), "query", GOOD_QUERY, "-o", str(export))

    assert done.returncode == 0, done.stderr
    written = export.read_text(encoding="utf-8")
    assert "SENTINEL" not in written
    assert "Expenses:Food" in written and "5.00 USD" in written
    assert done.stdout == "", "the export is the result; it must not also print to stdout"


def test_json_export_preserves_on_failure_too(tmp_path: Path, ledger: Path) -> None:
    """The control that already worked, pinned so the paths cannot diverge again."""
    export = tmp_path / "export.json"
    export.write_text("SENTINEL\n", encoding="utf-8")
    before = _sha256(export)

    failed = _bea(tmp_path, "--json", "--file", str(ledger), "query", BAD_QUERY, "-o", str(export))

    assert failed.returncode == 2, failed.stderr
    assert _sha256(export) == before


def test_refusing_to_overwrite_the_ledger_still_runs_before_any_write(tmp_path: Path, ledger: Path) -> None:
    """`-o` naming the ledger under read is refused, and the ledger is untouched."""
    before = _sha256(ledger)

    refused = _bea(tmp_path, "--file", str(ledger), "query", GOOD_QUERY, "-o", str(ledger))

    assert refused.returncode == 2
    assert "would overwrite the ledger it reads" in refused.stderr
    assert _sha256(ledger) == before
