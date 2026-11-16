"""An include the loader cannot read fails in one line, as an unreadable root does (w5/120).

The snapshot of the include graph read every member with no `OSError`
handling, so a file without read permission, a directory or a broken symlink
in an include's place reached the catch-all: exit 1 "validation" with
`PermissionError: [Errno 13] …` from every read and write, and a Python
traceback from native `bean-check`. Each now exits 2 naming the include and
the file that includes it, in text and under `--json`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

MAIN = '2026-01-01 open Assets:Checking USD\ninclude "sub/apr.bean"\n'
NOTE = '2026-04-01 note Assets:Checking "x"\n'


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
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _no_permission(include: Path) -> None:
    include.write_text(NOTE)
    include.chmod(0o000)
    if os.access(include, os.R_OK):
        include.chmod(0o644)
        pytest.skip("this user reads files whatever their mode")


def _directory(include: Path) -> None:
    include.mkdir()


def _broken_symlink(include: Path) -> None:
    include.symlink_to(include.with_name("nowhere.bean"))


CASES: dict[str, tuple[Callable[[Path], None], str]] = {
    "no-permission": (_no_permission, "Permission denied"),
    "directory": (_directory, "it is a directory, not a file"),
    "broken-symlink": (_broken_symlink, "it is a broken symbolic link"),
}
COMMANDS: dict[str, list[str]] = {
    "list": ["list", "note"],
    "balance-allow-errors": ["balance", "--allow-errors"],
    "check": ["check"],
    "check-verbose": ["check", "-v"],
    "query": ["query", "SELECT account"],
    "add": ["add", "note", "--account", "Assets:Checking", "--comment", "y", "--date", "2026-05-01"],
}


@pytest.fixture
def books(tmp_path: Path, request: pytest.FixtureRequest) -> Iterator[Path]:
    main = tmp_path / "books" / "main.bean"
    include = main.parent / "sub" / "apr.bean"
    include.parent.mkdir(parents=True)
    main.write_text(MAIN)
    CASES[request.param][0](include)
    yield main
    if include.is_file() and not include.is_symlink():
        include.chmod(0o644)


def _assert_named(message: str, main: Path, reason: str) -> None:
    include = main.parent / "sub" / "apr.bean"
    assert f"Included file '{include}' (included from '{main}') is not readable: {reason}." in message
    for leak in ("Traceback", "PermissionError", "IsADirectoryError", "FileNotFoundError", "Errno", "--debug"):
        assert leak not in message


@pytest.mark.parametrize("books", CASES, indirect=True)
@pytest.mark.parametrize("command", COMMANDS)
def test_text_commands_name_the_include_in_one_line(
    tmp_path: Path, books: Path, command: str, request: pytest.FixtureRequest
) -> None:
    reason = CASES[request.node.callspec.params["books"]][1]
    before = books.read_bytes()

    result = _bea(tmp_path, "--file", str(books), *COMMANDS[command])

    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    assert len(result.stderr.strip().splitlines()) == 1, result.stderr
    assert result.stderr.startswith("Error: Included file ")
    _assert_named(result.stderr, books, reason)
    assert books.read_bytes() == before


@pytest.mark.parametrize("books", CASES, indirect=True)
@pytest.mark.parametrize("command", ["list", "balance-allow-errors", "check", "add"])
def test_json_commands_report_a_usage_error(
    tmp_path: Path, books: Path, command: str, request: pytest.FixtureRequest
) -> None:
    reason = CASES[request.node.callspec.params["books"]][1]

    result = _bea(tmp_path, "--json", "--file", str(books), *COMMANDS[command])

    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert (error["category"], error["exit_code"]) == ("usage", 2)
    _assert_named(error["message"], books, reason)


def test_a_readable_include_still_loads(tmp_path: Path) -> None:
    main = tmp_path / "main.bean"
    (tmp_path / "sub").mkdir()
    main.write_text(MAIN)
    (tmp_path / "sub" / "apr.bean").write_text(NOTE)

    listed = _bea(tmp_path, "--json", "--file", str(main), "list", "note")
    checked = _bea(tmp_path, "--file", str(main), "check")

    assert listed.returncode == 0, listed.stderr
    assert [row["comment"] for row in json.loads(listed.stdout)["data"]] == ["x"]
    assert (checked.returncode, checked.stderr) == (0, "")


def test_an_include_matching_nothing_stays_a_ledger_error(tmp_path: Path) -> None:
    main = tmp_path / "main.bean"
    main.write_text(MAIN)

    listed = _bea(tmp_path, "--file", str(main), "list", "note")
    tolerated = _bea(tmp_path, "--json", "--file", str(main), "balance", "--allow-errors")
    checked = _bea(tmp_path, "--file", str(main), "check")

    assert listed.returncode == 1
    assert f'{main}:2: include "sub/apr.bean" matches no file' in listed.stderr
    assert tolerated.returncode == 0, tolerated.stderr
    assert checked.returncode == 1
    assert f'{main}:2: include "sub/apr.bean" matches no file' in checked.stderr
    assert "Traceback" not in checked.stderr


def test_an_unreadable_root_keeps_its_own_message(tmp_path: Path) -> None:
    main = tmp_path / "main.bean"
    (tmp_path / "sub").mkdir()
    main.write_text(MAIN)
    (tmp_path / "sub" / "apr.bean").write_text(NOTE)
    main.chmod(0o000)
    try:
        if os.access(main, os.R_OK):
            pytest.skip("this user reads files whatever their mode")
        result = _bea(tmp_path, "--file", str(main), "list", "note")
    finally:
        main.chmod(0o644)

    assert result.returncode == 2
    assert f"Path '{main}' is not readable." in result.stderr
    assert "Included file" not in result.stderr
