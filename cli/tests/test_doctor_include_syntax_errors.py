"""`doctor print-options` and `roundtrip` fail on an unparseable include (w1/068).

Both operations load the whole ledger, but the syntax gate in front of them
parsed only the root file. An include with an unterminated string logged its
error, after which `roundtrip` congratulated the user and `print-options`
printed defaults — both exiting 0. `lex` and `parse` read one file upstream and
keep their single-file gate.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MAIN = (
    'option "operating_currency" "USD"\n'
    'include "sub/bad.bean"\n'
    "2026-01-01 open Assets:Bank USD\n"
    "2026-01-01 open Expenses:Food USD\n"
)
BAD = (
    '2026-01-11 * "Cafe" "Broken\n'
    "  Expenses:Food  4.50 USD\n"
    "  Assets:Bank\n"
    '2026-01-12 * "X" "Y"\n'
    "  Expenses:Food  1.00 USD\n"
    "  Assets:Bank\n"
)
GOOD = '2026-01-12 * "X" "Y"\n  Expenses:Food  1.00 USD\n  Assets:Bank\n'


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


def _books(tmp_path: Path, child: str) -> Path:
    books = tmp_path / "books"
    (books / "sub").mkdir(parents=True)
    (books / "sub" / "bad.bean").write_text(child, encoding="utf-8")
    main = books / "main.bean"
    main.write_text(MAIN, encoding="utf-8")
    return main


def test_roundtrip_exits_one_naming_the_include(tmp_path: Path) -> None:
    main = _books(tmp_path, BAD)

    done = _bea(tmp_path, "doctor", "roundtrip", str(main))

    assert done.returncode == 1, done.stdout + done.stderr
    assert "Congratulations" not in done.stdout + done.stderr
    assert "bad.bean:4" in done.stderr.splitlines()[-1]


def test_print_options_exits_one_naming_the_include(tmp_path: Path) -> None:
    main = _books(tmp_path, BAD)

    done = _bea(tmp_path, "doctor", "print-options", str(main))

    assert done.returncode == 1, done.stdout + done.stderr
    assert "operating_currency" not in done.stdout
    assert "bad.bean:4" in done.stderr


def test_a_clean_include_still_passes(tmp_path: Path) -> None:
    main = _books(tmp_path, GOOD)

    roundtrip = _bea(tmp_path, "doctor", "roundtrip", str(main))
    options = _bea(tmp_path, "doctor", "print-options", str(main))

    assert roundtrip.returncode == 0, roundtrip.stderr
    assert "Congratulations" in roundtrip.stderr
    assert options.returncode == 0, options.stderr
    assert "operating_currency: ['USD']" in options.stdout
