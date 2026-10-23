"""`init --currency` follows the loader's commodity tokens, including single letters (w3/411, w5/693).

The validator required two characters (`[A-Z][A-Z0-9'._-]*[A-Z0-9]`), so a
single-letter ticker like `F` or `C` was refused — even though Beancount
accepts it, `bea check` validates a ledger using it, and `USAGE.md` says
symbols follow Beancount syntax rather than an ISO registry.

Upstream's public `CURRENCY_RE` is broader than its lexer: it accepts a final
underscore that a ledger cannot load. The frontend loads no Beancount, so its
pattern is restated there. An exhaustive small alphabet is checked by loading
real open directives, and the accepted edge cases create and check full ledgers.

The leading-`/` commodity-pair form is deliberately still refused: it is not an
operating currency, and accepting it would be the wider policy change this was
scoped to avoid.
"""

from __future__ import annotations

import itertools
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from cli.commands.init import _CURRENCY_SYMBOL

ROOT = Path(__file__).resolve().parents[1]

SYMBOL_ALPHABET = "AZ09'._-f"


def test_the_pattern_matches_real_loader_tokens() -> None:
    """Every symbol up to three characters is tried in an actual open directive.

    The `/` form is excluded: that is upstream's commodity-pair alternative,
    which `--currency` refuses on purpose.
    """
    from beancount import loader

    disagreements = []
    for length in (1, 2, 3):
        for parts in itertools.product(SYMBOL_ALPHABET, repeat=length):
            symbol = "".join(parts)
            entries, errors, _ = loader.load_string(f"2026-01-01 open Assets:Cash {symbol}\n")
            accepted = not errors and len(entries) == 1 and entries[0].currencies == [symbol]
            if accepted != bool(_CURRENCY_SYMBOL.fullmatch(symbol)):
                disagreements.append(symbol)

    assert disagreements == []


@pytest.mark.parametrize("symbol", ["F", "C", "X", "FE", "USD", "BTC", "NT.TO", "A_B", "A-B", "A'B", "AAPL2"])
def test_valid_symbols_are_accepted(symbol: str) -> None:
    assert _CURRENCY_SYMBOL.fullmatch(symbol), symbol


@pytest.mark.parametrize("symbol", ["1F", "A.", "A-", "X_", "AB_", "", "US D", "/OIL", "-A"])
def test_invalid_symbols_are_still_refused(symbol: str) -> None:
    assert not _CURRENCY_SYMBOL.fullmatch(symbol), symbol


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("BEA_") and key not in {"CI", "BEANCOUNT_LOAD_CACHE_FILENAME"}
    }
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        BEA_UPDATE_API_URL="http://127.0.0.1:9",
        BEA_TAP_FORMULA_URL="http://127.0.0.1:9/bea.rb",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.mark.parametrize("symbol", ["F", "C", "NT.TO", "A_B", "A-B", "A'B"])
def test_edge_symbols_create_a_real_opening_balance_ledger_that_checks(tmp_path: Path, symbol: str) -> None:
    ledger = tmp_path / f"books-{symbol}.bean"

    created = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "init",
        str(ledger),
        "--currency",
        symbol,
        "--date",
        "2026-01-01",
        "--opening-balance",
        "Assets:Checking 1.25",
    )

    assert created.returncode == 0, created.stderr
    assert f'option "operating_currency" "{symbol}"' in ledger.read_text(encoding="utf-8")
    assert ["Assets:Checking", "1.25", symbol] in [
        line.split() for line in ledger.read_text(encoding="utf-8").splitlines()
    ]
    checked = _bea(tmp_path, "--json", "--file", str(ledger), "check")
    assert checked.returncode == 0, checked.stderr
    assert json.loads(checked.stdout)["data"]["valid"] is True


