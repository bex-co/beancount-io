"""A folder whose root ledger has its own name is pointed at that root (w1/361).

`bea init --existing .` finds `household.beancount` as the guide's sample root:
the one ledger file no other file includes. Every other command in that folder
said "To start new books, run bea init books", and `--file .` and
`bea doctor <op> .` named a `main.bean` that does not exist. Discovery is
unchanged; only the hints now name the root `init --existing` finds.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLE = ROOT.parent / "docs" / "skills" / "examples" / "existing-ledger"
INIT_HINT = "To start new books, run bea init books --currency USD."
ONE_ROOT = (
    "Found household.beancount here, the one ledger file nothing else includes: "
    "pass --file household.beancount, or set BEA_FILE."
)


def _bea(tmp_path: Path, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=120,
    )


def _household(tmp_path: Path) -> Path:
    """The existing-ledger guide's sample books, copied as its step 2 copies them."""
    books = tmp_path / "hh"
    shutil.copytree(SAMPLE, books)
    return books


def _two_roots(tmp_path: Path) -> Path:
    books = tmp_path / "two"
    books.mkdir()
    (books / "accounts.beancount").write_text("2026-01-01 open Assets:Cash USD\n")
    (books / "household.beancount").write_text('option "operating_currency" "USD"\ninclude "accounts.beancount"\n')
    (books / "scratch.beancount").write_text('option "operating_currency" "USD"\n')
    return books


def _snapshot(books: Path) -> dict[str, bytes]:
    return {str(path.relative_to(books)): path.read_bytes() for path in sorted(books.rglob("*")) if path.is_file()}


def test_plain_commands_name_the_root_instead_of_new_books(tmp_path: Path) -> None:
    books = _household(tmp_path)
    before = _snapshot(books)

    for command in (("check",), ("report", "overview"), ("list", "transaction")):
        result = _bea(tmp_path, books, *command)

        assert result.returncode == 2, (command, result.stderr)
        assert "No ledger file at 'main.bean' (from the working directory)." in result.stderr
        assert ONE_ROOT in result.stderr
        assert "init" not in result.stderr
    as_json = _bea(tmp_path, books, "--json", "check")
    envelope = json.loads(as_json.stdout or as_json.stderr)["error"]
    assert envelope["exit_code"] == 2
    assert envelope["message"].endswith(ONE_ROOT)
    # The suggested command loads the ledger: the sample's plugin kept beside
    # it is the one error the guide expects, not a missing ledger.
    followed = _bea(tmp_path, books, "--file", "household.beancount", "check")
    assert followed.returncode == 1, followed.stderr
    assert "household_rules" in followed.stderr
    assert "No ledger file" not in followed.stderr
    assert _snapshot(books) == before


def test_a_directory_given_as_the_ledger_suggests_its_root(tmp_path: Path) -> None:
    books = _household(tmp_path)

    here = _bea(tmp_path, books, "--file", ".", "check")
    above = _bea(tmp_path, tmp_path, "--file", "hh", "check")

    assert here.returncode == 2
    assert here.stderr.strip() == (
        "Error: Ledger path '.' (from --file) is a directory; expected a ledger file. "
        "Point --file to its root ledger, for example --file household.beancount."
    )
    assert above.returncode == 2
    assert "for example --file hh/household.beancount." in above.stderr
    assert "main.bean" not in above.stderr


def test_bea_file_naming_the_directory_gets_the_same_hint(tmp_path: Path) -> None:
    books = _household(tmp_path)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        BEA_FILE=str(books),
        PYTHONPATH=str(ROOT / "src"),
    )

    result = subprocess.run(
        [sys.executable, "-m", "cli.main", "check"],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=120,
    )

    assert result.returncode == 2
    assert "(from $BEA_FILE) is a directory; expected a ledger file." in result.stderr
    assert f"for example --file {books / 'household.beancount'}." in result.stderr


def test_doctor_on_the_folder_suggests_a_command_that_runs(tmp_path: Path) -> None:
    books = _household(tmp_path)

    refused = _bea(tmp_path, books, "doctor", "lex", ".")
    guidance = _bea(tmp_path, tmp_path, "doctor", "guidance", "hh")

    assert refused.returncode == 2
    assert refused.stderr.strip() == (
        "Error: Ledger path '.' is a directory; expected a ledger file. "
        "Pass its root ledger instead, for example bea doctor lex household.beancount."
    )
    assert guidance.returncode == 2
    assert "for example bea doctor guidance hh/household.beancount." in guidance.stderr
    followed = _bea(tmp_path, books, "doctor", "lex", "household.beancount")
    assert followed.returncode == 0, followed.stderr


def test_two_roots_are_both_named_and_one_is_asked_for(tmp_path: Path) -> None:
    books = _two_roots(tmp_path)

    plain = _bea(tmp_path, books, "check")
    directory = _bea(tmp_path, tmp_path, "--file", "two", "check")
    doctor = _bea(tmp_path, tmp_path, "doctor", "lex", "two")

    among = "one of the ledger files there that no other file includes (household.beancount, scratch.beancount), "
    assert plain.returncode == 2
    assert (
        "Found several ledger files here that no other file includes (household.beancount, scratch.beancount): "
        "pass the root one with --file, for example --file household.beancount."
    ) in plain.stderr
    assert "accounts.beancount" not in plain.stderr
    assert "init" not in plain.stderr
    assert directory.returncode == 2
    assert f"Point --file to its root ledger, {among}for example --file two/household.beancount." in directory.stderr
    assert doctor.returncode == 2
    assert f"Pass its root ledger instead, {among}for example bea doctor lex two/household.beancount." in doctor.stderr
    followed = _bea(tmp_path, books, "--file", "household.beancount", "check")
    assert followed.returncode == 0, followed.stderr


def test_the_folder_s_own_root_wins_over_new_books_below_it(tmp_path: Path) -> None:
    # Following the old advice made `books/main.bean` here, and the next
    # refusal pointed at that empty ledger instead of the user's own.
    books = _household(tmp_path)
    made = _bea(tmp_path, books, "--no-input", "init", "books", "--currency", "USD")
    assert made.returncode == 0, made.stderr

    result = _bea(tmp_path, books, "report", "overview")

    assert result.returncode == 2
    assert ONE_ROOT in result.stderr
    assert "books/main.bean" not in result.stderr


def test_main_beancount_and_hidden_or_non_ledger_files_keep_their_hints(tmp_path: Path) -> None:
    named = tmp_path / "named"
    named.mkdir()
    (named / "main.beancount").write_text("2026-01-01 open Assets:Cash USD\n")
    (named / "household.beancount").write_text("2026-01-01 open Assets:Bank USD\n")
    bare = tmp_path / "bare"
    bare.mkdir()
    (bare / ".draft.beancount").write_text("2026-01-01 open Assets:Cash USD\n")
    (bare / "notes.txt").write_text("not a ledger\n")

    directory = _bea(tmp_path, tmp_path, "--file", "named", "check")
    doctor = _bea(tmp_path, tmp_path, "doctor", "lex", "named")
    empty = _bea(tmp_path, bare, "check")
    empty_directory = _bea(tmp_path, tmp_path, "--file", "bare", "check")

    assert "for example --file named/main.beancount." in directory.stderr
    assert "for example bea doctor lex named/main.beancount." in doctor.stderr
    assert empty.returncode == 2
    assert empty.stderr.strip().endswith(INIT_HINT)
    assert ".draft" not in empty.stderr
    assert "for example --file bare/main.bean." in empty_directory.stderr
