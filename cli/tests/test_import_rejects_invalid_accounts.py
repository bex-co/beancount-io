"""An unopenable account name is a usage error, not an unopened account (w3/386).

`bea import` never validated the account names it was given, so a name the
loader could never accept — a space, a lowercase root, an illegal character —
was simply absent from the set of open accounts. Every row came back `blocked`
with "Account 'Bogus Account' is not open" and a `bea add open …` remedy that
`bea add` itself refuses, emitted unquoted so a shell would not even parse it.

Both halves were wrong: the account is not *unopened*, it is *unopenable*, and
no `open` directive can change that. The validator was already there —
`parse_account`, used throughout the `add` family — just never called on the
import path.

A name that is well-formed but merely unopened keeps the old `blocked` row and
its working remedy; that is the control here.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Bank:Checking USD
2020-01-01 open Expenses:Food USD
2020-01-01 open Expenses:Uncategorized USD
"""

CSV = "Date,Amount,Description\n2026-02-01,-1.00,a\n2026-02-02,-2.00,b\n"

INVALID = ["Bogus Account", "assets:checking", "Assets:Check!ng", "Bogus"]


@pytest.fixture
def books(tmp_path: Path) -> tuple[Path, Path]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    source = tmp_path / "bank.csv"
    source.write_text(CSV, encoding="utf-8")
    return ledger, source


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


def _import(tmp_path: Path, ledger: Path, source: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "--no-input", "--file", str(ledger), "import", str(source), "--csv", "auto", *extra)


@pytest.mark.parametrize("name", INVALID)
def test_invalid_source_account_is_refused(tmp_path: Path, books: tuple[Path, Path], name: str) -> None:
    ledger, source = books

    refused = _import(tmp_path, ledger, source, "--account", name)

    assert refused.returncode == 2, refused.stdout
    assert "--account:" in refused.stderr
    assert f"Invalid account {name!r}" in refused.stderr
    assert "is not open" not in refused.stderr, "an unopenable name is not an unopened one"
    assert "bea add open" not in refused.stderr, "the remedy would not work; do not offer it"


@pytest.mark.parametrize("name", INVALID)
def test_invalid_default_account_is_refused(tmp_path: Path, books: tuple[Path, Path], name: str) -> None:
    ledger, source = books

    refused = _import(tmp_path, ledger, source, "--account", "Assets:Bank:Checking", "--default-account", name)

    assert refused.returncode == 2, refused.stdout
    assert "--default-account:" in refused.stderr
    assert f"Invalid account {name!r}" in refused.stderr
    assert "is not open" not in refused.stderr


def test_invalid_rules_account_names_the_rule(tmp_path: Path, books: tuple[Path, Path]) -> None:
    ledger, source = books
    rules = tmp_path / "rules.toml"
    rules.write_text(
        '[[rule]]\nmatch = "a"\naccount = "Expenses:Food"\n\n[[rule]]\nmatch = ".*"\naccount = "Bogus Account"\n',
        encoding="utf-8",
    )

    refused = _import(tmp_path, ledger, source, "--account", "Assets:Bank:Checking", "--rules", str(rules))

    assert refused.returncode == 2, refused.stdout
    assert "Rule 2:" in refused.stderr, "the rule number is what says which line to fix"
    assert "Invalid account 'Bogus Account'" in refused.stderr


def test_nothing_is_written_by_a_refused_import(tmp_path: Path, books: tuple[Path, Path]) -> None:
    ledger, source = books
    before = ledger.read_bytes()

    assert _import(tmp_path, ledger, source, "--account", "Bogus Account", "--apply").returncode == 2
    assert ledger.read_bytes() == before


def test_valid_but_unopened_account_still_blocks_with_a_working_remedy(
    tmp_path: Path, books: tuple[Path, Path]
) -> None:
    """The control: this case was always right and must not become a hard error."""
    ledger, source = books

    preview = _import(
        tmp_path,
        ledger,
        source,
        "--account",
        "Assets:Bank:Checking",
        "--default-account",
        "Expenses:NeverOpened",
    )

    assert preview.returncode == 0, preview.stderr
    assert "blocked" in preview.stdout
    assert "Account 'Expenses:NeverOpened' is not open" in preview.stdout
    assert "bea add open --account Expenses:NeverOpened" in preview.stdout


def test_the_offered_remedy_actually_opens_the_account(tmp_path: Path, books: tuple[Path, Path]) -> None:
    """Run the suggestion and require the next import to go green."""
    ledger, source = books
    blocked = _import(
        tmp_path,
        ledger,
        source,
        "--account",
        "Assets:Bank:Checking",
        "--default-account",
        "Expenses:NeverOpened",
    )
    assert blocked.returncode == 0, blocked.stderr

    opened = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "open",
        "--account",
        "Expenses:NeverOpened",
        "--date",
        "2026-02-01",
        "-c",
        "USD",
    )
    assert opened.returncode == 0, opened.stderr

    after = _import(
        tmp_path,
        ledger,
        source,
        "--account",
        "Assets:Bank:Checking",
        "--default-account",
        "Expenses:NeverOpened",
    )
    assert after.returncode == 0, after.stderr
    assert "2 ready" in after.stdout
    assert "blocked" not in after.stdout


def test_a_category_column_keeps_its_graceful_fallback(tmp_path: Path, books: tuple[Path, Path]) -> None:
    """The control the note names: a bad *category* is not a bad *account option*."""
    ledger, _ = books
    source = tmp_path / "cat.csv"
    source.write_text("Date,Amount,Description,Category\n2026-02-01,-1.00,a,Bogus Account\n", encoding="utf-8")

    preview = _bea(
        tmp_path,
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "date=Date,amount=Amount,narration=Description,category=Category",
        "--account",
        "Assets:Bank:Checking",
    )

    assert preview.returncode == 0, preview.stderr
    assert "1 ready" in preview.stdout
    assert "not an account name" in preview.stderr, "the fallback is a note, not a refusal"
