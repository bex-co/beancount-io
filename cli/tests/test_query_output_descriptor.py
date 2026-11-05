"""`query -o` writes a descriptor this process holds: `>(cmd)`, `/dev/fd/3`, `/dev/stderr` (w5/853).

The path went to the engine, a separate process, where the descriptor was
closed (`Bad file descriptor`) or was the engine's own reply pipe: `-o
/dev/fd/3` dumped the rows into the envelope channel and failed. Under
`--json`, `/dev/stderr` was staged beside as a regular file.
"""

from __future__ import annotations

import os
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = (
    "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Shop USD\n"
    '2026-02-01 * "Shop" "x"\n  Expenses:Shop  12.50 USD\n  Assets:Cash\n'
)
ROWS = "date,payee\n2026-02-01,Shop\n2026-02-01,Shop\n"
pytestmark = pytest.mark.skipif(sys.platform == "win32" or shutil.which("bash") is None, reason="POSIX bash")


def _bash(tmp_path: Path, script: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        BEA=f"{shlex.quote(sys.executable)} -m cli.main",
    )
    (tmp_path / "main.bean").write_text(LEDGER)
    return subprocess.run(
        ["bash", "-c", script],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=180,
    )


@pytest.mark.parametrize("ledger", ["--file main.bean", "--source main.bean"], ids=["file", "source"])
def test_process_substitution_receives_the_rows(tmp_path: Path, ledger: str) -> None:
    order = "--file main.bean query" if ledger.startswith("--file") else "query --source main.bean"
    done = _bash(
        tmp_path, f'$BEA {order} -f csv -o >(cat > out.csv) "SELECT date, payee" && wait $! 2>/dev/null; sleep 1'
    )

    assert done.returncode == 0, done.stdout + done.stderr
    assert (tmp_path / "out.csv").read_text() == ROWS


def test_a_redirected_descriptor_receives_the_rows_not_the_reply_channel(tmp_path: Path) -> None:
    done = _bash(tmp_path, '$BEA --file main.bean query -f csv -o /dev/fd/3 "SELECT date, payee" 3>fd3.csv')

    assert done.returncode == 0, done.stdout + done.stderr
    assert (tmp_path / "fd3.csv").read_text() == ROWS
    assert "did not answer" not in done.stderr


def test_json_to_stderr_is_written_through(tmp_path: Path) -> None:
    done = _bash(tmp_path, '$BEA --json --file main.bean query -o /dev/stderr "SELECT payee" 2>err.json')

    assert done.returncode == 0, done.stdout + done.stderr
    assert '"rows": [["Shop"], ["Shop"]]' in (tmp_path / "err.json").read_text()


def test_a_closed_descriptor_names_the_output(tmp_path: Path) -> None:
    done = _bash(tmp_path, '$BEA --file main.bean query -f csv -o /dev/fd/9 "SELECT payee" 9>&-')

    assert done.returncode == 2, done.stdout + done.stderr
    assert "Cannot write --output /dev/fd/9:" in done.stderr
    # macOS reports EBADF; Linux's /dev/fd symlink lookup reports ENOENT.
    assert "Bad file descriptor" in done.stderr or "No such file or directory" in done.stderr
