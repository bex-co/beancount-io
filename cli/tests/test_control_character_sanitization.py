"""Untrusted text cannot drive the terminal or land in the ledger raw (w3/392).

`single_line()` collapsed CR/LF and let everything else through, including
ESC. An imported bank description carrying `\\x1b[1A\\x1b[2K` (cursor up, erase
line) therefore erased the row printed above it as the import preview drew —
so the surface `--apply` is gated on could show something other than what
would be written. `--apply` then persisted the escapes byte for byte, `check`
passed, and every later `list` re-emitted them.

The PTY tests matter: click's `echo` strips CSI sequences when stdout is not a
terminal, so a piped capture under-reports the problem and the OSC sequence
survives regardless. Assertions are on emitted *bytes*, not rendered text.

`--json` was never affected in the same way — the envelope JSON-escapes
control characters — and is pinned as a control.
"""

from __future__ import annotations

import json
import os
import pty
import re
import select
import signal
import subprocess
import sys
import time
from pathlib import Path

import pytest

from bea_engine.ledger.text import single_line as engine_single_line
from cli.utils import single_line as frontend_single_line

ROOT = Path(__file__).resolve().parents[1]
BEA = ROOT / ".venv" / "bin" / "bea"

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Uncategorized USD
"""

ESC = "\x1b"
CURSOR_ATTACK = f"{ESC}[1A{ESC}[2K(row hidden)"
OSC_TITLE = f"{ESC}]0;INJECTED\x07"
COLOURED = f"{ESC}[31mDANGER{ESC}[0m"

CSI_BYTES = re.compile(rb"\x1b\[[0-9;]*[A-Za-z]")
OSC_BYTES = re.compile(rb"\x1b\][^\x07]*\x07")


class TestSanitizer:
    @pytest.mark.parametrize("sanitize", [frontend_single_line, engine_single_line], ids=["frontend", "engine"])
    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            pytest.param("plain text", "plain text", id="untouched"),
            pytest.param("line\nbreak", "line break", id="lf-becomes-space"),
            pytest.param("line\r\n\r\nbreak", "line break", id="crlf-run-becomes-one-space"),
            pytest.param(CURSOR_ATTACK, "\\x1b[1A\\x1b[2K(row hidden)", id="cursor-attack"),
            pytest.param(OSC_TITLE, "\\x1b]0;INJECTED\\x07", id="osc-title"),
            pytest.param("a\x00b", "a\\x00b", id="nul"),
            pytest.param("a\x7fb", "a\\x7fb", id="del"),
            pytest.param("a\x9bb", "a\\x9bb", id="c1-csi"),
            pytest.param("a\tb", "a\\x09b", id="tab-is-layout-control-too"),
            pytest.param("keep  spaces", "keep  spaces", id="spaces-preserved"),
            pytest.param("日本語 café", "日本語 café", id="unicode-text-preserved"),
        ],
    )
    def test_control_characters_become_visible_escapes(self, sanitize, raw: str, expected: str) -> None:
        assert sanitize(raw) == expected

    @pytest.mark.parametrize(
        "raw",
        ["plain", CURSOR_ATTACK, OSC_TITLE, COLOURED, "a\tb\r\nc\x00d\x9be", "日本語", ""],
    )
    def test_the_two_copies_agree(self, raw: str) -> None:
        """Neither side can import the other, so nothing but a test keeps them in step."""
        assert frontend_single_line(raw) == engine_single_line(raw)

    @pytest.mark.parametrize("raw", [CURSOR_ATTACK, OSC_TITLE, COLOURED])
    def test_no_escape_survives(self, raw: str) -> None:
        assert ESC not in frontend_single_line(raw)
        assert ESC not in engine_single_line(raw)


def _child_env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="xterm",
    )
    return env


def _on_a_terminal(tmp_path: Path, argv: list[str], timeout: float = 120.0) -> bytes:
    """Everything `bea` writes to a real terminal, unfiltered.

    A pipe would not do: click strips CSI sequences from a non-TTY stream, so a
    piped capture shows the attack half-defused and hides the regression.
    """
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        os.execve(str(BEA), [str(BEA), *argv], _child_env(tmp_path))
    out = b""
    started = time.time()
    try:
        while True:
            ready, _, _ = select.select([fd], [], [], 0.3)
            if ready:
                try:
                    chunk = os.read(fd, 65536)
                except OSError:
                    chunk = b""
                if chunk:
                    out += chunk
            finished, _ = os.waitpid(pid, os.WNOHANG)
            if finished:
                return out
            if time.time() - started > timeout:
                os.kill(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
                raise AssertionError(f"{argv} never exited")
    finally:
        os.close(fd)


def _books(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    return ledger


def _evil_csv(tmp_path: Path) -> Path:
    source = tmp_path / "evil.csv"
    source.write_text(
        "Date,Amount,Description\n"
        "2026-02-01,-1.00,HARMLESS SMALL CHARGE\n"
        f"2026-02-02,-9999.00,{CURSOR_ATTACK}\n"
        f"2026-02-03,-2.00,{OSC_TITLE}{COLOURED}\n",
        encoding="utf-8",
    )
    return source


def _assert_inert(emitted: bytes) -> None:
    assert CSI_BYTES.search(emitted) is None, f"raw CSI reached the terminal: {CSI_BYTES.findall(emitted)[:4]}"
    assert OSC_BYTES.search(emitted) is None, f"raw OSC reached the terminal: {OSC_BYTES.findall(emitted)[:4]}"


def test_the_import_preview_emits_nothing_executable(tmp_path: Path) -> None:
    """The review surface `--apply` is gated on must say what the file says."""
    ledger = _books(tmp_path)
    source = _evil_csv(tmp_path)

    emitted = _on_a_terminal(
        tmp_path,
        ["--no-input", "--file", str(ledger), "import", str(source), "--csv", "auto", "--account", "Assets:Cash"],
    )

    assert b"row hidden" in emitted, "the preview should still have run"
    _assert_inert(emitted)


def test_apply_writes_no_escapes_into_the_ledger(tmp_path: Path) -> None:
    ledger = _books(tmp_path)
    source = _evil_csv(tmp_path)

    applied = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--file",
            str(ledger),
            "import",
            str(source),
            "--csv",
            "auto",
            "--account",
            "Assets:Cash",
            "--apply",
        ],
        env=_child_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert applied.returncode == 0, applied.stderr

    written = ledger.read_bytes()
    assert b"\x1b" not in written, "escapes must not be persisted"
    assert b"row hidden" in written, "the text itself is kept, only made inert"


def test_a_ledger_read_back_emits_nothing_executable(tmp_path: Path) -> None:
    """Durability was the worst part: once applied, every later read re-emitted them."""
    ledger = _books(tmp_path)
    source = _evil_csv(tmp_path)
    subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--file",
            str(ledger),
            "import",
            str(source),
            "--csv",
            "auto",
            "--account",
            "Assets:Cash",
            "--apply",
        ],
        env=_child_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        timeout=120,
        check=True,
    )

    emitted = _on_a_terminal(tmp_path, ["--file", str(ledger), "list", "transaction"])

    _assert_inert(emitted)


def test_add_with_a_crafted_narration_is_sanitized_too(tmp_path: Path) -> None:
    """Lower concern — the text is the user's own — but the same writer."""
    ledger = _books(tmp_path)

    added = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2026-03-01",
            "--narration",
            CURSOR_ATTACK,
            "--posting",
            "Expenses:Uncategorized 1.00 USD",
            "--posting",
            "Assets:Cash",
        ],
        env=_child_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert added.returncode == 0, added.stderr
    assert b"\x1b" not in ledger.read_bytes()


def test_json_mode_still_escapes_them_its_own_way(tmp_path: Path) -> None:
    """The control: a JSON consumer already saw \\u001b, never a live sequence."""
    ledger = _books(tmp_path)
    source = _evil_csv(tmp_path)

    preview = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--json",
            "--file",
            str(ledger),
            "import",
            str(source),
            "--csv",
            "auto",
            "--account",
            "Assets:Cash",
        ],
        env=_child_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert preview.returncode == 0, preview.stderr
    assert "\x1b" not in preview.stdout
    assert json.loads(preview.stdout)["data"]["rows"], "the preview still carries its rows"
