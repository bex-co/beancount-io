"""A failed export write leaves the previous export intact (w3/404).

w3/380 stopped a *query* failure from destroying an existing export by
rendering into a buffer first. The write itself was still `output.open("w")`,
which truncates before any byte is safely down — so an I/O failure partway
through replaced the last good export with a fragment of the new one.

The rendered text now goes to a sibling temporary file and is swapped in with
`os.replace`, reusing the engine's own `candidate_file` primitive (same
directory, fsync, guaranteed cleanup). The JSON path already went through the
frontend's `atomic_write`, which is why it preserved; it is the control here.

The failure is induced with `RLIMIT_FSIZE` on the child, which makes a real
write fail with EFBIG after the query has succeeded. That is a genuine
os-level write failure, not a mock — but it is *not* a disk-full event, and
nothing here should be read as testing ENOSPC or power loss.
"""

from __future__ import annotations

import os
import resource
import signal
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BEA = ROOT / ".venv" / "bin" / "bea"

LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch"
  Assets:Cash -10 USD
  Expenses:Food
"""

ORIGINAL = b"previous successful export: preserve these bytes\n"
# Renders far past the 64-byte cap, so the write fails partway through.
WIDE = "SELECT '" + "q" * 150 + "' AS value LIMIT 1"
BYTE_CAP = 64


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        # Essential, not tidiness: under the write cap below the interpreter
        # would write truncated `.pyc` files into the shared source tree and
        # every later run would die with "marshal data too short".
        PYTHONDONTWRITEBYTECODE="1",
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _cap_writes() -> None:  # pragma: no cover - runs in the forked child
    resource.setrlimit(resource.RLIMIT_FSIZE, (BYTE_CAP, BYTE_CAP))
    signal.signal(signal.SIGXFSZ, signal.SIG_IGN)


def _run(tmp_path: Path, *args: str, capped: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(BEA), *args],
        cwd=tmp_path,
        env=_env(tmp_path),
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        preexec_fn=_cap_writes if capped else None,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


@pytest.fixture
def export(tmp_path: Path) -> Path:
    path = tmp_path / "previous.out"
    path.write_bytes(ORIGINAL)
    return path


@pytest.mark.parametrize("export_format", ["text", "csv", "beancount"])
def test_a_failed_write_preserves_the_previous_export(
    tmp_path: Path, ledger: Path, export: Path, export_format: str
) -> None:
    done = _run(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        WIDE,
        "--format",
        export_format,
        "--output",
        str(export),
        capped=True,
    )

    assert done.returncode != 0, done.stdout
    assert export.read_bytes() == ORIGINAL, "the last good export must survive a failed write"


def test_no_temporary_file_is_left_behind(tmp_path: Path, ledger: Path, export: Path) -> None:
    """A sibling temp that outlived the failure would be its own mess."""
    _run(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        WIDE,
        "--format",
        "csv",
        "--output",
        str(export),
        capped=True,
    )

    assert [path.name for path in tmp_path.iterdir() if path.name.startswith(".bea-")] == []


def test_the_json_export_still_preserves_too(tmp_path: Path, ledger: Path, export: Path) -> None:
    """The control the report used: this path already went through atomic_write."""
    done = _run(tmp_path, "--json", "--file", str(ledger), "query", WIDE, "--output", str(export), capped=True)

    assert done.returncode != 0
    assert export.read_bytes() == ORIGINAL


@pytest.mark.parametrize("export_format", ["text", "csv"])
def test_a_successful_export_still_replaces(tmp_path: Path, ledger: Path, export: Path, export_format: str) -> None:
    """Preserving on failure must not turn into refusing to write on success."""
    done = _run(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        "SELECT account",
        "--format",
        export_format,
        "--output",
        str(export),
    )

    assert done.returncode == 0, done.stderr
    written = export.read_bytes()
    assert written != ORIGINAL
    assert b"Assets:Cash" in written


def test_a_failed_query_still_preserves(tmp_path: Path, ledger: Path, export: Path) -> None:
    """w3/380's guarantee, which this change must not undo."""
    done = _run(tmp_path, "--file", str(ledger), "query", "SELECT FROM WHERE bad", "--output", str(export))

    assert done.returncode == 2
    assert export.read_bytes() == ORIGINAL


def test_the_ledger_alias_refusal_is_unchanged(tmp_path: Path, ledger: Path) -> None:
    """`-o` naming the ledger under read is still refused, before any write."""
    before = ledger.read_bytes()

    done = _run(tmp_path, "--file", str(ledger), "query", "SELECT account", "--output", str(ledger))

    assert done.returncode == 2
    assert "would overwrite the ledger it reads" in done.stderr
    assert ledger.read_bytes() == before
