"""`doctor` reads its operands wherever the options sit (w3/403).

w3/355 made `context`, `linked` and `region` resolve a relative location
against the root ledger's directory, so `txns/jan.bean:1:3` works from outside
the books tree — exactly how the ledger's own `include` spells that file.

`_located_against_ledger` found the ledger by looking for an argument naming an
existing file and then assumed the **next** argument was the location. Click
accepts options between operands, so `doctor region BOOKS --conversion cost
LOC` made `--conversion` the "location": no resolution happened, and the
empty-scope message named `cost` as the region.

Operands are now identified by walking the argv with upstream's own option
grammar, which the last test pins against `beancount.scripts.doctor`.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from cli.commands.doctor import _VALUE_OPTIONS, _located_against_ledger, _positionals

ROOT = Path(__file__).resolve().parents[1]

MAIN = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
include "txns/jan.bean"
"""
JAN = """2026-01-02 * "Lunch"
  Assets:Cash -5.50 USD
  Expenses:Food
"""

REGION = "txns/jan.bean:1:3"


@pytest.fixture
def books(tmp_path: Path) -> tuple[Path, Path]:
    """A split ledger, plus a sibling working directory that has no `txns/`.

    `tmp_path` is a real directory rather than anything under `/tmp`, which on
    macOS is a symlink to `/private/tmp` — passing a `/tmp/...` path makes
    upstream compare it against the `/private/...` filename the loader
    recorded, and nothing matches for reasons unrelated to this fix.
    """
    root = tmp_path / "books"
    (root / "txns").mkdir(parents=True)
    (root / "main.bean").write_text(MAIN, encoding="utf-8")
    (root / "txns" / "jan.bean").write_text(JAN, encoding="utf-8")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    return root / "main.bean", elsewhere


def _bea(cwd: Path, tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.mark.parametrize(
    "argv",
    [
        pytest.param(("{ledger}", "--conversion", "cost", REGION), id="option-between-operands"),
        pytest.param(("{ledger}", "--conversion=cost", REGION), id="equals-form-between-operands"),
        pytest.param(("--conversion", "cost", "{ledger}", REGION), id="option-first"),
        pytest.param(("{ledger}", REGION, "--conversion", "cost"), id="option-last"),
        pytest.param(("{ledger}", REGION), id="no-option"),
    ],
)
def test_every_option_placement_finds_the_region(
    tmp_path: Path, books: tuple[Path, Path], argv: tuple[str, ...]
) -> None:
    ledger, elsewhere = books

    done = _bea(elsewhere, tmp_path, "doctor", "region", *(part.format(ledger=ledger) for part in argv))

    assert done.returncode == 0, done.stderr or done.stdout
    assert "-5.50 USD" in done.stdout, done.stdout
    assert "Net Income: (-5.50 USD)" in done.stdout


def test_the_empty_scope_message_names_the_region(tmp_path: Path, books: tuple[Path, Path]) -> None:
    """It used to name the option's value, because that looked like an operand."""
    ledger, elsewhere = books

    done = _bea(elsewhere, tmp_path, "doctor", "region", str(ledger), "--conversion", "cost", "txns/jan.bean:99:99")

    assert done.returncode == 1
    assert "txns/jan.bean:99:99" in done.stderr, done.stderr
    assert "for 'cost'" not in done.stderr


class TestOperandReading:
    @pytest.mark.parametrize(
        ("args", "expected"),
        [
            pytest.param(["books.bean", "--conversion", "cost", "loc:1:2"], ["books.bean", "loc:1:2"], id="middle"),
            pytest.param(["books.bean", "--conversion=cost", "loc:1:2"], ["books.bean", "loc:1:2"], id="equals"),
            pytest.param(["--conversion", "cost", "books.bean", "loc:1:2"], ["books.bean", "loc:1:2"], id="first"),
            pytest.param(["books.bean", "loc:1:2", "--conversion", "cost"], ["books.bean", "loc:1:2"], id="last"),
            pytest.param(["books.bean", "loc:1:2"], ["books.bean", "loc:1:2"], id="none"),
            pytest.param(["--", "-weird.bean", "loc:1:2"], ["-weird.bean", "loc:1:2"], id="after-double-dash"),
        ],
    )
    def test_operands_are_found_wherever_options_sit(self, args: list[str], expected: list[str]) -> None:
        assert _positionals(args) == expected

    def test_a_relative_location_resolves_past_an_interposed_option(self, books: tuple[Path, Path]) -> None:
        ledger, _ = books

        resolved = _located_against_ledger("region", [str(ledger), "--conversion", "cost", REGION])

        assert resolved[-1] == f"{ledger.parent / 'txns' / 'jan.bean'}:1:3"
        assert resolved[1:3] == ["--conversion", "cost"], "the option and its value are untouched"

    def test_a_location_that_already_resolves_is_left_alone(self, tmp_path: Path, books: tuple[Path, Path]) -> None:
        """The rule w3/355 set: only turn a guaranteed failure into an answer."""
        ledger, _ = books
        absolute = f"{ledger.parent / 'txns' / 'jan.bean'}:1:3"

        assert _located_against_ledger("region", [str(ledger), absolute])[-1] == absolute

    def test_a_line_only_region_is_left_alone(self, books: tuple[Path, Path]) -> None:
        ledger, _ = books

        assert _located_against_ledger("region", [str(ledger), "--conversion", "cost", "1:3"])[-1] == "1:3"


def test_the_option_grammar_still_matches_upstream() -> None:
    """`_VALUE_OPTIONS` is copied from beancount; catch it drifting.

    The frontend may not import beancount, so the list is restated there. This
    test runs where the import is allowed and checks the copy is still right:
    every value-taking option on these three operations, and no boolean flags
    to confuse an operand for a value.
    """
    from beancount.scripts import doctor

    expected: set[str] = set()
    for name in ("context", "linked", "region"):
        for param in doctor.doctor.commands[name].params:
            if type(param).__name__ != "Option":
                continue
            assert not param.is_flag, f"{name} gained a boolean flag; operand reading must account for it"
            expected.update(opt for opt in param.opts if opt.startswith("--"))

    assert set(_VALUE_OPTIONS) == expected
