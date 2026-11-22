"""`bea ingest` delegates identify/extract/archive through the engine interpreter."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path
from unittest.mock import Mock

import pytest
from typer.testing import CliRunner

from cli.engine import launch
from cli.main import app

runner = CliRunner()
SOURCE_ROOT = Path(__file__).resolve().parents[1] / "src"

INGEST_SCRIPT = textwrap.dedent(
    '''\
    """Synthetic Beangulp ingest script for bea ingest tests."""
    from __future__ import annotations

    import fnmatch
    from datetime import date
    from pathlib import Path

    from beancount.parser import parser
    from beangulp import Ingest
    from beangulp.importer import Importer


    class CsvImporter(Importer):
        @property
        def name(self) -> str:
            return "test.CsvImporter"

        def identify(self, filepath: str) -> bool:
            return filepath.endswith(".csv")

        def date(self, filepath: str):
            return date(1970, 1, 1)

        def account(self, filepath: str) -> str:
            return "Assets:Tests"

        def filename(self, filepath: str):
            return Path(filepath).name

        def extract(self, filepath: str, existing):
            return []

        def deduplicate(self, entries, existing):
            return entries


    class BeansImporter(Importer):
        def __init__(self, pattern: str):
            self._pattern = pattern

        @property
        def name(self) -> str:
            return f"test.Beans:{self._pattern}"

        def identify(self, filepath: str) -> bool:
            return fnmatch.fnmatch(filepath, self._pattern)

        def date(self, filepath: str):
            return date(1970, 1, 1)

        def account(self, filepath: str) -> str:
            return "Assets:Tests"

        def filename(self, filepath: str):
            return None

        def extract(self, filepath: str, existing):
            entries, _errors, _options = parser.parse_file(filepath)
            return entries

        def deduplicate(self, entries, existing):
            return entries


    class CollisionImporter(CsvImporter):
        @property
        def name(self) -> str:
            return "test.Collision"

        def identify(self, filepath: str) -> bool:
            return Path(filepath).name == "error.foo"

        def filename(self, filepath: str):
            return "bbb.csv"


    def mark_hook(extracted, existing):
        for filename, entries, account, importer in extracted:
            for entry in entries:
                entry.meta["hooked"] = True
        return extracted


    importers = [
        CsvImporter(),
        BeansImporter("*one.beans"),
        CollisionImporter(),
    ]

    if __name__ == "__main__":
        Ingest(importers, hooks=[mark_hook])()
    '''
)


_ONE_BEANS = '1970-01-01 * "Hooked"\n  Assets:Tests  1.00 USD\n  Equity:Opening-Balances -1.00 USD\n'


def _write_ingest(directory: Path) -> Path:
    script = directory / "ingest.py"
    script.write_text(INGEST_SCRIPT)
    return script


class TestIngestFeatureGate:
    def test_missing_feature_points_at_engine_enable(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        result = runner.invoke(app, ["ingest", "identify", "--config", str(script), str(tmp_path)])
        assert result.exit_code == 2, result.output
        assert "bea engine enable beangulp" in result.output

    def test_frontend_never_imports_beangulp_on_ingest_help(self) -> None:
        script = (
            "import json, sys\n"
            "from typer.testing import CliRunner\n"
            "from cli.main import app\n"
            "result = CliRunner().invoke(app, ['ingest', '--help'])\n"
            "loaded = [m for m in ('beancount', 'beangulp', 'beanprice', 'bea_engine') if m in sys.modules]\n"
            "print(json.dumps({'exit_code': result.exit_code, 'loaded': loaded}))\n"
        )
        completed = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=True,
            cwd=SOURCE_ROOT.parent,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )
        answered = json.loads(completed.stdout)
        assert answered["exit_code"] == 0
        assert answered["loaded"] == []


@pytest.mark.usefixtures("use_optional_engine")
class TestIngestLifecycle:
    def test_identify_matches_csv_and_skips_others(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        downloads.mkdir()
        (downloads / "aaa.txt").write_text("")
        (downloads / "bbb.csv").write_text("")
        (downloads / "zzz.txt").write_text("")

        result = runner.invoke(
            app,
            ["ingest", "identify", "--config", str(script), str(downloads)],
        )
        assert result.exit_code == 0, result.output
        out = result.output.replace("\r\n", "\n")
        assert "bbb.csv" in out and "OK" in out
        assert "test.CsvImporter" in out
        assert "aaa.txt" in out
        assert "zzz.txt" in out

    def test_extract_runs_hooks_and_writes_entries(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        downloads.mkdir()
        beans = downloads / "one.beans"
        beans.write_text('1970-01-01 * "Hooked"\n  Assets:Tests  1.00 USD\n  Equity:Opening-Balances -1.00 USD\n')
        output = tmp_path / "out.beancount"

        result = runner.invoke(
            app,
            [
                "ingest",
                "extract",
                "--config",
                str(script),
                str(downloads),
                "-o",
                str(output),
            ],
        )
        assert result.exit_code == 0, result.output
        text = output.read_text()
        assert "one.beans" in text
        assert "Hooked" in text
        assert "hooked:" in text.lower()

    @pytest.mark.parametrize(
        "case",
        ["source-file", "source-directory", "nested-in-directory", "symlink", "hard-link", "script", "clustered"],
    )
    def test_extract_refuses_a_destination_that_is_one_of_its_inputs(self, tmp_path: Path, case: str) -> None:
        """`-o` naming a source document or the script replaced it and exited 0 (w5/068)."""
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        (downloads / "deep").mkdir(parents=True)
        beans = downloads / "one.beans"
        beans.write_text(_ONE_BEANS)
        nested = downloads / "deep" / "one.beans"
        nested.write_text(_ONE_BEANS)
        source, destination, named = str(beans), ["-o", str(beans)], beans
        if case == "source-directory":
            source = str(downloads)
        elif case == "nested-in-directory":
            source, destination, named = str(downloads), [f"--output={nested}"], nested
        elif case == "symlink":
            (tmp_path / "link.beans").symlink_to(beans)
            destination = ["-o", str(tmp_path / "link.beans")]
        elif case == "hard-link":
            os.link(beans, tmp_path / "hard.beans")
            source, destination = str(downloads), ["-o", str(tmp_path / "hard.beans")]
        elif case == "script":
            destination, named = [f"--output={script}"], script
        elif case == "clustered":
            destination = ["-qo", str(beans)]
        before = {path: path.read_bytes() for path in (beans, nested, script)}

        result = runner.invoke(app, ["ingest", "extract", "--config", str(script), source, *destination])

        assert result.exit_code == 2, result.output
        assert "would overwrite the file it reads" in result.output.replace("\n", " ")
        assert named.name in result.output
        assert {path: path.read_bytes() for path in before} == before

    def test_extract_still_replaces_an_unrelated_existing_export(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        downloads.mkdir()
        beans = downloads / "one.beans"
        beans.write_text(_ONE_BEANS)
        earlier = tmp_path / "out.beancount"
        earlier.write_text("; an earlier extract\n")

        result = runner.invoke(app, ["ingest", "extract", "--config", str(script), str(beans), "-o", str(earlier)])

        assert result.exit_code == 0, result.output
        assert "Hooked" in earlier.read_text()
        assert beans.read_text() == _ONE_BEANS

    def test_archive_dry_run_does_not_move_files(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        documents = tmp_path / "documents"
        downloads.mkdir()
        documents.mkdir()
        csv = downloads / "bbb.csv"
        csv.write_text("")

        dry = runner.invoke(
            app,
            [
                "ingest",
                "archive",
                "--config",
                str(script),
                str(downloads),
                "-o",
                str(documents),
                "-n",
            ],
        )
        assert dry.exit_code == 0, dry.output
        assert csv.exists()
        assert not (documents / "Assets" / "Tests" / "1970-01-01.bbb.csv").exists()
        assert "1970-01-01.bbb.csv" in dry.output

    def test_archive_moves_then_collision_fails(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        documents = tmp_path / "documents"
        downloads.mkdir()
        documents.mkdir()
        (downloads / "bbb.csv").write_text("first")

        moved = runner.invoke(
            app,
            [
                "ingest",
                "archive",
                "--config",
                str(script),
                str(downloads),
                "-o",
                str(documents),
            ],
        )
        assert moved.exit_code == 0, moved.output
        archived = documents / "Assets" / "Tests" / "1970-01-01.bbb.csv"
        assert archived.is_file()
        assert not (downloads / "bbb.csv").exists()

        (downloads / "bbb.csv").write_text("again")
        collision = runner.invoke(
            app,
            [
                "ingest",
                "archive",
                "--config",
                str(script),
                str(downloads),
                "-o",
                str(documents),
            ],
        )
        assert collision.exit_code == 1, collision.output
        assert "Destination file already exists" in collision.output
        assert (downloads / "bbb.csv").exists()  # errors abort filing

    def test_archive_destination_path_collision(self, tmp_path: Path) -> None:
        script = _write_ingest(tmp_path)
        downloads = tmp_path / "downloads"
        documents = tmp_path / "documents"
        downloads.mkdir()
        documents.mkdir()
        (downloads / "bbb.csv").write_text("")
        (downloads / "error.foo").write_text("")

        result = runner.invoke(
            app,
            [
                "ingest",
                "archive",
                "--config",
                str(script),
                str(downloads),
                "-o",
                str(documents),
            ],
        )
        assert result.exit_code == 1, result.output
        assert "Collision in destination file path" in result.output
        assert (downloads / "bbb.csv").exists()
        assert (downloads / "error.foo").exists()

    def test_default_ingest_py_beside_ledger(self, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text('option "operating_currency" "USD"\n')
        _write_ingest(tmp_path)
        downloads = tmp_path / "dl"
        downloads.mkdir()
        (downloads / "x.csv").write_text("")

        result = runner.invoke(
            app,
            ["--file", str(ledger), "ingest", "identify", str(downloads)],
        )
        assert result.exit_code == 0, result.output
        assert "test.CsvImporter" in result.output


def test_config_module_refused_before_silent_noop(tmp_path: Path) -> None:
    """A CONFIG = [...] module would load, ignore argv, and exit 0 with no output."""
    script = tmp_path / "importers.py"
    script.write_text("CONFIG = []\n")
    downloads = tmp_path / "downloads"
    downloads.mkdir()
    result = runner.invoke(
        app,
        ["ingest", "identify", "--config", str(script), str(downloads)],
    )
    assert result.exit_code == 2, result.output
    assert "bea import --config" in result.output
    assert "beangulp.Ingest" in result.output


_MINIMAL_INGEST = "from beangulp import Ingest\nIngest([])()\n"


@pytest.fixture
def recorded_script(monkeypatch: pytest.MonkeyPatch) -> Mock:
    call = Mock(return_value=0)
    monkeypatch.setattr(launch, "run_optional_script", call)
    return call


@pytest.mark.parametrize("ledger_from", ["--file", "$BEA_FILE"])
def test_ingest_py_in_the_working_directory_is_not_a_default(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, recorded_script: Mock, ledger_from: str
) -> None:
    """Without --config, only ingest.py beside the root ledger is used."""
    books = tmp_path / "books"
    books.mkdir()
    ledger = books / "main.bean"
    ledger.write_text('option "operating_currency" "USD"\n')
    work = tmp_path / "work"
    work.mkdir()
    (work / "ingest.py").write_text(_MINIMAL_INGEST)
    monkeypatch.chdir(work)
    if ledger_from == "$BEA_FILE":
        monkeypatch.setenv("BEA_FILE", str(ledger))
        args = ["ingest", "identify", "."]
    else:
        args = ["--file", str(ledger), "ingest", "identify", "."]

    result = runner.invoke(app, args)

    assert result.exit_code == 2, result.output
    assert "Choose an ingest script with --config FILE" in result.output
    assert str(books) in result.output
    assert "pass --config ingest.py" in result.output
    recorded_script.assert_not_called()


def test_ledger_in_the_working_directory_uses_the_ingest_py_beside_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, recorded_script: Mock
) -> None:
    (tmp_path / "main.bean").write_text('option "operating_currency" "USD"\n')
    (tmp_path / "ingest.py").write_text(_MINIMAL_INGEST)
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(app, ["ingest", "identify", "."])

    assert result.exit_code == 0, result.output
    recorded_script.assert_called_once()
    _feature, script, forwarded = recorded_script.call_args.args
    assert script.resolve() == (tmp_path / "ingest.py").resolve()
    assert forwarded == ["identify", "."]


def test_missing_ingest_script_names_only_the_ledger_folder(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, recorded_script: Mock
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text('option "operating_currency" "USD"\n')
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(app, ["ingest", "identify", "."])

    assert result.exit_code == 2, result.output
    assert "Choose an ingest script with --config FILE" in result.output
    assert "./ingest.py" not in result.output
    recorded_script.assert_not_called()


@pytest.mark.usefixtures("use_optional_engine")
@pytest.mark.parametrize("operation", ["identify", "extract", "archive"])
def test_json_ingest_refuses_before_native_output_or_file_effects(tmp_path: Path, operation: str) -> None:
    script = _write_ingest(tmp_path)
    downloads = tmp_path / "downloads"
    documents = tmp_path / "documents"
    downloads.mkdir()
    documents.mkdir()
    source = downloads / "statement.csv"
    source.write_text("synthetic export")
    result = runner.invoke(
        app,
        [
            "--json",
            "ingest",
            operation,
            "--config",
            str(script),
            str(downloads),
            *(["-o", str(documents)] if operation == "archive" else []),
        ],
    )
    assert result.exit_code == 2, result.output
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "bea ingest has no JSON output" in error["message"]
    assert source.read_text() == "synthetic export"
    assert not list(documents.iterdir())
