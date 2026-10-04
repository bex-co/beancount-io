"""A read-only directory the write does not touch never blocks it (w1/073).

Validation staged a `.bea-*.tmp` copy beside every file in the include graph,
so a read-only shared chart of accounts failed every add with a raw
`[Errno 13]` reported as a validation error (exit 1). Only the destination and
its includers need a copy; a refusal that remains is exit 3 naming the path.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

import pytest

from bea_engine.ledger import write
from bea_engine.protocol import EXIT_AUTH, AuthError

ROOT = Path(__file__).resolve().parents[1]

pytestmark = pytest.mark.skipif(
    sys.platform == "win32" or os.geteuid() == 0, reason="needs POSIX permissions that bind this user"
)

NOTE = '2020-03-01 note Assets:Cash "x"\n'


@contextmanager
def _read_only(directory: Path) -> Iterator[None]:
    directory.chmod(0o555)
    try:
        yield
    finally:
        directory.chmod(0o755)


def _books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    (books / "shared").mkdir(parents=True)
    (books / "w").mkdir()
    (books / "w" / "2020.bean").write_text("")
    root = books / "main.bean"
    root.write_text(
        'include "shared/accounts.bean"\ninclude "w/*.bean"\n'
        '2020-02-01 * "Lunch"\n  Expenses:Food 10 USD\n  Assets:Cash\n'
    )
    (books / "shared" / "accounts.bean").write_text(
        'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n'
    )
    return root


def _leftovers(directory: Path) -> list[str]:
    return sorted(path.name for path in directory.rglob("*bea-*"))


def test_a_read_only_included_directory_does_not_block_a_root_write(tmp_path: Path) -> None:
    root = _books(tmp_path)
    shared = root.parent / "shared"
    before = (shared / "accounts.bean").read_bytes()

    with _read_only(shared):
        write.append(root, [NOTE])

    assert root.read_text().count('note Assets:Cash "x"') == 1
    assert (shared / "accounts.bean").read_bytes() == before
    assert _leftovers(root.parent) == []


def test_a_read_only_included_directory_does_not_block_an_into_write(tmp_path: Path) -> None:
    root = _books(tmp_path)
    root_before = root.read_bytes()

    with _read_only(root.parent / "shared"):
        write.append(root, [NOTE, '2020-03-02 note Assets:Cash "y"\n'], into=Path("w/2020.bean"))

    assert (root.parent / "w" / "2020.bean").read_text().count("note Assets:Cash") == 2
    assert root.read_bytes() == root_before
    assert _leftovers(root.parent) == []


def test_a_read_only_includer_directory_is_exit_3_naming_it(tmp_path: Path) -> None:
    root = _books(tmp_path)
    into = root.parent / "w" / "2020.bean"

    with _read_only(root.parent), pytest.raises(AuthError) as refused:
        write.append(root, [NOTE], into=Path("w/2020.bean"))

    assert refused.value.exit_code == EXIT_AUTH
    assert str(root.parent) in str(refused.value)
    assert "not writable" in str(refused.value)
    assert into.read_text() == ""
    assert _leftovers(root.parent) == []


def test_a_refused_final_replace_is_exit_3_naming_the_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = _books(tmp_path)
    before = root.read_bytes()

    def deny(src: object, dst: object) -> None:
        raise PermissionError(13, "Permission denied", str(src), None, str(dst))

    monkeypatch.setattr(os, "replace", deny)
    with pytest.raises(AuthError) as refused:
        write.append(root, [NOTE])

    assert refused.value.exit_code == EXIT_AUTH
    assert str(root) in str(refused.value)
    assert root.read_bytes() == before
    assert _leftovers(root.parent) == []


def test_the_cli_reports_the_note_repro_as_written(tmp_path: Path) -> None:
    root = _books(tmp_path)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    args = ["--json", "--file", str(root), "add", "note", "--date", "2020-03-01", "--account", "Assets:Cash"]

    with _read_only(root.parent / "shared"):
        done = subprocess.run(
            [sys.executable, "-m", "cli.main", *args, "--comment", "x"],
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
            stdin=subprocess.DEVNULL,
        )
    with _read_only(root.parent):
        refused = subprocess.run(
            [sys.executable, "-m", "cli.main", *args, "--comment", "y"],
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
            stdin=subprocess.DEVNULL,
        )

    assert done.returncode == 0, done.stderr
    assert json.loads(done.stdout)["data"]["written"] == 1
    assert refused.returncode == 3, refused.stderr
    assert json.loads(refused.stderr)["error"]["category"] == "auth"
    assert root.read_text().count("note Assets:Cash") == 1
