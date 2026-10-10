"""`price export` plans the directories it needs before the first write (w5/056).

A regular file at `output/sub` passed the destination checks while
`output/sub/accounts.bean` was planned: the root ledger was copied, `mkdir`
then failed on the include, and the export exited 1 with a bare
`FileExistsError`, leaving a `main.bean` whose include did not exist. A retry
was refused over that leftover and advised `--force`, which cannot clear a
file standing where a directory must be.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

MAIN = 'include "sub/accounts.bean"\n'
ACCOUNTS = "2026-01-01 open Assets:Cash USD\n"
KEEP = b"KEEP EXISTING FILE\n"


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
def source(tmp_path: Path) -> Path:
    root = tmp_path / "source"
    (root / "sub").mkdir(parents=True)
    (root / "main.bean").write_text(MAIN, encoding="utf-8")
    (root / "sub" / "accounts.bean").write_text(ACCOUNTS, encoding="utf-8")
    return root / "main.bean"


def _listing(directory: Path) -> dict[str, bytes | None]:
    """Every path under a directory, with file bytes — a refusal changes neither."""
    return {
        str(path.relative_to(directory)): path.read_bytes() if path.is_file() else None
        for path in sorted(directory.rglob("*"))
    }


def _export(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "--json", "--offline", "--file", str(ledger), "price", "export", *args)


def _message(result: subprocess.CompletedProcess[str]) -> str:
    return str(json.loads(result.stderr)["error"]["message"])


@pytest.mark.parametrize("flags", [(), ("--force",)], ids=["plain", "force"])
def test_a_file_where_a_directory_is_needed_refuses_before_any_write(
    tmp_path: Path, source: Path, flags: tuple[str, ...]
) -> None:
    output = tmp_path / "output"
    output.mkdir()
    (output / "sub").write_bytes(KEEP)
    before = _listing(output)
    originals = _listing(source.parent)

    # The retry is the second half of the finding: it must not see a leftover.
    for _ in range(2):
        result = _export(tmp_path, source, "--output", str(output), *flags)
        assert result.returncode == 2, result.stderr or result.stdout
        assert result.stdout == ""
        message = _message(result)
        assert str(output / "sub") in message
        assert "Nothing was written" in message
        assert "FileExistsError" not in message
        assert _listing(output) == before
    assert _listing(source.parent) == originals


def test_a_directory_where_a_file_is_needed_is_not_cleared_by_force(tmp_path: Path, source: Path) -> None:
    output = tmp_path / "output"
    (output / "main.bean").mkdir(parents=True)
    before = _listing(output)

    result = _export(tmp_path, source, "--output", str(output), "--force")
    assert result.returncode == 2, result.stderr or result.stdout
    assert str(output / "main.bean") in _message(result)
    assert _listing(output) == before


def test_an_output_path_that_is_a_file_is_refused(tmp_path: Path, source: Path) -> None:
    output = tmp_path / "output"
    output.write_bytes(KEEP)

    result = _export(tmp_path, source, "--output", str(output), "--force")
    assert result.returncode == 2, result.stderr or result.stdout
    assert str(output) in _message(result)
    assert output.read_bytes() == KEEP


def test_an_empty_destination_still_exports_a_ledger_that_checks(tmp_path: Path, source: Path) -> None:
    output = tmp_path / "output"
    output.mkdir()

    result = _export(tmp_path, source, "--output", str(output))
    assert result.returncode == 0, result.stderr or result.stdout
    assert set(_listing(output)) == {"main.bean", "sub", "sub/accounts.bean"}
    check = _bea(tmp_path, "--json", "--file", str(output / "main.bean"), "check")
    assert check.returncode == 0, check.stderr or check.stdout

    # Re-exporting into that snapshot is still what --force is for.
    again = _export(tmp_path, source, "--output", str(output), "--force")
    assert again.returncode == 0, again.stderr or again.stdout
