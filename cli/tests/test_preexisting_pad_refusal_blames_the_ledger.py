"""A write refused only for an inactive pad or syntax error the ledger already had says so (w1/282).

Every write but `add price`, `add balance` and a strict `import` said "The
change would leave the ledger invalid", blaming a harmless write for errors
`bea check` reported before it, so an agent retried other spellings of the
write instead of fixing the pad. w5/682 had corrected only those pre-checks.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PAD_LEDGER = """2026-01-01 open Assets:Bank USD
2026-01-01 open Equity:Opening USD

2025-12-20 pad Assets:Bank Equity:Opening
2026-01-02 balance Assets:Bank 100 USD
"""
PAD_HEADLINE = (
    "The ledger already has 4 error(s), including an invalid pad account; nothing was written. "
    "Open missing accounts or correct the pad account/date first: "
    "--allow-errors cannot bypass an inactive pad account."
)
SYNTAX_HEADLINE = (
    "The ledger already has 1 error(s), including a syntax error; nothing was written. "
    "Fix the syntax error first: --allow-errors never writes past one."
)
ROWS = [
    {
        "date": f"2026-01-0{day}",
        "narration": f"Row {day}",
        "postings": [
            {"account": "Assets:Bank", "units": {"number": "-5", "currency": "USD"}},
            {"account": "Equity:Opening"},
        ],
    }
    for day in (5, 6)
]
COMMANDS = {
    "open": ("open", "--date", "2026-01-05", "--account", "Expenses:Fun"),
    "note": ("note", "--date", "2026-01-05", "-a", "Assets:Bank", "-m", "Called the bank"),
    "transaction": ("transaction", "Lunch", "--date", "2026-01-05", "-p", "Assets:Bank -5 USD", "-p", "Equity:Opening"),
    "transactions": ("transactions", "--from", "rows.json"),
}
IMPORTER = """import datetime
from decimal import Decimal as D
from beancount.core import amount, data

class Bank:
    name = "bank"

    def identify(self, filepath):
        return True

    def account(self, filepath):
        return "Assets:Bank"

    def extract(self, filepath, existing):
        legs = [
            data.Posting("Assets:Bank", amount.Amount(D("-3"), "USD"), None, None, None, None),
            data.Posting("Equity:Opening", amount.Amount(D("3"), "USD"), None, None, None, None),
        ]
        meta = data.new_metadata(filepath, 1)
        day = datetime.date(2026, 2, 1)
        return [data.Transaction(meta, day, "*", None, "Fee", data.EMPTY_SET, data.EMPTY_SET, legs)]

CONFIG = [Bank()]
"""


def _bea(tmp_path: Path, *args: str, json_output: bool) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *(["--json"] if json_output else []), *args],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _refusal(result: subprocess.CompletedProcess[str], json_output: bool) -> tuple[str, str]:
    """The refusal's headline and its whole text, whitespace-normalized."""
    assert result.returncode == 1, result.stdout + result.stderr
    assert "Traceback" not in result.stderr, result.stderr
    if json_output:
        assert result.stdout == "", result.stdout
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "validation" and error["exit_code"] == 1, error
        return error["message"], " ".join([error["message"], *error.get("details", [])])
    # `import` names its importers file first; the refusal follows.
    refusal = result.stderr[result.stderr.index("Error: ") :]
    headline = refusal.split("\n", 1)[0].removeprefix("Error: ")
    return " ".join(headline.split()), " ".join(refusal.split())


