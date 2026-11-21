"""A computed zero divisor in render input is refused, not parsed (w5/759 follow-up).

`zero_divisor_line` only sees literal zeros, so `100/(2-2)` passed the
render path's pre-parse scan and Beancount's parser segfaulted the engine on
it: `bea format feb.bean` died with SIGSEGV where `100/0` is refused naming
the file and line. The render scan now evaluates each line's arithmetic too.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food\n"
# A slash date, and `/0` in a string and a comment, are no divisors.
CLEAN = '2026/01/05 * "lunch" "ratio 3/0"\n    Assets:Cash     1 USD ; was 1/0\n    Expenses:Food  -1 USD\n'
COMPUTED = '2026-02-01 * "fee"\n  Assets:Cash  100/(2-2) USD\n  Expenses:Food\n'


def _bea(tmp_path: Path, *args: str, stdin_text: str | None = None) -> subprocess.CompletedProcess[str]:
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
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_render_names_computed_divisor_line(tmp_path: Path) -> None:
    target = tmp_path / "feb.bean"
    target.write_text(MAIN + COMPUTED)
    result = _bea(tmp_path, "format", str(target))

    assert result.returncode == 1, result.stdout + result.stderr
    assert f"{target}:4: Division by zero in an amount expression" in result.stdout + result.stderr
    assert "SIGSEGV" not in result.stdout + result.stderr


def test_render_stdin_names_computed_divisor_line(tmp_path: Path) -> None:
    result = _bea(tmp_path, "format", "-", stdin_text=MAIN + COMPUTED)

    assert result.returncode == 1, result.stdout + result.stderr
    assert "stdin:4: Division by zero in an amount expression" in result.stdout + result.stderr
    assert "SIGSEGV" not in result.stdout + result.stderr


def test_render_still_accepts_slash_dates_strings_and_comments(tmp_path: Path) -> None:
    target = tmp_path / "jan.bean"
    target.write_text(MAIN + CLEAN)
    result = _bea(tmp_path, "format", str(target))

    assert result.returncode == 0, result.stdout + result.stderr
    assert "Division by zero" not in result.stdout + result.stderr
