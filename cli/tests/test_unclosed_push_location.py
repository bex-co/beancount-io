"""A `pushtag` or `pushmeta` never closed is reported at the push, with its remedy (w1/345).

Beancount's grammar reports both at line 0 of their file
(`trips.bean:0: Unbalanced metadata key 'trip'; ...`), a line that does not
exist, on every surface: `check`, `--json check`, strict-read refusals,
`--allow-errors` warnings and `init --existing`. The append refusal already
named the line (w5/464); every other surface now names it too.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from bea_engine.query import format_error, unclosed_push

ROOT = Path(__file__).resolve().parents[1]

MAIN = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Expenses:Food USD\n"
    'include "trips.bean"\n'
)
ENTRIES = (
    '2026-02-03 * "Taxi"\n  Expenses:Food  12.00 USD\n  Assets:Cash\n'
    '2026-02-04 * "Dinner"\n  Expenses:Food  40.00 USD\n  Assets:Cash\n'
)
# The `pushmeta` is never popped; the `pushtag` beside it is.
META = 'pushtag #berlin-2026\npushmeta trip: "Berlin"\n' + ENTRIES + "poptag #berlin-2026\n"
# The `pushtag` is never popped; the `pushmeta` beside it is.
TAG = 'pushmeta trip: "Berlin"\npushtag #berlin-2026\n' + ENTRIES + "popmeta trip:\n"
EXPECTED = {
    "meta": (
        "Unbalanced metadata key 'trip'; leftover metadata 'Berlin'. "
        "Close it with `popmeta trip:` after the last entry it should cover."
    ),
    "tag": (
        "Unbalanced pushed tag: 'berlin-2026'. "
        "Close it with `poptag #berlin-2026` after the last entry it should cover."
    ),
}
KINDS = pytest.mark.parametrize("kind", ["meta", "tag"])


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path / "books",
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, trips: str) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(MAIN)
    (books / "trips.bean").write_text(trips)
    return books.resolve()


def _located(books: Path, kind: str) -> str:
    return f"{books / 'trips.bean'}:2: {EXPECTED[kind]}"


@KINDS
def test_json_check_and_plain_check_name_the_push(tmp_path: Path, kind: str) -> None:
    books = _books(tmp_path, META if kind == "meta" else TAG)

    as_json = _bea(tmp_path, "--json", "--file", "main.bean", "check")
    plain = _bea(tmp_path, "--file", "main.bean", "check")

    assert as_json.returncode == 1, as_json.stderr
    assert json.loads(as_json.stderr)["error"]["details"] == [_located(books, kind)]
    assert plain.returncode == 1
    assert plain.stderr.splitlines() == [f"Error: {books / 'main.bean'}: 1 error(s).", f"  {_located(books, kind)}"]


@KINDS
def test_a_strict_read_refusal_and_an_allow_errors_warning_name_the_push(tmp_path: Path, kind: str) -> None:
    books = _books(tmp_path, META if kind == "meta" else TAG)
    before = (books / "trips.bean").read_bytes()

    refused = _bea(tmp_path, "--file", "main.bean", "report", "income-statement")
    allowed = _bea(tmp_path, "--file", "main.bean", "list", "transaction", "--allow-errors")

    assert refused.returncode == 1
    assert f"  {_located(books, kind)}" in refused.stderr.splitlines()
    assert allowed.returncode == 0, allowed.stderr
    assert _located(books, kind) in allowed.stderr.splitlines()
    assert ":0:" not in refused.stderr + allowed.stderr
    assert (books / "trips.bean").read_bytes() == before


@KINDS
def test_init_existing_records_and_shows_the_push_line(tmp_path: Path, kind: str) -> None:
    books = _books(tmp_path, META if kind == "meta" else TAG)

    described = _bea(tmp_path, "--json", "init", "--existing", "main.bean")

    assert described.returncode == 0, described.stderr
    data = json.loads(described.stdout)["data"]
    assert data["errors"] == [{"file": str(books / "trips.bean"), "line": 2, "message": EXPECTED[kind], "option": None}]
    assert data["attention"][0]["location"] == "trips.bean:2"

    (books / "AGENTS.md").unlink()
    (books / "CLAUDE.md").unlink()
    shown = _bea(tmp_path, "init", "--existing", "main.bean")

    assert shown.returncode == 0, shown.stderr
    assert f"  trips.bean:2: {EXPECTED[kind]}" in shown.stdout.splitlines()


@pytest.mark.parametrize(
    ("trips", "expected"),
    [
        (
            "pushtag #trip\n" + ENTRIES + "pushtag #trip\npoptag #trip\n",
            "1: Unbalanced pushed tag: 'trip'. Close it with `poptag #trip` after the last entry it should cover.",
        ),
        (
            'pushmeta trip: "a"\n' + ENTRIES + 'pushmeta trip: "b"\npopmeta trip:\n',
            "1: Unbalanced metadata key 'trip'; leftover metadata 'a'. "
            "Close it with `popmeta trip:` after the last entry it should cover.",
        ),
        (
            'pushmeta trip: "a"\n' + ENTRIES + 'pushmeta trip: "b"\n',
            "1: Unbalanced metadata key 'trip'; leftover metadata 'a, b'; also left open at line 8. "
            "Close each with `popmeta trip:` after the last entry it should cover.",
        ),
    ],
    ids=["tag-pushed-twice-popped-once", "meta-pushed-twice-popped-once", "meta-pushed-twice-never-popped"],
)
def test_a_repeated_push_names_the_one_left_open(tmp_path: Path, trips: str, expected: str) -> None:
    books = _books(tmp_path, trips)

    result = _bea(tmp_path, "--json", "--file", "main.bean", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [f"{books / 'trips.bean'}:{expected}"]


def test_a_pop_without_push_keeps_its_own_line(tmp_path: Path) -> None:
    books = _books(tmp_path, ENTRIES + "poptag #nope\n")

    result = _bea(tmp_path, "--json", "--file", "main.bean", "check")

    assert result.returncode == 1, result.stderr
    assert json.loads(result.stderr)["error"]["details"] == [
        f"{books / 'trips.bean'}:7: Attempting to pop absent tag: 'nope'"
    ]


def test_native_options_keep_bean_check_output(tmp_path: Path) -> None:
    books = _books(tmp_path, META)

    result = _bea(tmp_path, "--file", "main.bean", "check", "--json")

    assert result.returncode == 1
    assert json.loads(result.stdout)["errors"] == [
        {
            "message": "Unbalanced metadata key 'trip'; leftover metadata 'Berlin'",
            "filename": str(books / "trips.bean"),
            "lineno": 0,
        }
    ]


def test_a_file_that_cannot_be_read_again_keeps_line_zero(tmp_path: Path) -> None:
    gone = str(tmp_path / "gone.bean")
    error = SimpleNamespace(source={"filename": gone, "lineno": 0}, message="Unbalanced pushed tag: 'trip'")

    assert unclosed_push(error) is None
    assert format_error(error) == f"{gone}:0: Unbalanced pushed tag: 'trip'"
