"""`bea check` never lets bean-check's load cache land on the ledger itself (w5/065).

Upstream's loader treats its cache path as disposable: a file there that does
not unpickle is removed before the ledger is read, and `--no-cache` removes it
unconditionally. `bea check --cache-filename main.bean` therefore deleted the
root ledger — or an include — during a validation.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

MAIN = '2026-01-01 open Assets:Cash USD\ninclude "child.bean"\n'
CHILD = '2026-01-02 note Assets:Cash "cache safety"\n'


def _bea(tmp_path: Path, *args: str, **extra: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith(("BEA_", "BEANCOUNT_"))}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
        **extra,
    )
    foreign = tmp_path / "foreign"
    foreign.mkdir(exist_ok=True)
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=foreign,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def books(tmp_path: Path) -> Path:
    root = tmp_path / "books"
    root.mkdir()
    (root / "main.bean").write_text(MAIN, encoding="utf-8")
    (root / "child.bean").write_text(CHILD, encoding="utf-8")
    return root


def _state(books: Path) -> dict[str, tuple[bool, bytes]]:
    """Every directory entry, whether it is a link, and the bytes it reaches."""
    return {
        path.name: (path.is_symlink(), path.read_bytes() if path.is_file() else b"") for path in sorted(books.iterdir())
    }


def _refused(result: subprocess.CompletedProcess[str], member: Path) -> None:
    assert result.returncode == 2, result.stderr or result.stdout
    assert result.stdout == ""
    assert str(member) in result.stderr
    assert "Nothing was changed" in result.stderr
    assert "Cache file is corrupted" not in result.stderr


COLLISIONS = [
    ("absolute-root", lambda books: ["--cache-filename", str(books / "main.bean")], "main.bean"),
    ("absolute-include", lambda books: ["--cache-filename", str(books / "child.bean")], "child.bean"),
    ("relative-root", lambda books: ["--cache-filename", "main.bean"], "main.bean"),
    ("relative-include", lambda books: ["--cache-filename", "child.bean"], "child.bean"),
    ("pattern", lambda books: ["--cache-filename", "{filename}"], "main.bean"),
    ("equals", lambda books: [f"--cache-filename={books / 'main.bean'}"], "main.bean"),
    ("dotted", lambda books: ["--cache-filename", str(books / "." / "sub" / ".." / "main.bean")], "main.bean"),
    ("no-cache-first", lambda books: ["--no-cache", "--cache-filename", str(books / "main.bean")], "main.bean"),
    ("no-cache-last", lambda books: ["--cache-filename", str(books / "main.bean"), "-C"], "main.bean"),
    ("with-verbose", lambda books: ["-v", "--cache-filename", "main.bean"], "main.bean"),
    ("last-wins", lambda books: ["--cache-filename", "cache.pkl", "--cache-filename", "main.bean"], "main.bean"),
]


@pytest.mark.parametrize(("build", "member"), [case[1:] for case in COLLISIONS], ids=[case[0] for case in COLLISIONS])
def test_a_cache_path_that_is_a_ledger_file_is_refused_before_bean_check_runs(
    tmp_path: Path, books: Path, build: object, member: str
) -> None:
    (books / "sub").mkdir()
    before = _state(books)

    result = _bea(tmp_path, "--file", str(books / "main.bean"), "check", *build(books))  # type: ignore[operator]

    _refused(result, books / member)
    assert _state(books) == before


@pytest.mark.skipif(sys.platform == "win32", reason="needs symlinks and hard links")
@pytest.mark.parametrize("kind", ["symlink", "hard-link"])
@pytest.mark.parametrize("target", ["main.bean", "child.bean"])
def test_a_cache_path_linked_to_a_ledger_file_is_refused(tmp_path: Path, books: Path, kind: str, target: str) -> None:
    alias = books / "cache.pkl"
    if kind == "symlink":
        alias.symlink_to(target)
    else:
        os.link(books / target, alias)
    before = _state(books)

    result = _bea(tmp_path, "--file", str(books / "main.bean"), "check", "--cache-filename", str(alias))

    _refused(result, books / target)
    assert _state(books) == before


def test_the_environment_cache_pattern_is_guarded_too(tmp_path: Path, books: Path) -> None:
    before = _state(books)

    result = _bea(tmp_path, "--file", str(books / "main.bean"), "check", BEANCOUNT_LOAD_CACHE_FILENAME="{filename}")

    _refused(result, books / "main.bean")
    assert "BEANCOUNT_LOAD_CACHE_FILENAME" in result.stderr
    assert _state(books) == before


@pytest.mark.parametrize("extra", [(), ("--no-cache",)], ids=["cached", "no-cache"])
def test_a_separate_cache_path_and_a_plain_check_still_pass(
    tmp_path: Path, books: Path, extra: tuple[str, ...]
) -> None:
    ledgers = {name: state for name, state in _state(books).items()}

    safe = _bea(
        tmp_path, "--file", str(books / "main.bean"), "check", "--cache-filename", str(tmp_path / "cache.pkl"), *extra
    )
    assert safe.returncode == 0, safe.stderr or safe.stdout
    relative = _bea(tmp_path, "--file", str(books / "main.bean"), "check", "--cache-filename", "cache.pkl", *extra)
    assert relative.returncode == 0, relative.stderr or relative.stdout
    plain = _bea(tmp_path, "--file", str(books / "main.bean"), "check", *extra)
    assert plain.returncode == 0, plain.stderr or plain.stdout

    after = _state(books)
    assert {name: after[name] for name in ledgers} == ledgers


def test_a_broken_ledger_is_still_reported_with_a_safe_cache_path(tmp_path: Path, books: Path) -> None:
    (books / "child.bean").write_text('2026-01-02 note Assets:Missing "no such account"\n', encoding="utf-8")

    result = _bea(tmp_path, "--file", str(books / "main.bean"), "check", "--cache-filename", str(tmp_path / "c.pkl"))

    assert result.returncode == 1, result.stderr or result.stdout
    assert "Assets:Missing" in result.stderr
