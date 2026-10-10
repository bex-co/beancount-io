"""`price export` keeps distinct include paths distinct, even when they name one file (w5/058).

`a.bean` and `b.bean` linked to one `tx.bean` are two includes, and the loader
reads the transaction twice. The planner placed every copy by its resolved
path, so both landed on `tx.bean`: the export exited 0 with one file listed
twice, both includes rewritten to it, and stock Beancount refused the
snapshot ("Duplicate filename parsed") while reporting half the balance.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

OPENS = "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n"
TX = '2026-02-01 * "Aliased deposit"\n  Assets:Cash 1 USD\n  Equity:Opening -1 USD\n'
BALANCES = "SELECT account, sum(position) GROUP BY account ORDER BY account"


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


def _symlinks(source: Path) -> list[str]:
    (source / "tx.bean").write_text(TX, encoding="utf-8")
    (source / "a.bean").symlink_to("tx.bean")
    (source / "b.bean").symlink_to("tx.bean")
    return ["a.bean", "b.bean"]


def _symlink_beside_its_target(source: Path) -> list[str]:
    (source / "tx.bean").write_text(TX, encoding="utf-8")
    (source / "a.bean").symlink_to("tx.bean")
    return ["tx.bean", "a.bean"]


def _symlinked_directory(source: Path) -> list[str]:
    (source / "real").mkdir()
    (source / "real" / "tx.bean").write_text(TX, encoding="utf-8")
    (source / "linked").symlink_to("real", target_is_directory=True)
    return ["real/tx.bean", "linked/tx.bean"]


def _hard_links(source: Path) -> list[str]:
    (source / "a.bean").write_text(TX, encoding="utf-8")
    os.link(source / "a.bean", source / "b.bean")
    return ["a.bean", "b.bean"]


def _regular_copies(source: Path) -> list[str]:
    (source / "a.bean").write_text(TX, encoding="utf-8")
    (source / "b.bean").write_text(TX, encoding="utf-8")
    return ["a.bean", "b.bean"]


def _loaded(tmp_path: Path, ledger: Path) -> tuple[object, int]:
    """What stock validation and a query see: the balances and the posting count."""
    check = _bea(tmp_path, "--json", "--file", str(ledger), "check")
    assert check.returncode == 0, check.stderr or check.stdout
    balances = _bea(tmp_path, "--json", "--file", str(ledger), "query", BALANCES)
    assert balances.returncode == 0, balances.stderr or balances.stdout
    postings = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT count(*) AS postings")
    assert postings.returncode == 0, postings.stderr or postings.stdout
    return json.loads(balances.stdout)["data"]["rows"], int(json.loads(postings.stdout)["data"]["rows"][0][0])


@pytest.mark.skipif(sys.platform == "win32", reason="needs symlinks and hard links")
@pytest.mark.parametrize(
    "arrange",
    [_symlinks, _symlink_beside_its_target, _symlinked_directory, _hard_links, _regular_copies],
    ids=["symlinks", "symlink-beside-target", "symlinked-directory", "hard-links", "regular-copies"],
)
def test_export_loads_the_same_ledger_as_its_source(tmp_path: Path, arrange: Callable[[Path], list[str]]) -> None:
    source = tmp_path / "source"
    source.mkdir()
    includes = arrange(source)
    main = source / "main.bean"
    main.write_text(OPENS + "".join(f'include "{name}"\n' for name in includes), encoding="utf-8")
    before = _loaded(tmp_path, main)
    assert before[1] == 4

    output = tmp_path / "output"
    result = _bea(tmp_path, "--json", "--offline", "--file", str(main), "price", "export", "--output", str(output))
    assert result.returncode == 0, result.stderr or result.stdout
    files = json.loads(result.stdout)["data"]["files"]
    assert len(files) == len(set(files)) == 3, files
    assert all(Path(name).is_file() and not Path(name).is_symlink() for name in files)

    assert _loaded(tmp_path, output / "main.bean") == before
    # Both names survive in the copy; neither include was folded into the other.
    assert (output / "main.bean").read_text(encoding="utf-8") == main.read_text(encoding="utf-8")
