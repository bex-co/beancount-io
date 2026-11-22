"""The `bea ingest` CONFIG preflight reads the script's shape, not its spelling (w5/167).

A script that keeps its importers in `CONFIG` and reaches `beangulp.Ingest`
through a helper module was refused with exit 2, while a config-only module
written `CONFIG: list = [...]` passed and exited 0 having done nothing.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

BANK = """\
import datetime

import beangulp


class Bank(beangulp.Importer):
    @property
    def name(self):
        return "bank"

    def identify(self, filepath):
        return filepath.endswith(".csv")

    def account(self, filepath):
        return "Assets:Checking"

    def date(self, filepath):
        return datetime.date(2026, 8, 31)

    def filename(self, filepath):
        return "bank.csv"

    def extract(self, filepath, existing):
        return []
"""
RUNNER = """\
import beangulp


def run(importers, hooks=None):
    beangulp.Ingest(importers, hooks)()
"""
HELPER_SCRIPT = """\
from bank import Bank
from runner import run

{binding} = [Bank()]

if __name__ == "__main__":
    run({name})
"""
REFUSAL = "looks like a `bea import --config` module (CONFIG = [...])"
OPERATIONS = ["identify", "extract", "archive"]


def _project(tmp_path: Path) -> Path:
    project = tmp_path / "project"
    (project / "dl").mkdir(parents=True)
    # The root ledger a default `ingest.py` is found beside.
    (project / "main.bean").write_text('option "operating_currency" "USD"\n')
    (project / "dl" / "a.csv").write_text("Date,Payee,Narration,Amount\n2026-08-02,Cafe,Coffee,-5.25\n")
    (project / "bank.py").write_text(BANK)
    (project / "runner.py").write_text(RUNNER)
    return project


def _bea(project: Path, engine: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(project.parent / "config"),
        XDG_CACHE_HOME=str(project.parent / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        BEA_ENGINE_PYTHON=str(engine),
        PYTHONPATH=str(ROOT / "src"),
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        cwd=project,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


@pytest.mark.parametrize("binding", ["CONFIG", "CONFIG: list", "IMPORTERS"])
def test_script_reaching_ingest_through_a_helper_runs(
    tmp_path: Path, optional_engine_python: Path, binding: str
) -> None:
    """`IMPORTERS` is the control that always ran; the `CONFIG` spellings were refused."""
    project = _project(tmp_path)
    name = binding.partition(":")[0]
    (project / "ingest.py").write_text(HELPER_SCRIPT.format(binding=binding, name=name))

    result = _bea(project, optional_engine_python, "ingest", "identify", "dl")

    assert result.returncode == 0, result.stderr
    assert "a.csv" in result.stdout and "OK" in result.stdout
    assert "bank" in result.stdout
    assert REFUSAL not in result.stderr


@pytest.mark.parametrize("operation", OPERATIONS)
@pytest.mark.parametrize(
    "binding",
    [
        "CONFIG = [Bank()]",
        "CONFIG: list = [Bank()]",
        "CONFIG: list[beangulp.Importer] = [Bank()]",
        "HOOKS, CONFIG = [], [Bank()]",
    ],
)
def test_config_only_module_is_refused(
    tmp_path: Path, optional_engine_python: Path, operation: str, binding: str
) -> None:
    """Plain `CONFIG = [...]` is the control that was always refused."""
    project = _project(tmp_path)
    (project / "annot.py").write_text(f"{BANK}\n\n{binding}\n")

    result = _bea(project, optional_engine_python, "ingest", operation, "--config", "annot.py", "dl")

    assert result.returncode == 2, (result.stdout, result.stderr)
    assert REFUSAL in result.stderr
    assert "run `bea import --config` for this file instead" in result.stderr
    assert result.stdout == ""
    assert (project / "dl" / "a.csv").is_file()


def test_main_guard_written_the_other_way_round_runs(tmp_path: Path, optional_engine_python: Path) -> None:
    project = _project(tmp_path)
    script = HELPER_SCRIPT.format(binding="CONFIG", name="CONFIG").replace(
        'if __name__ == "__main__":', "if '__main__' == __name__:"
    )
    (project / "ingest.py").write_text(script)

    result = _bea(project, optional_engine_python, "ingest", "identify", "dl")

    assert result.returncode == 0, result.stderr
    assert "a.csv" in result.stdout


def test_unparsable_script_is_left_to_python(tmp_path: Path, optional_engine_python: Path) -> None:
    """A syntax error is Python's to report; the preflight only refuses the known-silent shape."""
    project = _project(tmp_path)
    (project / "ingest.py").write_text("CONFIG = [\n")

    result = _bea(project, optional_engine_python, "ingest", "identify", "dl")

    assert result.returncode != 0
    assert "SyntaxError" in result.stderr
    assert REFUSAL not in result.stderr
