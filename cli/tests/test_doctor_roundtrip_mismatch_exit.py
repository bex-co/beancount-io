"""A failed `doctor roundtrip` comparison exits 1 (w3/410).

w3/371 stopped `roundtrip` reporting success for input that does not parse.
This is the other half: input that parses fine, whose *comparison* fails.
Upstream logs `Entries differ!` and returns 0 regardless, so a valid ledger
that does not survive its own print/parse cycle looked identical to a clean
one from a script's point of view.

The verdict is read from **stderr** only. Upstream logs its conclusion there
but `print()`s the differing entries to stdout, so a narration quoting the
phrase would otherwise be mistaken for the diagnostic's own finding — which is
the trap the last test here covers.

Upstream's printer and comparison are untouched: detecting their mismatch is
the whole point of the diagnostic.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

# Upstream's printer drops the escaping, so re-reading yields a different note.
ESCAPED_QUOTE = '2026-01-01 open Assets:Cash USD\n2026-01-02 note Assets:Cash "a\\"b"\n'
ESCAPED_BACKSLASH = '2026-01-01 open Assets:Cash USD\n2026-01-02 note Assets:Cash "a\\\\b"\n'
PLAIN = '2026-01-01 open Assets:Cash USD\n2026-01-02 note Assets:Cash "ab"\n'
QUOTES_THE_MARKER = '2026-01-01 open Assets:Cash USD\n2026-01-02 note Assets:Cash "Entries differ!"\n'


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


def _ledger(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(body, encoding="utf-8")
    return path


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@pytest.mark.parametrize(
    ("body", "note"),
    [
        pytest.param(ESCAPED_QUOTE, "an escaped quote in a note", id="escaped-quote"),
        pytest.param(ESCAPED_BACKSLASH, "an escaped backslash in a note", id="escaped-backslash"),
    ],
)
def test_a_failed_comparison_exits_one(tmp_path: Path, body: str, note: str) -> None:
    ledger = _ledger(tmp_path, body)
    assert _bea(tmp_path, "--json", "--file", str(ledger), "check").returncode == 0, "the input is valid"
    before = _digest(ledger)

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 1, f"{note}: {done.stdout}"
    assert "Entries differ!" in done.stderr, "upstream's own diagnostic stays visible"
    assert "does not survive a print/parse cycle" in done.stderr
    assert _digest(ledger) == before, "a diagnostic must not touch the source"


def test_a_clean_comparison_still_exits_zero(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, PLAIN)

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 0, done.stderr
    assert "Congratulations" in done.stderr
    assert "does not survive" not in done.stderr


def test_the_native_trace_is_still_shown(tmp_path: Path) -> None:
    """Mapping the status must not cost the diagnostic its output."""
    ledger = _ledger(tmp_path, ESCAPED_QUOTE)

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    for step in ("Read the entries", "Compare the original entries"):
        assert step in done.stderr, done.stderr


def test_unparseable_input_keeps_its_own_failure(tmp_path: Path) -> None:
    """w3/371's behaviour, which shares this wrapper."""
    ledger = _ledger(tmp_path, "this is not beancount\n")

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 1
    assert "cannot compare" in done.stderr
    assert "Congratulations" not in done.stdout + done.stderr


def test_the_collision_guard_still_runs_first(tmp_path: Path) -> None:
    """w3/409 shares this wrapper too; neither safeguard may displace the other."""
    ledger = _ledger(tmp_path, PLAIN)
    artifact = tmp_path / "main.roundtrip1.bean"
    artifact.write_text("; mine\n", encoding="utf-8")

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 4, done.stdout
    assert artifact.read_text(encoding="utf-8") == "; mine\n"


def test_a_narration_quoting_the_marker_is_not_the_verdict(tmp_path: Path) -> None:
    """The entries are printed to stdout; only stderr carries the conclusion."""
    ledger = _ledger(tmp_path, QUOTES_THE_MARKER)

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 0, done.stdout + done.stderr
    assert "Congratulations" in done.stderr
