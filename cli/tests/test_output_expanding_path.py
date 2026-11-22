"""An expanding `$VAR` in a created ledger path is refused before anything is written (w5/794).

`example -o 'demo$HOME.bean'` and `price export -o 'out$HOME'` exited 0 and
created ledgers every later command refused to read. `init` already refuses
such paths (w5/579); the other writers now do too. An unset variable still
writes literally, as reads do (w5/315).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n'


def _bea(tmp_path: Path, *args: str, **env_overrides: str | None) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    for key, value in env_overrides.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _created(work: Path) -> list[str]:
    return sorted(path.name for path in work.iterdir() if path.name not in {"config", "cache"})


def test_example_refuses_an_expanding_output_and_creates_nothing(tmp_path: Path) -> None:
    work = tmp_path / "work"
    work.mkdir()

    result = _bea(work, "example", "-o", "demo$X.bean", X="expanded")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "contains an environment variable that Beancount would expand" in result.stdout + result.stderr
    assert _created(work) == []


def test_price_export_refuses_an_expanding_root_and_creates_nothing(tmp_path: Path) -> None:
    work = tmp_path / "work"
    work.mkdir()
    (work / "main.bean").write_text(LEDGER)

    result = _bea(work, "--offline", "-f", "main.bean", "price", "export", "-o", "out$X", X="expanded")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "contains an environment variable that Beancount would expand" in result.stdout + result.stderr
    assert _created(work) == ["main.bean"]


def test_example_with_an_unset_variable_writes_literally(tmp_path: Path) -> None:
    work = tmp_path / "work"
    work.mkdir()

    # Seeded and bounded: an unseeded bean-example history sometimes trips its
    # own "Cash balance is negative" check (CI run 44928948112), which is not
    # what this pins.
    seeded = ("--seed", "1", "--date-begin", "2026-01-01", "--date-end", "2026-04-01")
    result = _bea(work, "example", *seeded, "-o", "demo$X.bean", X=None)

    assert result.returncode == 0, result.stderr
    assert (work / "demo$X.bean").is_file()


def test_price_export_with_an_unset_variable_writes_literally(tmp_path: Path) -> None:
    work = tmp_path / "work"
    work.mkdir()
    (work / "main.bean").write_text(LEDGER)

    result = _bea(work, "--offline", "-f", "main.bean", "price", "export", "-o", "out$X", X=None)

    assert result.returncode == 0, result.stderr
    assert (work / "out$X" / "main.bean").is_file()
