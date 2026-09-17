"""Account names that differ only in Unicode normalization (w5/009).

macOS filesystem paths hand out NFD, most editors write NFC, and the two
render identically. The ledger here opens `Expenses:Café` decomposed and every
command is driven with the composed spelling, which is the shape a user hits
when an account name travels through a file path.
"""

from __future__ import annotations

import os
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

NFD = unicodedata.normalize("NFD", "Expenses:Café")
NFC = unicodedata.normalize("NFC", "Expenses:Café")
LEDGER = f"""option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open {NFD} USD

2026-01-05 * "Seed" "x"
  {NFD}   1.00 USD
  Assets:Cash  -1.00 USD
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
        timeout=60,
    )


def _ledger(tmp_path: Path) -> Path:
    path = tmp_path / "nfd.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def test_the_fixture_is_two_spellings_of_one_name() -> None:
    """Without this the rest of the file would pass by testing nothing."""
    assert NFD != NFC
    assert NFD.encode() == b"Expenses:Cafe\xcc\x81"
    assert NFC.encode() == b"Expenses:Caf\xc3\xa9"


def test_ledger_written_in_nfd_is_valid(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "check")
    assert result.returncode == 0, result.stderr


def test_add_names_the_normalization_instead_of_suggesting_an_identical_name(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()

    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "NFC attempt",
        "--date",
        "2026-02-01",
        "-p",
        f"{NFC} 2.00 USD",
        "-p",
        "Assets:Cash -2.00 USD",
    )

    assert result.returncode != 0
    message = result.stderr
    assert "different Unicode normalization" in message
    # Both spellings are quoted as escapes, because that is the only way to
    # show a difference the terminal renders away. Built with ascii() rather
    # than written out, so that normalizing this source file cannot quietly
    # turn the expectation into the thing it is meant to catch.
    assert f"{ascii(NFD)} (NFD)" in message
    assert f"{ascii(NFC)} (NFC)" in message
    # The two suggestions that read as identical text are exactly what this
    # replaces: neither may come back.
    assert "Did you mean" not in message
    assert "bea add open --account" not in message
    # The write is still refused, and the file is untouched.
    assert ledger.read_bytes() == before


def test_add_still_suggests_a_real_typo(tmp_path: Path) -> None:
    """The ordinary near-miss path keeps working — this only replaces the invisible one."""
    result = _bea(
        tmp_path,
        "--file",
        str(_ledger(tmp_path)),
        "add",
        "transaction",
        "typo",
        "--date",
        "2026-02-01",
        "-p",
        "Assets:Csah 2.00 USD",
        "-p",
        "Assets:Cash -2.00 USD",
    )

    assert result.returncode != 0
    assert "Did you mean Assets:Cash?" in result.stderr
    assert "different Unicode normalization" not in result.stderr


def test_add_still_offers_to_open_a_genuinely_absent_account(tmp_path: Path) -> None:
    result = _bea(
        tmp_path,
        "--file",
        str(_ledger(tmp_path)),
        "add",
        "transaction",
        "absent",
        "--date",
        "2026-02-01",
        "-p",
        "Expenses:Totally-Absent 2.00 USD",
        "-p",
        "Assets:Cash -2.00 USD",
    )

    assert result.returncode != 0
    assert "bea add open --account Expenses:Totally-Absent" in result.stderr
    assert "different Unicode normalization" not in result.stderr


def test_list_transaction_filter_matches_across_normalization(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "list", "transaction", "--account", NFC)
    assert result.returncode == 0, result.stderr
    assert "Seed" in result.stdout
    assert "No transactions found." not in result.stdout


def test_list_open_filter_matches_across_normalization(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "list", "open", "--account", NFC)
    assert result.returncode == 0, result.stderr
    assert NFD in result.stdout


def test_balance_filter_matches_across_normalization(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "balance", NFC)
    assert result.returncode == 0, result.stderr
    assert "1.00 USD" in result.stdout


def test_a_filter_that_matches_nothing_still_matches_nothing(tmp_path: Path) -> None:
    """Folding must not turn every filter into a match."""
    result = _bea(tmp_path, "--file", str(_ledger(tmp_path)), "list", "transaction", "--account", "Expenses:Rent")
    assert result.returncode == 0, result.stderr
    assert "No transactions found." in result.stdout


def test_fold_account_twins_agree() -> None:
    """The boundary forbids sharing the helper, so pin that the copies match."""
    from bea_engine.ledger.text import fold_account as engine_fold
    from cli.utils import fold_account as frontend_fold

    for name in (NFC, NFD, "Assets:Cash", "assets:cash", "Expenses:Straße", ""):
        assert engine_fold(name) == frontend_fold(name)
    assert engine_fold(NFC) == engine_fold(NFD)
    assert engine_fold("Assets:Cash") == engine_fold("assets:cash")
    assert engine_fold("Assets:Cash") != engine_fold("Assets:Bank")
