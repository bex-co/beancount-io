"""`init --currency` accepts every symbol the loader does (w3/411).

The validator required two characters (`[A-Z][A-Z0-9'._-]*[A-Z0-9]`), so a
single-letter ticker like `F` or `C` was refused — even though Beancount
accepts it, `bea check` validates a ledger using it, and `USAGE.md` says
symbols follow Beancount syntax rather than an ISO registry.

Upstream's `CURRENCY_RE` makes the final character optional and ends with
`\\b`, which is also why `X_` is a symbol and `A.` is not. The frontend loads
no Beancount, so the pattern is restated there; the first test pins it against
upstream's own regex so the copy cannot drift.

The leading-`/` commodity-pair form is deliberately still refused: it is not an
operating currency, and accepting it would be the wider policy change this was
scoped to avoid.
"""

from __future__ import annotations

import itertools
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

from cli.commands.init import _CURRENCY_SYMBOL

ROOT = Path(__file__).resolve().parents[1]

SYMBOL_ALPHABET = "AZ09'._-f"


def test_the_pattern_matches_upstream_exactly() -> None:
    """Every symbol up to four characters, compared against Beancount's own regex.

    The `/` form is excluded: that is upstream's commodity-pair alternative,
    which `--currency` refuses on purpose.
    """
    from beancount.core.amount import CURRENCY_RE

    upstream = re.compile(CURRENCY_RE)
    disagreements = [
        symbol
        for length in (1, 2, 3, 4)
        for parts in itertools.product(SYMBOL_ALPHABET, repeat=length)
        if bool(upstream.fullmatch(symbol := "".join(parts))) != bool(_CURRENCY_SYMBOL.fullmatch(symbol))
    ]

    assert disagreements == []


@pytest.mark.parametrize("symbol", ["F", "C", "X", "FE", "USD", "BTC", "X_", "A-B", "AAPL2"])
def test_valid_symbols_are_accepted(symbol: str) -> None:
    assert _CURRENCY_SYMBOL.fullmatch(symbol), symbol


@pytest.mark.parametrize("symbol", ["1F", "A.", "A-", "", "US D", "/OIL", "-A"])
def test_invalid_symbols_are_still_refused(symbol: str) -> None:
    assert not _CURRENCY_SYMBOL.fullmatch(symbol), symbol


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


@pytest.mark.parametrize("symbol", ["F", "C"])
def test_a_single_letter_ledger_is_created_and_checks(tmp_path: Path, symbol: str) -> None:
    ledger = tmp_path / f"books-{symbol}.bean"

    created = _bea(tmp_path, "--json", "--no-input", "init", str(ledger), "--currency", symbol, "--date", "2026-01-01")

    assert created.returncode == 0, created.stderr
    assert f'option "operating_currency" "{symbol}"' in ledger.read_text(encoding="utf-8")
    checked = _bea(tmp_path, "--json", "--file", str(ledger), "check")
    assert checked.returncode == 0, checked.stderr
    assert json.loads(checked.stdout)["data"]["valid"] is True


@pytest.mark.parametrize(("given", "written"), [("f", "F"), ("  c  ", "C"), ("usd", "USD")])
def test_trimming_and_uppercasing_are_preserved(tmp_path: Path, given: str, written: str) -> None:
    ledger = tmp_path / f"books-{written}.bean"

    created = _bea(tmp_path, "--json", "--no-input", "init", str(ledger), "--currency", given, "--date", "2026-01-01")

    assert created.returncode == 0, created.stderr
    assert f'option "operating_currency" "{written}"' in ledger.read_text(encoding="utf-8")


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
