"""User code that prints never corrupts the engine's JSON envelope (w1/061).

The engine wrote its envelope to descriptor 1, which ledger plugins and
importer configurations inherit. A plugin's `print`, an importer's child
process or a raw `os.write(1, …)` landed in front of the envelope, so a write
that happened reported exit 4 "outcome unknown" — and a retry duplicated it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LEDGER = (
    'option "insert_pythonpath" "TRUE"\n'
    'plugin "noisy"\n'
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Expenses:Dining USD\n"
)

PLUGIN = textwrap.dedent("""
    import os, subprocess, sys

    __plugins__ = ["noisy"]

    def noisy(entries, options):
        print("plugin print")
        sys.stdout.flush()
        os.write(1, b"plugin raw write\\n")
        subprocess.run([sys.executable, "-c", "print('plugin child')"], check=True)
        return entries, []
""")


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
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def test_a_printing_plugin_leaves_add_check_and_list_parseable(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    (tmp_path / "noisy.py").write_text(PLUGIN, encoding="utf-8")
    common = ["--json", "--file", str(ledger)]

    added = _bea(
        tmp_path, *common, "add", "transaction", "Coffee", "--date", "2026-01-05",
        "-p", "Expenses:Dining 4 USD", "-p", "Assets:Cash",
    )  # fmt: skip

    assert added.returncode == 0, added.stderr
    assert json.loads(added.stdout)["data"]["written"] == 1
    assert ledger.read_text(encoding="utf-8").count('"Coffee"') == 1
    for text in ("plugin print", "plugin raw write", "plugin child"):
        assert text not in added.stdout

    for args in (["check"], ["list", "transaction"]):
        done = _bea(tmp_path, *common, *args)
        assert done.returncode == 0, done.stderr
        json.loads(done.stdout)
        assert "plugin child" not in done.stdout


IMPORTER = textwrap.dedent("""
    import os, subprocess, sys
    from beancount.parser import parser

    class Rows:
        name = "rows"

        def identify(self, filepath):
            return True

        def account(self, filepath):
            return "Assets:Cash"

        def extract(self, filepath, existing):
            print("importer print")
            os.write(1, b"importer raw write\\n")
            subprocess.run([sys.executable, "-c", "print('importer child')"], check=True)
            subprocess.run([sys.executable, "-c", "import sys; sys.stderr.write('importer child err')"], check=True)
            entries, errors, _ = parser.parse_file(filepath)
            assert not errors, errors
            return entries

    CONFIG = [Rows()]
""")


def test_importer_output_from_child_processes_and_raw_writes_is_captured(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Food USD\n',
        encoding="utf-8",
    )
    source = tmp_path / "source.bean"
    source.write_text(
        '2026-02-02 * "Cafe" "Coffee"\n  bank_id: "b1"\n  Assets:Cash  -3 USD\n  Expenses:Food  3 USD\n',
        encoding="utf-8",
    )
    config = tmp_path / "importer.py"
    config.write_text(IMPORTER, encoding="utf-8")

    done = _bea(tmp_path, "--json", "--file", str(ledger), "import", str(source), "--config", str(config), "--apply")

    assert done.returncode == 0, done.stderr
    answer = json.loads(done.stdout)["data"]
    assert answer["written"] == 1
    for text in ("importer print", "importer raw write", "importer child", "importer child err"):
        assert text in answer["importer_output"]
    assert ledger.read_text(encoding="utf-8").count('"Coffee"') == 1
