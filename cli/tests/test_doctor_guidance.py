"""`bea doctor guidance` warns about a ledger directory's agent files (w21/1011).

No AGENTS.md, or a CLAUDE.md that does not import it, draws a warning;
a pointing CLAUDE.md beside an AGENTS.md is clean. The check never
creates or changes files and always exits 0.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LEDGER = "2026-01-01 open Assets:Cash USD\n"


def _bea(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(cwd / "config"),
        XDG_CACHE_HOME=str(cwd / "cache"),
        XDG_DATA_HOME=str(cwd / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, *, agents: str | None = None, claude: str | None = None) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(LEDGER)
    if agents is not None:
        (books / "AGENTS.md").write_text(agents)
    if claude is not None:
        (books / "CLAUDE.md").write_text(claude)
    return books / "main.bean"


def test_missing_agents_md_warns(tmp_path: Path) -> None:
    ledger = _books(tmp_path)
    before = sorted(p.name for p in ledger.parent.iterdir())
    proc = _bea(tmp_path, "doctor", "guidance", str(ledger))
    assert proc.returncode == 0, proc.stderr
    assert "AGENTS.md is missing" in proc.stdout
    assert "beancount-init" in proc.stdout
    assert sorted(p.name for p in ledger.parent.iterdir()) == before


def test_pointing_claude_md_is_clean(tmp_path: Path) -> None:
    ledger = _books(tmp_path, agents="# conventions\n", claude="@AGENTS.md\n")
    proc = _bea(tmp_path, "doctor", "guidance", str(ledger))
    assert proc.returncode == 0, proc.stderr
    assert proc.stdout == f"agent guidance OK in {ledger.parent}\n"


def test_claude_md_without_import_warns(tmp_path: Path) -> None:
    ledger = _books(tmp_path, agents="# conventions\n", claude="# other instructions\n")
    before = (ledger.parent / "CLAUDE.md").read_bytes()
    proc = _bea(tmp_path, "doctor", "guidance", str(ledger))
    assert proc.returncode == 0, proc.stderr
    assert "does not import AGENTS.md" in proc.stdout
    assert "@AGENTS.md" in proc.stdout
    assert (ledger.parent / "CLAUDE.md").read_bytes() == before


def test_claude_md_beside_missing_agents_md_warns_twice(tmp_path: Path) -> None:
    ledger = _books(tmp_path, claude="# other instructions\n")
    proc = _bea(tmp_path, "doctor", "guidance", str(ledger))
    assert proc.returncode == 0, proc.stderr
    assert "AGENTS.md is missing" in proc.stdout
    assert "does not import AGENTS.md" in proc.stdout


def test_directory_ledger_is_refused_like_every_operation(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(LEDGER)
    proc = _bea(tmp_path, "doctor", "guidance", str(books))
    assert proc.returncode == 2
    assert "is a directory; expected a ledger file" in proc.stderr


def test_missing_ledger_is_refused(tmp_path: Path) -> None:
    proc = _bea(tmp_path, "doctor", "guidance", str(tmp_path / "nope.bean"))
    assert proc.returncode == 2
    assert "does not exist" in proc.stderr
