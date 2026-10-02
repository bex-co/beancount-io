"""Invalid report conversions are usage errors in terminals and automation alike."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import threading
from decimal import Decimal
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Euro EUR
2026-01-01 open Assets:Stock HOOL
2026-01-01 open Equity:Opening
2026-01-01 price EUR 2 USD
2026-01-01 price HOOL 15 USD

2026-01-02 * "Opening holdings"
  Assets:Cash       100 USD
  Assets:Euro        50 EUR
  Assets:Stock        2 HOOL {10 USD}
  Equity:Opening   -120 USD
  Equity:Opening    -50 EUR
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _bea(ledger: Path, mode: str, *args: str, strict: bool = False) -> subprocess.CompletedProcess[str]:
    command = [sys.executable, "-m", "cli.main", "--file", str(ledger)]
    if mode == "json":
        command.append("--json")
    if strict:
        command.append("--strict")
    command.extend(args)
    env = {**os.environ, "PYTHONPATH": str(ROOT / "src"), "TERM": "dumb", "NO_COLOR": "1"}
    if mode != "terminal":
        return subprocess.run(
            command,
            cwd=ledger.parent,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=30,
        )

    if os.name != "posix":
        pytest.skip("The real terminal control requires a POSIX PTY")
    import pty

    master, slave = pty.openpty()
    chunks: list[bytes] = []

    def drain() -> None:
        while True:
            try:
                chunk = os.read(master, 65536)
            except OSError:
                return
            if not chunk:
                return
            chunks.append(chunk)

    reader = threading.Thread(target=drain, daemon=True)
    reader.start()
    try:
        result = subprocess.run(
            command,
            cwd=ledger.parent,
            env=env,
            stdin=slave,
            stdout=slave,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30,
        )
    finally:
        os.close(slave)
        reader.join(timeout=5)
        os.close(master)
    assert not reader.is_alive(), "the report process left its terminal open"
    stdout = b"".join(chunks).decode("utf-8").replace("\r\n", "\n")
    return subprocess.CompletedProcess(command, result.returncode, stdout, result.stderr)


@pytest.mark.parametrize(
    ("mode", "command"),
    [
        ("terminal", ("report", "balance-sheet")),
        ("pipe", ("balance",)),
        ("json", ("report", "overview")),
    ],
    ids=["terminal-report", "piped-balance", "json-report"],
)
@pytest.mark.parametrize(("conversion", "suggestion"), [("at-cost", "at_cost"), ("usd", "USD"), ("US D", None)])
def test_invalid_conversion_is_a_usage_error_without_a_report(
    ledger: Path, mode: str, command: tuple[str, ...], conversion: str, suggestion: str | None
) -> None:
    result = _bea(ledger, mode, *command, "-x", conversion)

    assert result.returncode == 2, (result.stdout, result.stderr)
    assert result.stdout == "", "a rejected conversion must not emit a report"
    diagnostic = result.stderr
    if mode == "json":
        error = json.loads(diagnostic)["error"]
        assert error["category"] == "usage"
        diagnostic = error["message"] + " " + " ".join(error.get("details", []))
    assert conversion in diagnostic
    assert all(keyword in diagnostic for keyword in ("units", "at_cost", "at_value"))
    if suggestion:
        assert re.search(rf"(?:Did you mean|Try) ['`\"]?{re.escape(suggestion)}\b", diagnostic)
    assert "Missing prices" not in diagnostic
    assert "Valuation:" not in result.stdout
    assert ledger.read_text() == LEDGER


@pytest.mark.parametrize(
    ("conversion", "command", "amounts"),
    [
        ("units", ("balance",), {"USD": "100", "EUR": "50", "HOOL": "2"}),
        ("at_cost", ("report", "balance-sheet"), {"USD": "120", "EUR": "50"}),
        ("at_value", ("report", "balance-sheet"), {"USD": "230"}),
        ("USD", ("balance",), {"USD": "230"}),
        ("EUR", ("report", "balance-sheet"), {"EUR": "115"}),
    ],
    ids=["units", "at-cost", "at-value", "USD", "EUR"],
)
def test_valid_conversion_modes_and_currencies_keep_their_values(
    ledger: Path, conversion: str, command: tuple[str, ...], amounts: dict[str, str]
) -> None:
    result = _bea(ledger, "json", *command, "-x", conversion)

    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert data["conversion"] == conversion
    assert data["ledger_valid"] is True
    assert data["valuation"] == "complete"
    assert data["missing_prices"] == []
    assert {currency: Decimal(value) for currency, value in data["assets"]["balance_children"].items()} == {
        currency: Decimal(value) for currency, value in amounts.items()
    }


@pytest.mark.parametrize(
    ("mode", "strict", "allow_errors", "expected_status"),
    [
        ("terminal", False, False, 0),
        ("terminal", True, False, 1),
        ("pipe", False, False, 1),
        ("pipe", False, True, 0),
        ("json", False, False, 1),
        ("json", False, True, 0),
    ],
    ids=["terminal-default", "terminal-strict", "piped-strict", "piped-allow", "json-strict", "json-allow"],
)
def test_a_valid_unpriced_currency_keeps_the_existing_partial_report_policy(
    ledger: Path, mode: str, strict: bool, allow_errors: bool, expected_status: int
) -> None:
    result = _bea(
        ledger,
        mode,
        "report",
        "balance-sheet",
        "-x",
        "GBP",
        *(["--allow-errors"] if allow_errors else []),
        strict=strict,
    )

    assert result.returncode == expected_status, (result.stdout, result.stderr)
    if expected_status:
        assert result.stdout == ""
        assert "Missing prices" in result.stderr
        if mode == "json":
            error = json.loads(result.stderr)["error"]
            assert error["category"] == "validation"
            assert {pair["to"] for pair in error["result"]["missing_prices"]} == {"GBP"}
    elif mode == "json":
        data = json.loads(result.stdout)["data"]
        assert data["conversion"] == "GBP"
        assert data["valuation"] == "partial"
        assert {pair["to"] for pair in data["missing_prices"]} == {"GBP"}
        assert data["net_worth"] == {"GBP": None}
    else:
        assert "Valuation: GBP" in result.stdout
        assert "Partial valuation:" in result.stdout
        assert "has no GBP price" in result.stderr
