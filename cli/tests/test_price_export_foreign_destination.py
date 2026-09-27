"""`price export` never replaces a file it was not given (w3/436).

The guard refused only the ledger's own directory — "it holds main.bean, which
the export would overwrite. Choose an empty or dedicated directory." — so any
*other* directory was overwritten without a word: pointing the snapshot at a
folder that already held somebody else's `main.bean` replaced it and printed
"Exported 2 files to …" at exit 0. Every planned destination is now checked
before the first write, and `--force` is the opt-in for re-exporting into a
snapshot directory the last run created.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

MAIN = """include "parts/*.bean"
2026-01-02 * "Opening"
  Assets:Cash 5 USD
  Equity:Opening
"""
PART_A = "2026-01-01 open Assets:Cash USD\n"
PART_B = "2026-01-01 open Equity:Opening USD\n"
FOREIGN = 'option "title" "OTHER LEDGER"\n2020-01-01 open Assets:Other USD\n'


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
def books(tmp_path: Path) -> Path:
    root = tmp_path / "books"
    (root / "parts").mkdir(parents=True)
    (root / "main.bean").write_text(MAIN, encoding="utf-8")
    (root / "parts" / "a.bean").write_text(PART_A, encoding="utf-8")
    (root / "parts" / "b.bean").write_text(PART_B, encoding="utf-8")
    return root / "main.bean"


def _tree(directory: Path) -> dict[str, bytes]:
    """The file list of a directory with its bytes — a refusal changes neither."""
    return {
        str(path.relative_to(directory)): path.read_bytes() for path in sorted(directory.rglob("*")) if path.is_file()
    }


def _export(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "--json", "--offline", "--file", str(ledger), "price", "export", *args)


def test_a_foreign_file_at_a_planned_destination_refuses_the_export(tmp_path: Path, books: Path) -> None:
    audit = tmp_path / "audit"
    audit.mkdir()
    (audit / "main.bean").write_text(FOREIGN, encoding="utf-8")
    before = _tree(audit)

    done = _export(tmp_path, books, "--output", str(audit))

    assert done.returncode == 2, done.stdout
    assert "Nothing was written" in done.stderr
    assert str(audit / "main.bean") in done.stderr
    assert _tree(audit) == before


def test_force_overwrites_and_marks_the_paths_in_the_answer(tmp_path: Path, books: Path) -> None:
    audit = tmp_path / "audit"
    audit.mkdir()
    (audit / "main.bean").write_text(FOREIGN, encoding="utf-8")

    done = _export(tmp_path, books, "--output", str(audit), "--force")

    assert done.returncode == 0, done.stderr
    answered = json.loads(done.stdout)["data"]
    assert answered["overwritten"] == [str(audit / "main.bean")]
    assert 'include "parts/a.bean"' in (audit / "main.bean").read_text(encoding="utf-8")


def test_an_empty_destination_still_exports(tmp_path: Path, books: Path) -> None:
    destination = tmp_path / "snapshot"
    destination.mkdir()

    done = _export(tmp_path, books, "--output", str(destination))

    assert done.returncode == 0, done.stderr
    answered = json.loads(done.stdout)["data"]
    assert answered["overwritten"] == []
    assert {path.name for path in (destination / "parts").iterdir()} == {"a.bean", "b.bean"}


def test_the_default_destination_is_checked_once_it_exists(tmp_path: Path, books: Path) -> None:
    first = _export(tmp_path, books)
    assert first.returncode == 0, first.stderr
    snapshot = books.parent / "main-export"
    before = _tree(snapshot)

    again = _export(tmp_path, books)

    assert again.returncode == 2, again.stdout
    assert "--force" in again.stderr
    assert _tree(snapshot) == before

    forced = _export(tmp_path, books, "--force")
    assert forced.returncode == 0, forced.stderr
    assert _tree(snapshot) == before  # deterministic: the same bytes, not a growing tree


def test_the_ledgers_own_directory_keeps_its_more_specific_refusal(tmp_path: Path, books: Path) -> None:
    done = _export(tmp_path, books, "--output", str(books.parent))

    assert done.returncode == 2, done.stdout
    assert "it holds main.bean, which the export would overwrite" in done.stderr
    assert books.read_text(encoding="utf-8") == MAIN
