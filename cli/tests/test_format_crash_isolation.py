"""Tags holding `/0` format, and a batch crash names the file that died (w5/759).

`#proj/0` and `^inv/0` are not arithmetic, but the zero-divisor scan read
`/0` inside them and refused the file. And a zero divisor the literal scan
cannot see (`100/(0)`) still killed the whole batched syntax run unnamed.
Tags and links are now blanked from the scan, and a batch that dies on a
signal is re-run per file so the crashing one is named. Since w1/354 the scan
evaluates `100/(0)` and names its line; the per-file rerun stays for a crash
no scan can see, stubbed here.
"""

from __future__ import annotations

import os
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.amounts import zero_divisor_line
from cli.engine import launch
from cli.errors import SignalError
from cli.main import app

ROOT = Path(__file__).resolve().parents[1]
MAIN = (
    'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Income:Gains\n'
    'include "jan.bean"\ninclude "feb.bean"\n'
)
TAG = '2020-01-05 * "a" #proj/0 ^inv/0\n    Assets:Cash     1 USD\n  Income:Gains   -1 USD\n'
JAN = '2020-01-05 * "a"\n  Assets:Cash   1 USD\n  Income:Gains\n'
FEB = '2020-02-01 * "b"\n  Assets:Cash  100/(0) USD\n  Income:Gains\n'


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
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
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=180,
    )


@pytest.mark.parametrize(
    "line",
    [
        '2020-01-05 * "a" #proj/0 ^inv/0',
        '2020-01-05 * "a" #a/0/b ^c/0',
        "2020-01-05 pushtag #proj/0",
    ],
)
def test_tags_and_links_hold_no_divisor(line: str) -> None:
    assert zero_divisor_line(f"{line}\n    Assets:Cash  1 USD\n") is None


def test_a_literal_divisor_beside_a_tag_still_flags() -> None:
    assert zero_divisor_line(f"{TAG}    Assets:Cash  100/0 USD\n") == 4


def test_tagged_file_formats(tmp_path: Path) -> None:
    ledger = tmp_path / "tag.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Income:Gains\n\n' + TAG
    )
    proc = _bea(tmp_path, "format", "-i", str(ledger))
    assert proc.returncode == 0, proc.stderr
    assert "1/1 file(s) formatted" in proc.stdout + proc.stderr
    assert "Division by zero" not in proc.stdout + proc.stderr
    assert "#proj/0 ^inv/0" in ledger.read_text()


def test_tagged_file_renders_to_stdout(tmp_path: Path) -> None:
    ledger = tmp_path / "tag.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Income:Gains\n\n' + TAG
    )
    proc = _bea(tmp_path, "format", str(ledger))
    assert proc.returncode == 0, proc.stderr
    assert "Division by zero" not in proc.stdout + proc.stderr
    assert "#proj/0 ^inv/0" in proc.stdout


def _books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    for name, text in (("main.bean", MAIN), ("jan.bean", JAN), ("feb.bean", FEB)):
        (books / name).write_text(text)
    return books


def test_parenthesised_zero_names_the_crashing_line(tmp_path: Path) -> None:
    books = _books(tmp_path)
    proc = _bea(tmp_path, "format", "-i", str(books))
    assert proc.returncode == 1, proc.stdout
    out = proc.stdout + proc.stderr
    assert f"formatted: {books / 'jan.bean'}" in out, out
    assert f"cannot parse: {books / 'feb.bean'}:2: Division by zero in an amount expression" in out, out
    assert "SIGSEGV" not in out
    assert "jan.bean:" not in out


def test_check_names_the_crashing_line(tmp_path: Path) -> None:
    books = _books(tmp_path)
    proc = _bea(tmp_path, "format", "--check", str(books))
    assert proc.returncode == 1, proc.stdout
    out = proc.stdout + proc.stderr
    assert f"cannot parse: {books / 'feb.bean'}:2: Division by zero in an amount expression" in out, out


def test_a_crash_no_scan_sees_is_still_isolated_to_its_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # A signal death with no zero divisor behind it: the batch dies, and the
    # per-file rerun names the one file that kills the engine (w5/759).
    books = tmp_path / "books"
    books.mkdir()
    for name, text in (("main.bean", MAIN), ("jan.bean", JAN), ("feb.bean", FEB.replace("100/(0)", "100"))):
        (books / name).write_text(text)
    crashing = str(books / "feb.bean")
    real = launch.helper_json

    def crash_on_feb(args: Sequence[str], **kwargs: Any) -> dict[str, Any]:
        if args[0] == "syntax" and crashing in args:
            raise SignalError("killed", signal_name="SIGSEGV", hint="Stub crash hint.")
        return real(args, **kwargs)

    monkeypatch.setattr(launch, "helper_json", crash_on_feb)
    result = CliRunner().invoke(app, ["format", "-i", str(books)])

    assert result.exit_code == 1, result.output
    assert f"formatted: {books / 'jan.bean'}" in result.stderr, result.stderr
    assert (
        f"cannot parse: {crashing}: Beancount's parser crashed reading this file "
        "(the engine was killed by SIGSEGV), so it was not parsed. Stub crash hint." in result.stderr
    ), result.stderr
    assert "jan.bean:" not in result.stderr
