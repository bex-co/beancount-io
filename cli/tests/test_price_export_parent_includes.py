"""`price export` keeps parent-relative includes inside the export (w4/171).

Snapshot paths keep a lexical `..`, so `include "../shared/accounts.bean"` from
`books/main.bean` classified as `../shared/accounts.bean` relative to `books`
instead of as a file outside it. The copy was written to `<export>/../shared/`
— beside the export, over whatever already lived there — and the root kept an
include that pointed outside the snapshot, so a relocated copy failed
`bean-check`.

Sources are now classified by the file they resolve to, so a parent-relative
include lands in `_shared/` like an absolute one, and the whole write plan is
checked to stay inside the export before anything is written.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACCOUNTS = "2024-01-01 open Assets:Cash USD\n"
SENTINEL = "UNRELATED SENTINEL\n"


def _run(tmp_path: Path, *argv: str) -> subprocess.CompletedProcess[str]:
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
    return subprocess.run(list(argv), env=env, cwd=tmp_path, capture_output=True, text=True, timeout=120)


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _run(tmp_path, sys.executable, "-m", "cli.main", *args)


def _bean_check(tmp_path: Path, ledger: Path) -> subprocess.CompletedProcess[str]:
    return _run(tmp_path, sys.executable, "-c", "from beancount.scripts.check import main; main()", str(ledger))


def _tree(tmp_path: Path, include: str) -> Path:
    (tmp_path / "input" / "books").mkdir(parents=True)
    (tmp_path / "input" / "shared").mkdir()
    (tmp_path / "input" / "shared" / "accounts.bean").write_text(ACCOUNTS)
    main = tmp_path / "input" / "books" / "main.bean"
    main.write_text(f'include "{include}"\n')
    (tmp_path / "out" / "shared").mkdir(parents=True)
    (tmp_path / "out" / "shared" / "accounts.bean").write_text(SENTINEL)
    return main


def _export_and_relocate(tmp_path: Path, main: Path) -> tuple[dict, Path]:
    out = tmp_path / "out" / "copy"
    exported = _bea(tmp_path, "--json", "--file", str(main), "price", "export", "--output", str(out))
    assert exported.returncode == 0, exported.stderr
    relocated = tmp_path / "relocated" / "copied"
    shutil.copytree(out, relocated)
    return json.loads(exported.stdout)["data"], relocated


def test_a_parent_relative_include_stays_inside_the_export(tmp_path: Path) -> None:
    main = _tree(tmp_path, "../shared/accounts.bean")
    source_before = main.read_bytes()
    data, relocated = _export_and_relocate(tmp_path, main)

    out = (tmp_path / "out" / "copy").resolve()
    for written in data["files"]:
        assert Path(written).resolve().is_relative_to(out), written
    assert (tmp_path / "out" / "shared" / "accounts.bean").read_text() == SENTINEL
    assert main.read_bytes() == source_before
    assert (tmp_path / "input" / "shared" / "accounts.bean").read_text() == ACCOUNTS

    assert ".." not in (relocated / "main.bean").read_text()
    assert (relocated / "_shared" / "01-accounts.bean").read_text() == ACCOUNTS
    checked = _bean_check(tmp_path, relocated / "main.bean")
    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_absolute_and_local_includes_still_export(tmp_path: Path) -> None:
    main = _tree(tmp_path, str(tmp_path / "input" / "shared" / "accounts.bean"))
    (main.parent / "parts").mkdir()
    (main.parent / "parts" / "cash.bean").write_text('2024-01-02 * "Seed"\n  Assets:Cash 1 USD\n  Assets:Cash -1 USD\n')
    main.write_text(main.read_text() + 'include "parts/*.bean"\n')
    data, relocated = _export_and_relocate(tmp_path, main)

    names = sorted(
        Path(written).resolve().relative_to((tmp_path / "out" / "copy").resolve()).as_posix()
        for written in data["files"]
    )
    assert names == ["_shared/01-accounts.bean", "main.bean", "parts/cash.bean"]
    checked = _bean_check(tmp_path, relocated / "main.bean")
    assert checked.returncode == 0, checked.stdout + checked.stderr
