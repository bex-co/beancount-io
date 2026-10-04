"""A termination signal during Beancount parsing stops the write (w1/074).

Beancount's C parser catches an exception raised in a builder callback, keeps
it as a syntax error and parses on. The engine's signal handler raises, and it
mostly runs inside such a callback, so a stopped `--allow-errors` write
committed anyway and a stopped write on a large ledger outran the frontend's
grace period, leaving its staging copies behind.

The harness makes the timing exact: it wraps one builder callback so the
engine signals itself from inside the parser, on the first `note` directive of
the chosen load — the staged validation load, or the load of the ledger as it
stands that `--allow-errors` compares against.
"""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")

HARNESS = textwrap.dedent("""
    import os, runpy, signal, sys
    from beancount.parser import grammar

    number = getattr(signal, os.environ["STOP_SIGNAL"])
    where = os.environ["STOP_IN"]
    original = grammar.Builder.note
    fired = []

    def note(self, filename, *args):
        staged = os.path.basename(filename).startswith(".bea-")
        if not fired and (staged if where == "staged" else filename == where):
            fired.append(True)
            os.kill(os.getpid(), number)
        return original(self, filename, *args)

    grammar.Builder.note = note
    runpy.run_module("bea_engine", run_name="__main__", alter_sys=True)
""")

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2021-01-01 open Assets:Cash USD\n"
    '2021-01-02 note Assets:Cash "existing"\n'
    'include "inc.bean"\n'
)


@pytest.mark.parametrize("signal_name", ["SIGTERM", "SIGINT"])
@pytest.mark.parametrize(
    ("stop_in", "allow_errors"), [("staged", False), ("staged", True), ("original", True)]
)  # fmt: skip
def test_a_signal_inside_the_parser_stops_the_write(
    tmp_path: Path, signal_name: str, stop_in: str, allow_errors: bool
) -> None:
    books = tmp_path / "books"
    books.mkdir()
    root = books / "main.bean"
    root.write_text(LEDGER)
    (books / "inc.bean").write_text("")
    harness = tmp_path / "harness.py"
    harness.write_text(HARNESS)
    before = {path.name: path.read_bytes() for path in books.iterdir()}
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        PYTHONPATH=str(ROOT / "src"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        STOP_SIGNAL=signal_name,
        STOP_IN=stop_in if stop_in == "staged" else str(root),
    )
    args = ["append", "--file", str(root), "--into", "inc.bean", "--text", '2021-03-01 note Assets:Cash "x"\n']

    done = subprocess.run(
        [sys.executable, str(harness), *args, *(["--allow-errors"] if allow_errors else [])],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )

    number = getattr(signal, signal_name)
    assert done.returncode in (128 + number, -number), (done.returncode, done.stdout, done.stderr)
    assert done.stdout == ""
    assert {path.name: path.read_bytes() for path in books.iterdir()} == before
