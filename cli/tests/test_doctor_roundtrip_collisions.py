"""`doctor roundtrip` never destroys a file that was already there (w3/409).

Upstream's `roundtrip` writes its comparison to `<stem>.roundtrip1<suffix>` and
`<stem>.roundtrip2<suffix>` beside the ledger, opening both with `w`, and
removes them in a `finally` — unconditionally. Anything already at those paths
is therefore overwritten and then deleted. A read-only diagnostic reported
`Entries are the same. Congratulations.` at exit 0 while destroying a ledger
include sitting beside the file it was checking; the next `bea check` failed
on the account the deleted file declared.

`bea` cannot make upstream choose other names, so it refuses before either
forwarding branch runs, naming the paths. That is what this file pins, along
with the ordinary runs the guard must not disturb.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path

import pytest

from cli.commands.doctor import _roundtrip_artifacts

ROOT = Path(__file__).resolve().parents[1]

MAIN_WITH_INCLUDE = """include "main.roundtrip1.bean"
2026-01-01 open Assets:Cash USD
2026-01-02 * "Opening"
  Assets:Cash 5 USD
  Equity:Opening
"""
INCLUDED = "; User-owned included accounts\n2026-01-01 open Equity:Opening USD\n"
UNRELATED = '; User-owned unrelated notes\n2026-01-03 note Assets:Cash "Keep this file"\n'
SELF_CONTAINED = """2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash 5 USD
  Equity:Opening
"""


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


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_the_artifact_names_match_upstream(tmp_path: Path) -> None:
    """The guard is only worth its agreement with what upstream actually writes.

    Read off `beancount.scripts.doctor`'s own source rather than trusted: if
    upstream renames or relocates its scratch files, this fails instead of the
    guard quietly protecting the wrong paths.
    """
    import inspect

    from beancount.scripts import doctor

    body = inspect.getsource(doctor.roundtrip.callback)
    assert "os.path.splitext(filename)" in body
    for index in (1, 2):
        assert f'".roundtrip{index}"' in body, f"upstream no longer writes .roundtrip{index}"

    ledger = tmp_path / "books.beancount"
    assert [path.name for path in _roundtrip_artifacts(str(ledger))] == [
        "books.roundtrip1.beancount",
        "books.roundtrip2.beancount",
    ]


@pytest.fixture
def colliding(tmp_path: Path) -> dict[str, Path]:
    files = {
        "main": tmp_path / "main.bean",
        "include": tmp_path / "main.roundtrip1.bean",
        "unrelated": tmp_path / "main.roundtrip2.bean",
    }
    files["main"].write_text(MAIN_WITH_INCLUDE, encoding="utf-8")
    files["include"].write_text(INCLUDED, encoding="utf-8")
    files["unrelated"].write_text(UNRELATED, encoding="utf-8")
    return files


def test_a_collision_is_refused_and_nothing_is_lost(tmp_path: Path, colliding: dict[str, Path]) -> None:
    before = {name: _digest(path) for name, path in colliding.items()}

    done = _bea(tmp_path, "doctor", "roundtrip", str(colliding["main"]))

    assert done.returncode == 4, done.stdout
    assert "would overwrite and then delete" in done.stderr
    for name, path in colliding.items():
        assert path.exists(), f"{name} was deleted"
        assert _digest(path) == before[name], f"{name} was modified"
    assert "Congratulations" not in done.stdout + done.stderr


def test_both_colliding_paths_are_named(tmp_path: Path, colliding: dict[str, Path]) -> None:
    done = _bea(tmp_path, "doctor", "roundtrip", str(colliding["main"]))

    assert str(colliding["include"]) in done.stderr
    assert str(colliding["unrelated"]) in done.stderr


def test_the_ledger_still_loads_after_the_refusal(tmp_path: Path, colliding: dict[str, Path]) -> None:
    """The real damage was a ledger that stopped loading; check it still does."""
    _bea(tmp_path, "doctor", "roundtrip", str(colliding["main"]))

    done = _bea(tmp_path, "--json", "--file", str(colliding["main"]), "check")

    assert done.returncode == 0, done.stderr


@pytest.mark.parametrize("which", ["include", "unrelated"])
def test_one_colliding_file_is_enough_to_refuse(tmp_path: Path, which: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(SELF_CONTAINED, encoding="utf-8")
    artifact = tmp_path / ("main.roundtrip1.bean" if which == "include" else "main.roundtrip2.bean")
    artifact.write_text("; mine\n", encoding="utf-8")

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 4
    assert artifact.read_text(encoding="utf-8") == "; mine\n"


def test_a_dangling_symlink_still_counts_as_taken(tmp_path: Path) -> None:
    """Opening it for write would create its target, and cleanup would remove it."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(SELF_CONTAINED, encoding="utf-8")
    link = tmp_path / "main.roundtrip1.bean"
    link.symlink_to(tmp_path / "nowhere")

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 4, done.stdout
    assert link.is_symlink(), "the link itself must survive"


def test_an_ordinary_roundtrip_still_runs(tmp_path: Path) -> None:
    """The control: with the names free, the diagnostic is unchanged."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(SELF_CONTAINED, encoding="utf-8")
    before = _digest(ledger)

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 0, done.stderr
    assert "Congratulations" in done.stdout + done.stderr
    assert _digest(ledger) == before
    assert sorted(path.name for path in tmp_path.iterdir() if path.suffix == ".bean") == ["main.bean"]


def test_an_invalid_ledger_keeps_its_own_diagnostic(tmp_path: Path) -> None:
    """w3/371's behaviour: no congratulations, non-zero, source untouched."""
    ledger = tmp_path / "main.bean"
    ledger.write_text("this is not beancount\n", encoding="utf-8")
    before = _digest(ledger)

    done = _bea(tmp_path, "doctor", "roundtrip", str(ledger))

    assert done.returncode == 1
    assert "Congratulations" not in done.stdout + done.stderr
    assert _digest(ledger) == before
