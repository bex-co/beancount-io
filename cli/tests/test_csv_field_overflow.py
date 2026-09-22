"""A CSV row wider than its header is refused, not silently truncated (w3/405).

`open_records` keyed each row by enumerating the headers, so everything past
the last one vanished and the surviving cells shifted. An unquoted thousands
separator turned `2026-01-02,-1,234.56,Coffee` into a transaction of `-1 USD`
narrated `234.56` — which imports, balances, and passes `bea check`. The
original description was simply gone.

Such a row is structurally ambiguous (a quoting mistake, or the wrong
delimiter), so it is refused before anything is written rather than guessed at.

Surplus cells that are empty stay tolerated: a trailing delimiter is common and
loses no data. That keeps this to the reported defect rather than a change of
short-row policy, which is pinned here too.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
"""
HEADER = "Date,Amount,Description\n"


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


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _csv(tmp_path: Path, name: str, body: str) -> Path:
    path = tmp_path / name
    path.write_text(HEADER + body, encoding="utf-8")
    return path


def _import(tmp_path: Path, ledger: Path, source: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "date=Date,amount=Amount,narration=Description",
        "--delimiter",
        ",",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *extra,
    )


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.mark.parametrize("apply_write", [False, True], ids=["preview", "apply"])
def test_a_wider_row_is_refused(tmp_path: Path, ledger: Path, apply_write: bool) -> None:
    source = _csv(tmp_path, "bank.csv", "2026-01-02,-1,234.56,Coffee\n")
    before = _digest(ledger)

    done = _import(tmp_path, ledger, source, *(("--apply",) if apply_write else ()))

    assert done.returncode == 2, done.stdout
    error = json.loads(done.stderr)["error"]
    assert error["category"] == "usage"
    assert "4 fields but the header declares 3" in error["message"]
    assert "Line 2 of bank.csv" in error["message"], "name the file and physical line"
    assert "'Coffee'" in error["message"], "name what would have been lost"
    assert any("must be quoted" in detail for detail in error["details"])
    assert _digest(ledger) == before


def test_nothing_is_appended_when_a_later_row_overflows(tmp_path: Path, ledger: Path) -> None:
    """A good row before the bad one must not land on its own."""
    source = _csv(tmp_path, "mix.csv", "2026-01-02,-5.00,Good\n2026-01-03,-1,234.56,Bad\n")
    before = _digest(ledger)

    done = _import(tmp_path, ledger, source, "--apply")

    assert done.returncode == 2
    assert "Line 3" in json.loads(done.stderr)["error"]["message"]
    assert _digest(ledger) == before, "no partial append"


def test_the_correctly_quoted_amount_still_imports(tmp_path: Path, ledger: Path) -> None:
    """The control: this is what the user should have written, and it works."""
    source = _csv(tmp_path, "ok.csv", '2026-01-02,"-1,234.56",Coffee\n')

    done = _import(tmp_path, ledger, source, "--apply")

    assert done.returncode == 0, done.stderr
    written = ledger.read_text(encoding="utf-8")
    assert "-1234.56 USD" in written
    assert '"Coffee"' in written, "the description survives"


@pytest.mark.parametrize(
    ("body", "reason"),
    [
        pytest.param("2026-01-02,-5.00,Coffee,\n", "a trailing delimiter loses no data", id="trailing-empty"),
        pytest.param("2026-01-02,-5.00,Coffee,,\n", "several empty cells are still empty", id="several-empty"),
        pytest.param("2026-01-02,-5.00\n", "short rows keep padding with empty", id="short-row"),
        pytest.param("2026-01-02,-5.00,Coffee\n", "the ordinary shape", id="exact-width"),
    ],
)
def test_rows_that_lose_nothing_are_still_accepted(tmp_path: Path, ledger: Path, body: str, reason: str) -> None:
    source = _csv(tmp_path, "fine.csv", body)

    done = _import(tmp_path, ledger, source, "--apply")

    assert done.returncode == 0, f"{reason}: {done.stderr}"
    assert "-5.00 USD" in ledger.read_text(encoding="utf-8")


def test_a_quoted_field_containing_the_delimiter_is_not_an_overflow(tmp_path: Path, ledger: Path) -> None:
    """Quoting is what makes width unambiguous; it must keep working."""
    source = _csv(tmp_path, "quoted.csv", '2026-01-02,-5.00,"Coffee, black"\n')

    done = _import(tmp_path, ledger, source, "--apply")

    assert done.returncode == 0, done.stderr
    assert '"Coffee, black"' in ledger.read_text(encoding="utf-8")


def test_a_declared_but_unmapped_column_is_still_fine(tmp_path: Path, ledger: Path) -> None:
    """Width is judged against the header, not against the mapping."""
    source = tmp_path / "extra.csv"
    source.write_text("Date,Amount,Description,Category\n2026-01-02,-5.00,Coffee,Food\n", encoding="utf-8")

    done = _import(tmp_path, ledger, source, "--apply")

    assert done.returncode == 0, done.stderr
    assert "-5.00 USD" in ledger.read_text(encoding="utf-8")


def test_automatic_mapping_refuses_it_too(tmp_path: Path, ledger: Path) -> None:
    """Both mappings converge on the one reader, so both must refuse."""
    source = _csv(tmp_path, "bank.csv", "2026-01-02,-1,234.56,Coffee\n")

    done = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        "auto",
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        "--apply",
    )

    assert done.returncode == 2, done.stdout
    assert "fields but the header declares" in json.loads(done.stderr)["error"]["message"]
