"""Every `list` directive kind includes user metadata (w3/289, extended by w3/393).

w3/289 repaired six kinds. `balance`, `price`, `pad` and `close` were left
out: their models had no `meta` field and their readers never called
`metadata_to_json`, so an agent inspecting reconciliation provenance or a
quote's source got nothing, while `query PRINT` showed the metadata was
loaded all along. The case table below is the contract; adding a directive
kind to `list` means adding a row here.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 commodity HOOL
  name: "Hollowood"
  asset-class: "stock"
2020-01-01 open Assets:Cash USD
  friendly: "Cash"
2020-01-01 note Assets:Cash "hello"
  author: "qa"
2020-01-01 event "location" "SF"
  source: "manual"
2020-01-01 document Assets:Cash "receipt.pdf"
  scanned: TRUE
2020-02-01 custom "budget" TRUE 1000
  note: "q1"
2020-01-01 open Equity:Opening USD
2020-01-02 pad Assets:Cash Equity:Opening
  audit: "opening-pad"
2020-01-03 balance Assets:Cash 5 USD
  audit: "bank-statement"
2020-01-03 price HOOL 25 USD
  audit: "manual-quote"
2020-01-04 close Assets:Cash
  audit: "closed-by-user"
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
        timeout=30,
    )


def test_list_directives_include_user_metadata(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"%PDF")

    cases = {
        "commodity": ("name", "Hollowood"),
        "note": ("author", "qa"),
        "event": ("source", "manual"),
        "open": ("friendly", "Cash"),
        "custom": ("note", "q1"),
        "document": ("scanned", True),
        # The four w3/289 missed.
        "pad": ("audit", "opening-pad"),
        "balance": ("audit", "bank-statement"),
        "price": ("audit", "manual-quote"),
        "close": ("audit", "closed-by-user"),
    }
    for kind, (key, expected) in cases.items():
        result = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind)
        assert result.returncode == 0, f"{kind}: {result.stderr or result.stdout}"
        rows = json.loads(result.stdout)["data"]
        assert rows, kind
        assert rows[0].get("meta", {}).get(key) == expected, (kind, rows[0])
        assert "filename" not in rows[0].get("meta", {})
        assert "lineno" not in rows[0].get("meta", {})


def test_a_directive_without_metadata_serializes_an_empty_mapping(tmp_path: Path) -> None:
    """Absent metadata is `{}`, not a missing key, so a consumer can index it."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"%PDF")  # The fixture's document entry.

    result = _bea(tmp_path, "--json", "--file", str(ledger), "list", "open")

    assert result.returncode == 0, result.stderr
    rows = {row["account"]: row for row in json.loads(result.stdout)["data"]}
    assert rows["Equity:Opening"]["meta"] == {}


def test_reading_never_rewrites_the_ledger(tmp_path: Path) -> None:
    """These are reads; the metadata was always on disk and must stay there."""
    import hashlib

    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"%PDF")
    before = hashlib.sha256(ledger.read_bytes()).hexdigest()

    for kind in ("pad", "balance", "price", "close", "open"):
        assert _bea(tmp_path, "--json", "--file", str(ledger), "list", kind).returncode == 0

    assert hashlib.sha256(ledger.read_bytes()).hexdigest() == before


def test_query_print_still_shows_the_same_metadata(tmp_path: Path) -> None:
    """The control that proved the metadata was loaded and lost in conversion."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "receipt.pdf").write_bytes(b"%PDF")  # The fixture's document entry.

    printed = _bea(tmp_path, "--file", str(ledger), "query", "PRINT")

    assert printed.returncode == 0, printed.stderr
    for value in ("opening-pad", "bank-statement", "manual-quote", "closed-by-user"):
        assert value in printed.stdout
