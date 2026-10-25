"""`bea report holdings` and `bea report register` text and JSON (w22/m3/t003).

Both commands render the engine payloads through the shared report
surface (`_ask`, `_heading`, `output.table`) and inherit the
strict/lenient read policy: a person at a terminal gets data plus the
ledger errors as a banner, while `--strict` and `--json` refuse.
"""

from __future__ import annotations

import json
import os
import pty
import select
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Expenses:Food USD
2026-01-01 open Income:Salary USD
2026-01-02 * "Employer" "Payday"
  Assets:Checking  3000 USD
  Income:Salary
2026-01-03 * "Grocer" "Weekly shop"
  Expenses:Food  80 USD
  Assets:Checking
2026-01-05 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-10 price VTI 170 USD
"""

CASH_ONLY = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Salary USD
2026-01-02 * "Employer" "Payday"
  Assets:Checking  3000 USD
  Income:Salary
"""

# The balance is really 2920 USD, so the assertion fails and the ledger
# loads with one error.
BAD_ASSERTION = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Expenses:Food USD
2026-01-01 open Income:Salary USD
2026-01-02 * "Employer" "Payday"
  Assets:Checking  3000 USD
  Income:Salary
2026-01-03 * "Grocer" "Weekly shop"
  Expenses:Food  80 USD
  Assets:Checking
2026-01-04 balance Assets:Checking 9999 USD
2026-01-05 * "Buy"
  Assets:Brokerage  10 VTI {150 USD}
  Assets:Checking
2026-01-10 price VTI 170 USD
"""


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


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )


def _terminal(tmp_path: Path, *argv: str, timeout: float = 120.0) -> tuple[int, str]:
    """Run one `bea` command with stdout on a terminal and return status and screen."""
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(sys.executable, [sys.executable, "-m", "cli.main", *argv], _env(tmp_path))
    screen = b""
    started = time.time()
    try:
        while True:
            ready, _, _ = select.select([fd], [], [], 0.3)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:
                    chunk = b""
                screen += chunk
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                return os.waitstatus_to_exitcode(status), screen.decode("utf-8", "replace")
            if time.time() - started > timeout:
                raise AssertionError(f"timed out waiting for: {argv}")
    finally:
        try:
            os.close(fd)
        except OSError:
            pass


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def test_holdings_text_table(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    assert "Holdings — 2026-01-02 through 2026-01-10" in proc.stdout
    assert "Valuation: USD; account: all" in proc.stdout
    assert "Assets:Brokerage" in proc.stdout
    assert "1,500 USD" in proc.stdout
    assert "1,700 USD" in proc.stdout
    assert "Cost basis:" in proc.stdout
    assert "Market value:" in proc.stdout


def test_holdings_group_by_commodity(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "holdings", "--group-by", "commodity")
    assert proc.returncode == 0, proc.stderr
    assert "ACCOUNTS" in proc.stdout
    assert "Assets:Brokerage" in proc.stdout


def test_holdings_json(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert "display_precision" not in payload["data"]
    (group,) = payload["data"]["groups"]
    assert group["account"] == "Assets:Brokerage"
    assert group["market_value"] == {"number": "1700", "currency": "USD"}
    assert payload["data"]["totals"]["market_value"] == {"USD": "1700"}


def test_holdings_empty(tmp_path: Path) -> None:
    ledger = _write(tmp_path, CASH_ONLY)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    assert "No holdings." in proc.stdout


def test_register_text_table(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "register", "Assets:Checking")
    assert proc.returncode == 0, proc.stderr
    assert "Register — 2026-01-02 through 2026-01-10" in proc.stdout
    assert "Employer Payday" in proc.stdout
    assert "1,420 USD" in proc.stdout
    assert "ACCOUNT" not in proc.stdout


def test_register_subtree_shows_accounts(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "register", "Assets")
    assert proc.returncode == 0, proc.stderr
    assert "ACCOUNT" in proc.stdout
    assert "Assets:Brokerage" in proc.stdout
    assert "150 USD (2026-01-05)" in proc.stdout


def test_register_json(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "register", "Assets:Checking")
    assert proc.returncode == 0, proc.stderr
    payload = json.loads(proc.stdout)
    assert "display_precision" not in payload["data"]
    assert payload["data"]["account"] == "Assets:Checking"
    assert payload["data"]["rows"][-1]["balance"] == {"USD": "1420"}


def test_register_needs_positional_account(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "register")
    assert proc.returncode != 0


def test_register_refuses_blank_account(tmp_path: Path) -> None:
    ledger = _write(tmp_path, LEDGER)
    proc = _bea(tmp_path, "--file", str(ledger), "report", "register", "  ")
    assert proc.returncode != 0
    assert "ACCOUNT argument is empty" in proc.stderr


def _assert_lenient_strict(ledger: Path, tmp_path: Path, *command: str, needle: str) -> None:
    """The read policy: data plus a banner in a terminal, refusal otherwise."""
    status, screen = _terminal(tmp_path, "--file", str(ledger), *command)
    assert status == 0, screen
    assert needle in screen
    # The wrong 9999 USD appears only in the ledger-error banner, never the data.
    assert "9999" in screen
    strict = _bea(tmp_path, "--strict", "--file", str(ledger), *command)
    assert strict.returncode != 0
    assert "Ledger has 1 error(s)" in strict.stderr
    as_json = _bea(tmp_path, "--file", str(ledger), "--json", *command)
    assert as_json.returncode != 0


def test_holdings_lenient_and_strict(tmp_path: Path) -> None:
    ledger = _write(tmp_path, BAD_ASSERTION)
    _assert_lenient_strict(ledger, tmp_path, "report", "holdings", needle="Assets:Brokerage")


def test_register_lenient_and_strict(tmp_path: Path) -> None:
    ledger = _write(tmp_path, BAD_ASSERTION)
    _assert_lenient_strict(ledger, tmp_path, "report", "register", "Assets:Checking", needle="1,420 USD")