@pytest.mark.parametrize(
    ("given", "written"), [("f", "F"), ("  c  ", "C"), ("usd", "USD"), ("  nt.to  ", "NT.TO"), ("a_b", "A_B")]
)
def test_trimming_and_uppercasing_are_preserved(tmp_path: Path, given: str, written: str) -> None:
    ledger = tmp_path / f"books-{written}.bean"

    created = _bea(tmp_path, "--json", "--no-input", "init", str(ledger), "--currency", given, "--date", "2026-01-01")

    assert created.returncode == 0, created.stderr
    assert f'option "operating_currency" "{written}"' in ledger.read_text(encoding="utf-8")
    checked = _bea(tmp_path, "--json", "--file", str(ledger), "check")
    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_the_non_three_letter_warning_still_fires(tmp_path: Path) -> None:
    """Accepting the symbol must not silence the typo check."""
    ledger = tmp_path / "books.bean"

    created = _bea(tmp_path, "--no-input", "init", str(ledger), "--currency", "F", "--date", "2026-01-01")

    assert created.returncode == 0, created.stderr
    assert "not three uppercase letters" in created.stderr


@pytest.mark.parametrize("symbol", ["1F", "A.", "US D", "/OIL"])
def test_a_malformed_symbol_is_refused_without_creating_anything(tmp_path: Path, symbol: str) -> None:
    ledger = tmp_path / "books.bean"

    created = _bea(tmp_path, "--json", "--no-input", "init", str(ledger), "--currency", symbol, "--date", "2026-01-01")

    assert created.returncode == 2, created.stdout
    assert "Invalid operating currency" in created.stderr
    assert not ledger.exists()


@pytest.mark.parametrize("given", ["X_", "AB_", "  ab_  "])
@pytest.mark.parametrize("as_json", [False, True], ids=["human", "json"])
@pytest.mark.parametrize("target", ["directory", "positional-file", "global-file"])
def test_trailing_underscore_refuses_before_creating_files_or_parent_directories(
    tmp_path: Path, given: str, as_json: bool, target: str
) -> None:
    parent = tmp_path / "new-parent"
    destination = parent / "books" if target == "directory" else parent / "nested" / "books.bean"
    command = ["--no-input", *(["--json"] if as_json else [])]
    command += ["--file", str(destination), "init"] if target == "global-file" else ["init", str(destination)]

    done = _bea(tmp_path, *command, "--currency", given, "--date", "2026-01-01")

    assert done.returncode == 2, done.stdout + done.stderr
    assert done.stdout == ""
    if as_json:
        error = json.loads(done.stderr)["error"]
        assert error["category"] == "usage" and error["exit_code"] == 2
        message = error["message"]
    else:
        message = done.stderr
    assert "Invalid operating currency" in message and given.strip().upper() in message
    assert "Invalid token" not in message
    assert not parent.exists()
    assert not list(tmp_path.rglob("*.bean"))


@pytest.mark.parametrize("given", ["TRUE", "FALSE", "NULL", " true ", "Null"])
def test_reserved_literal_words_are_refused_before_creating_anything(tmp_path: Path, given: str) -> None:
    """`TRUE`, `FALSE` and `NULL` are lexer literals, not commodities (w5/935)."""
    parent = tmp_path / "new-parent"

    done = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "init",
        str(parent / "books.bean"),
        "--currency",
        given,
        "--date",
        "2026-01-01",
    )

    assert done.returncode == 2, done.stdout + done.stderr
    assert done.stdout == ""
    assert "reserved word" in done.stderr and given.strip().upper() in done.stderr
    assert not parent.exists()


@pytest.mark.parametrize("symbol", ["TRUE1", "FALSE1", "NULL1", "TRUEX", "NULLS"])
def test_symbols_that_merely_start_with_a_reserved_word_still_create_a_ledger(tmp_path: Path, symbol: str) -> None:
    ledger = tmp_path / "books.bean"

    done = _bea(tmp_path, "--json", "--no-input", "init", str(ledger), "--currency", symbol, "--date", "2026-01-01")

    assert done.returncode == 0, done.stderr
    assert _bea(tmp_path, "--json", "-f", str(ledger), "check").returncode == 0
