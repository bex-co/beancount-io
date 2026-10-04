"""`add document` and `check` share one containment rule (w1/165).

`add` refused only absolute paths, so `--path ../elsewhere.pdf` wrote a
ledger the next `check` failed, with a message calling the relative path
"absolute" because Beancount resolves every document path on load.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "2026-01-01 open Assets:Cash USD\n"


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
        timeout=60,
        stdin=subprocess.DEVNULL,
    )


def _tree(tmp_path: Path) -> Path:
    (tmp_path / "orig" / "docs").mkdir(parents=True)
    (tmp_path / "orig" / "docs" / "inv.pdf").write_bytes(b"%PDF")
    (tmp_path / "copy" / "docs").mkdir(parents=True)
    (tmp_path / "copy" / "docs" / "in.pdf").write_bytes(b"%PDF")
    (tmp_path / "copy" / "sub").mkdir()
    ledger = tmp_path / "copy" / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _add(tmp_path: Path, ledger: Path, path: str, *extra: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        *("--json", "--file", str(ledger), "add", "document", "--date", "2026-01-03"),
        *("-a", "Assets:Cash", "--path", path, *extra),
    )


def test_a_path_climbing_out_of_the_tree_is_refused(tmp_path: Path) -> None:
    ledger = _tree(tmp_path)

    result = _add(tmp_path, ledger, "../orig/docs/inv.pdf")

    assert result.returncode == 2, result.stdout
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "'../orig/docs/inv.pdf' resolves outside the ledger directory" in error["message"]
    assert ledger.read_text() == LEDGER


def test_paths_inside_the_tree_still_write_and_check(tmp_path: Path) -> None:
    ledger = _tree(tmp_path)
    (tmp_path / "copy" / "sub" / "part.bean").write_text("")
    ledger.write_text(LEDGER + 'include "sub/part.bean"\n')

    assert _add(tmp_path, ledger, "docs/in.pdf").returncode == 0
    # Resolved against the destination file's directory, still inside the tree.
    into = _add(tmp_path, ledger, "../docs/in.pdf", "--into", "sub/part.bean")
    assert into.returncode == 0, into.stderr

    check = _bea(tmp_path, "--file", str(ledger), "check")
    assert check.returncode == 0, check.stdout + check.stderr


def test_check_quotes_the_relative_path_as_written(tmp_path: Path) -> None:
    ledger = _tree(tmp_path)
    ledger.write_text(LEDGER + '2026-01-03 document Assets:Cash "../orig/docs/inv.pdf"\n')

    check = _bea(tmp_path, "--json", "--file", str(ledger), "check")

    assert check.returncode == 1, check.stdout
    details = json.loads(check.stderr)["error"]["details"]
    assert any("Document path '../orig/docs/inv.pdf' resolves to" in d for d in details), details
    assert not any("is absolute" in d for d in details)