def _pad_books(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(PAD_LEDGER)
    (tmp_path / "rows.json").write_text(json.dumps(ROWS))
    return ledger


def _assert_untouched(tmp_path: Path, files: dict[Path, bytes]) -> None:
    assert {path: path.read_bytes() for path in files} == files
    assert not list(tmp_path.glob(".bea-*"))


@pytest.mark.parametrize("allow_errors", [False, True], ids=["strict", "allow-errors"])
@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
@pytest.mark.parametrize("name", list(COMMANDS))
def test_a_harmless_write_blames_the_existing_pad(
    tmp_path: Path, name: str, json_output: bool, allow_errors: bool
) -> None:
    ledger = _pad_books(tmp_path)
    before = {ledger: ledger.read_bytes()}
    flag = ["--allow-errors"] if allow_errors else []

    result = _bea(tmp_path, "--file", str(ledger), "add", *COMMANDS[name], *flag, json_output=json_output)
    headline, text = _refusal(result, json_output)

    assert headline == PAD_HEADLINE, text
    assert "leave the ledger invalid" not in text
    assert "Pass --allow-errors" not in text and "write anyway" not in text
    assert f"{ledger}:4: Invalid reference to inactive account 'Assets:Bank'" in text, text
    assert f"{ledger}:4: Invalid reference to inactive account 'Equity:Opening'" in text, text
    assert "Correct the pad date" in text, text
    if allow_errors:
        assert "Pad accounts must be active, even with --allow-errors." in text, text
    else:
        # The flag is named once, by the headline's warning not to reach for it (w5/395).
        assert "Pad accounts must be open on the pad date, 2025-12-20." in text, text
        assert text.count("--allow-errors") == 1, text
    _assert_untouched(tmp_path, before)


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_staging_a_pad_with_the_flag_blames_the_existing_pad(tmp_path: Path, json_output: bool) -> None:
    """The staged pad's own `Unused Pad` is the documented carve-out; only the old pad blocks."""
    ledger = _pad_books(tmp_path)
    before = {ledger: ledger.read_bytes()}
    pad = ("pad", "--date", "2026-01-05", "-a", "Assets:Bank", "-s", "Equity:Opening", "--allow-errors")

    headline, text = _refusal(_bea(tmp_path, "--file", str(ledger), "add", *pad, json_output=json_output), json_output)

    assert headline == PAD_HEADLINE, text
    assert "Proposed append" not in text, text
    _assert_untouched(tmp_path, before)


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_an_allow_errors_import_blames_the_existing_pad(tmp_path: Path, json_output: bool) -> None:
    ledger = _pad_books(tmp_path)
    (tmp_path / "bank.txt").write_text("fee\n")
    (tmp_path / "importers.py").write_text(IMPORTER)
    before = {ledger: ledger.read_bytes()}

    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "import",
        "bank.txt",
        "--config",
        "importers.py",
        "--apply",
        "--allow-errors",
        json_output=json_output,
    )
    headline, text = _refusal(result, json_output)

    assert headline == PAD_HEADLINE, text
    assert "leave the ledger invalid" not in text
    assert f"{ledger}:4: Invalid reference to inactive account 'Assets:Bank'" in text, text
    _assert_untouched(tmp_path, before)


@pytest.mark.parametrize("allow_errors", [False, True], ids=["strict", "allow-errors"])
@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_a_harmless_write_blames_an_existing_syntax_error(
    tmp_path: Path, json_output: bool, allow_errors: bool
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text('include "broken.bean"\n2026-01-01 open Assets:Bank USD\n')
    broken = tmp_path / "broken.bean"
    broken.write_text('2026-01-02 * "Fee"\n  Assets:Bank\n2026-01-03 open\n2026-01-04 note Assets:Bank "Called"\n')
    before = {path: path.read_bytes() for path in (ledger, broken)}
    flag = ["--allow-errors"] if allow_errors else []

    result = _bea(tmp_path, "--file", str(ledger), "add", *COMMANDS["open"], *flag, json_output=json_output)
    headline, text = _refusal(result, json_output)

    assert headline == SYNTAX_HEADLINE, text
    assert f"{broken}:4: syntax error, unexpected EOL" in text, text
    assert "leave the ledger invalid" not in text
    _assert_untouched(tmp_path, before)


@pytest.mark.parametrize("json_output", [False, True], ids=["human", "json"])
def test_a_write_that_references_an_inactive_account_is_still_the_change(tmp_path: Path, json_output: bool) -> None:
    """Control: the same ledger, but the write is dated before its accounts open."""
    ledger = _pad_books(tmp_path)
    before = {ledger: ledger.read_bytes()}
    early = ("transaction", "Lunch", "--date", "2025-12-25", "-p", "Assets:Bank -5 USD", "-p", "Equity:Opening")

    strict, strict_text = _refusal(
        _bea(tmp_path, "--file", str(ledger), "add", *early, json_output=json_output), json_output
    )
    allowed, allowed_text = _refusal(
        _bea(tmp_path, "--file", str(ledger), "add", *early, "--allow-errors", json_output=json_output), json_output
    )

    assert strict == "The change would leave the ledger invalid; nothing was written.", strict_text
    assert allowed == "The change would introduce 2 new ledger error(s); nothing was written.", allowed_text
    for text in (strict_text, allowed_text):
        assert "already has" not in text
        assert "Proposed append (not written): Invalid reference to inactive account" in text, text
    _assert_untouched(tmp_path, before)
