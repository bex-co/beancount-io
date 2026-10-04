"""Native short-option values belong to the downstream parser (w3/456)."""

from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import Mock

import pytest
from typer.testing import CliRunner

from cli.engine import launch
from cli.main import app

runner = CliRunner()


@pytest.fixture
def books(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    directory = tmp_path / "books"
    directory.mkdir()
    (directory / "history.bean").write_text(
        '2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\ninclude "child.bean"\n'
    )
    (directory / "child.bean").write_text('2024-02-01 * "Opening"\n  Assets:Cash  10 USD\n  Equity:Opening  -10 USD\n')
    (directory / "ingest.py").write_text("from beangulp import Ingest\nIngest([])()\n")
    (directory / "other-ingest.py").write_text("from beangulp import Ingest\nIngest([])()\n")
    monkeypatch.chdir(directory)
    return directory


@pytest.fixture
def recorded_engine(monkeypatch: pytest.MonkeyPatch) -> dict[str, Mock]:
    calls = {
        "run_native": Mock(return_value=0),
        "run_optional_native": Mock(return_value=0),
        "run_optional_script": Mock(return_value=0),
        "capture_native": Mock(return_value=subprocess.CompletedProcess([], 0, "native result\n", "")),
        "helper_json": Mock(return_value={}),
    }
    for name, call in calls.items():
        monkeypatch.setattr(launch, name, call)
    return calls


@pytest.mark.parametrize("operation", ["extract", "identify", "archive"])
@pytest.mark.parametrize("config_first", [True, False], ids=["config-first", "config-last"])
def test_ingest_preserves_glued_native_options_around_frontend_config(
    books: Path, recorded_engine: dict[str, Mock], operation: str, config_first: bool
) -> None:
    native = ["-o./help/output.bean", "-e./history.bean", "input.csv"]
    config = ["--config", "other-ingest.py"]
    args = [*config, *native] if config_first else [*native, *config]

    result = runner.invoke(app, ["-f", str(books / "history.bean"), "ingest", operation, *args])

    assert result.exit_code == 0, result.output
    recorded_engine["run_optional_script"].assert_called_once_with(
        "beangulp", (books / "other-ingest.py").resolve(), [operation, *native]
    )
    assert not (books / "help").exists()


@pytest.mark.parametrize(
    ("command", "native", "seam", "program", "prefix"),
    [
        (["example"], ["-o./help/example.bean"], "capture_native", "bean-example", []),
        (["price"], ["-eUSD:help/source"], "run_optional_native", "bean-price", []),
        (["check"], ["-f./help/check.log"], "run_native", "bean-check", ["{root}"]),
        (["doctor", "list-options"], ["-x./help/options"], "run_native", "bean-doctor", ["list-options"]),
        (
            ["doctor", "dump-lexer"],
            ["-f./help/tokens", "history.bean"],
            "run_native",
            "bean-doctor",
            ["lex"],
        ),
    ],
    ids=["example", "price", "check-global-short-f", "doctor-leaf", "doctor-alias"],
)
def test_other_forwarders_preserve_the_complete_unknown_short_token(
    books: Path,
    recorded_engine: dict[str, Mock],
    command: list[str],
    native: list[str],
    seam: str,
    program: str,
    prefix: list[str],
) -> None:
    root = books / "history.bean"

    result = runner.invoke(app, ["-f", str(root), *command, *native])

    assert result.exit_code == 0, result.output
    forwarded = [*(part.format(root=root) for part in prefix), *native]
    if seam == "run_optional_native":
        recorded_engine[seam].assert_called_once_with("beanprice", program, forwarded)
    else:
        recorded_engine[seam].assert_called_once_with(program, forwarded)


@pytest.mark.parametrize(
    ("native", "written"),
    [
        (["-o", "help.out"], "help.out"),
        (["--output=help.out"], "help.out"),
        (["-of.out"], "f.out"),
        (["-o./help/tree.txt"], "help/tree.txt"),
    ],
)
def test_existing_output_spellings_still_reach_the_destination(
    books: Path, recorded_engine: dict[str, Mock], native: list[str], written: str
) -> None:
    """bea writes treeify's destination itself, after upstream succeeds (w1/084)."""
    (books / "help").mkdir()

    result = runner.invoke(app, ["treeify", *native, "input.txt"])

    assert result.exit_code == 0, result.output
    recorded_engine["capture_native"].assert_called_once_with("treeify", ["--", "input.txt"])
    assert (books / written).read_text() == "native result\n"


@pytest.mark.parametrize("command", [["treeify"], ["ingest", "extract"], ["doctor", "dump-lexer"]])
@pytest.mark.parametrize("help_flag", ["-h", "--help"])
def test_explicit_frontend_help_never_launches_the_engine(
    books: Path, recorded_engine: dict[str, Mock], command: list[str], help_flag: str
) -> None:
    result = runner.invoke(app, [*command, help_flag])

    assert result.exit_code == 0, result.output
    assert "Usage:" in result.output
    for call in recorded_engine.values():
        call.assert_not_called()


def test_double_dash_keeps_help_and_config_in_native_arguments(books: Path, recorded_engine: dict[str, Mock]) -> None:
    native = ["-h", "--config", "native-config.py", "-ohelp.out"]

    result = runner.invoke(app, ["ingest", "identify", "--config", "other-ingest.py", "--", *native])

    assert result.exit_code == 0, result.output
    recorded_engine["run_optional_script"].assert_called_once_with(
        "beangulp", (books / "other-ingest.py").resolve(), ["identify", *native]
    )


@pytest.mark.parametrize("command", [["ingest", "extract"], ["treeify"]])
@pytest.mark.parametrize("destination", ["history.bean", "child.bean"])
def test_glued_output_still_reaches_the_ledger_destination_guard(
    books: Path, recorded_engine: dict[str, Mock], command: list[str], destination: str
) -> None:
    before = {path.name: path.read_bytes() for path in books.iterdir()}

    result = runner.invoke(app, ["-f", str(books / "history.bean"), *command, f"-o{destination}"])

    assert result.exit_code == 2, result.output
    assert "would overwrite the ledger it reads" in result.output
    assert {path.name: path.read_bytes() for path in books.iterdir()} == before
    for call in recorded_engine.values():
        call.assert_not_called()


def test_real_treeify_writes_glued_destination_containing_help(books: Path) -> None:
    source = books / "accounts.txt"
    source.write_text("Assets:Bank:Checking               100\nAssets:Cash                       25\n")
    before = source.read_bytes()

    result = runner.invoke(app, ["treeify", "-ohelp-tree.txt", str(source)])

    assert result.exit_code == 0, result.output
    destination = books / "help-tree.txt"
    assert destination.is_file(), result.output
    assert "`-- Assets" in destination.read_text()
    assert source.read_bytes() == before


def test_real_example_writes_glued_destination_containing_help(books: Path) -> None:
    result = runner.invoke(
        app,
        [
            "example",
            "-ohelp-example.bean",
            "--date-begin",
            "2024-01-01",
            "--date-end",
            "2024-02-01",
            "--date-birth",
            "1980-01-01",
            "--seed",
            "1",
        ],
    )

    assert result.exit_code == 0, result.output
    destination = books / "help-example.bean"
    assert destination.is_file(), result.output
    assert "Assets:" in destination.read_text()
    checked = runner.invoke(app, ["--file", str(destination), "check"])
    assert checked.exit_code == 0, checked.output


@pytest.mark.parametrize("native", [["-qo", "new.bean"], ["-ronew.bean"]])
def test_clustered_output_to_a_fresh_file_still_forwards(
    books: Path, recorded_engine: dict[str, Mock], native: list[str]
) -> None:
    """The cluster-aware guard (w1/141) refuses only ledgers, not new destinations."""
    result = runner.invoke(app, ["-f", str(books / "history.bean"), "ingest", "extract", *native, "input.csv"])

    assert result.exit_code == 0, result.output
    recorded_engine["run_optional_script"].assert_called_once_with(
        "beangulp", (books / "ingest.py").resolve(), ["extract", *native, "input.csv"]
    )
