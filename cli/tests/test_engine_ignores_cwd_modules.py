"""The engine never imports Python modules from the working directory (w1/098).

`python -m bea_engine` puts the working directory first on `sys.path`, so a
`regex.py` in whatever folder bea ran from was imported ahead of the standard
library by every engine command — code from an untrusted checkout ran for a
plugin-free ledger kept elsewhere — and a plugin resolved from cwd in the
helper but not in bean-check, so `check` and `check --json` disagreed.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PLUGIN = '__plugins__ = ["p"]\n\n\ndef p(entries, options):\n    return entries, []\n'


def _bea(cwd: Path, tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=60,
        stdin=subprocess.DEVNULL,
    )


def _dirs(tmp_path: Path) -> tuple[Path, Path]:
    books, untrusted = tmp_path / "books", tmp_path / "untrusted"
    books.mkdir()
    untrusted.mkdir()
    return books, untrusted


def test_a_shadow_module_in_cwd_is_never_imported(tmp_path: Path) -> None:
    books, untrusted = _dirs(tmp_path)
    ledger = books / "main.bean"
    ledger.write_text("2024-01-01 open Assets:Cash USD\n")
    marker = tmp_path / "PWNED"
    shadow = f"open({str(marker)!r}, 'a').write('ran\\n')\nraise ImportError('shadow')\n"
    for name in ("regex", "beancount"):
        (untrusted / f"{name}.py").write_text(shadow)

    for args in (["--json", "--file", str(ledger), "check"], ["--json", "--file", str(ledger), "list", "open"]):
        done = _bea(untrusted, tmp_path, *args)
        assert done.returncode == 0, done.stderr

    assert not marker.exists(), "an engine command imported code from the working directory"


def test_check_and_json_check_agree_on_a_cwd_only_plugin(tmp_path: Path) -> None:
    books, untrusted = _dirs(tmp_path)
    (untrusted / "myplug.py").write_text(PLUGIN)
    ledger = books / "main.bean"
    ledger.write_text('plugin "myplug"\n2024-01-01 open Assets:Cash USD\n')

    human = _bea(untrusted, tmp_path, "--file", str(ledger), "check")
    as_json = _bea(untrusted, tmp_path, "--json", "--file", str(ledger), "check")

    assert human.returncode == as_json.returncode == 1, (human.stderr, as_json.stderr)


def test_insert_pythonpath_still_resolves_a_plugin_beside_the_ledger(tmp_path: Path) -> None:
    books, untrusted = _dirs(tmp_path)
    (books / "myplug.py").write_text(PLUGIN)
    ledger = books / "main.bean"
    ledger.write_text('option "insert_pythonpath" "TRUE"\nplugin "myplug"\n2024-01-01 open Assets:Cash USD\n')

    done = _bea(untrusted, tmp_path, "--json", "--file", str(ledger), "check")

    assert done.returncode == 0, done.stderr
