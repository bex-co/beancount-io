"""Every spelling of a ledger's path takes the same write lock (w1/075).

The lock was keyed by `os.path.normcase(str(file.resolve()))`. On macOS's
default case-insensitive volumes `normcase` is the identity and `resolve()`
keeps the caller's spelling, so `Books/main.bean` and `books/main.bean` took
different locks on one file and concurrent adds could lose an entry.
"""

from __future__ import annotations

import os
import subprocess
import sys
import threading
import unicodedata
from pathlib import Path

import pytest

from bea_engine.ledger import write

ROOT = Path(__file__).resolve().parents[1]


def _case_insensitive(directory: Path) -> bool:
    probe = directory / "CaseProbe"
    probe.write_text("")
    try:
        return (directory / "caseprobe").exists()
    finally:
        probe.unlink()


@pytest.fixture
def books(tmp_path: Path) -> Path:
    directory = tmp_path / "Books"
    directory.mkdir()
    if not _case_insensitive(directory):
        pytest.skip("needs a case-insensitive volume (the macOS default)")
    return directory


def test_differently_cased_paths_share_one_lock(books: Path) -> None:
    other = books.parent / "BOOKS"

    assert write._lock_key(books / "main.bean") == write._lock_key(other / "MAIN.bean")
    assert write._lock_key(books / "main.bean") == write._lock_key(other / "Main.bean")


def test_a_differently_normalized_name_shares_the_lock(tmp_path: Path) -> None:
    composed = tmp_path / unicodedata.normalize("NFC", "café.bean")
    decomposed = tmp_path / unicodedata.normalize("NFD", "café.bean")

    assert write._lock_key(composed) == write._lock_key(decomposed)


def test_a_directory_alias_shares_the_lock_and_other_files_do_not(tmp_path: Path) -> None:
    real = tmp_path / "real"
    real.mkdir()
    alias = tmp_path / "alias"
    alias.symlink_to(real, target_is_directory=True)

    assert write._lock_key(real / "main.bean") == write._lock_key(alias / "main.bean")
    assert write._lock_key(real / "main.bean") != write._lock_key(real / "other.bean")
    # A destination that does not exist yet still gets a key.
    assert write._lock_key(tmp_path / "missing" / "new.bean")


def test_locking_one_file_under_two_spellings_does_not_deadlock(books: Path) -> None:
    done = threading.Event()

    def lock_both() -> None:
        with write.lock_files([books / "main.bean", books.parent / "BOOKS" / "MAIN.bean"]):
            done.set()

    worker = threading.Thread(target=lock_both, daemon=True)
    worker.start()
    worker.join(timeout=60)

    assert done.is_set(), "a second lock on the same file blocked its own holder"


def test_a_writer_through_another_spelling_waits_for_the_lock(
    books: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path / "cache"))
    ledger = books / "main.bean"
    ledger.write_text('option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n')
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    probe = (
        "import fcntl, os, sys\n"
        "from pathlib import Path\n"
        "from bea_engine.ledger import write\n"
        "path = write.cache_dir() / 'locks' / f'{write._lock_key(Path(sys.argv[1]))}.lock'\n"
        "fd = os.open(path, os.O_RDWR | os.O_CREAT, 0o600)\n"
        "try:\n"
        "    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)\n"
        "except BlockingIOError:\n"
        "    sys.exit(7)\n"
    )

    with write.lock_file(ledger):
        held = subprocess.run(
            [sys.executable, "-c", probe, str(books.parent / "BOOKS" / "MAIN.bean")],
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
            stdin=subprocess.DEVNULL,
        )

    assert held.returncode == 7, held.stderr
