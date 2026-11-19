"""`--into` a file nothing includes, in a missing directory, gets one complete refusal (w1/316).

The refusal named only the directory: `Create the directory first.` Once
that was done, the same command was refused again, because no include line
or glob covered the file. The one refusal now names both, and following it
once makes the same command write.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = 'option "operating_currency" "USD"\n2024-01-01 open Assets:Checking USD\n2024-01-01 open Expenses:Food USD\n'
ADD = ["add", "transaction", "Lunch", "--date", "2024-04-01", "-p", "Expenses:Food 5 USD", "-p", "Assets:Checking"]
IMPORT = ["import", "statement.csv", "--csv", "auto", "--account", "Assets:Checking"]
IMPORT += ["--default-account", "Expenses:Food", "--apply"]


def _books(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, root: str = LEDGER) -> Path:
    (tmp_path / "main.bean").write_text(root)
    (tmp_path / "statement.csv").write_text("Date,Description,Amount\n2024-04-01,Lunch,-5.00\n")
    monkeypatch.chdir(tmp_path)
    return tmp_path / "main.bean"


def _tree(books: Path) -> dict[str, bytes]:
    return {str(path.relative_to(books)): path.read_bytes() for path in sorted(books.rglob("*")) if path.is_file()}


def _message(output: str, json_output: bool) -> str:
    if not json_output:
        return output
    error = json.loads(output)["error"]
    assert error["category"] == "usage" and error["exit_code"] == 2
    return str(error["message"])


@pytest.mark.parametrize("operation", ["add", "import"])
@pytest.mark.parametrize("json_output", [False, True])
def test_one_refusal_names_the_include_and_the_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, operation: str, json_output: bool
) -> None:
    root = _books(tmp_path, monkeypatch)
    before = _tree(tmp_path)
    command = [*(["--json"] if json_output else []), "--file", str(root), *(ADD if operation == "add" else IMPORT)]
    command += ["--into", "2024/q2.bean"]

    refused = runner.invoke(app, command)

    assert refused.exit_code == 2, refused.output
    message = _message(refused.output, json_output)
    directory = tmp_path.resolve() / "2024"
    assert f"is not included by {root.resolve()}, and its directory {directory} does not exist." in message
    assert f"A relative --into path is based on {tmp_path.resolve()}, the root ledger's directory." in message
    assert 'add include "2024/q2.bean" to the root (or a glob such as include "2024/*.bean")' in message
    assert message.rstrip().endswith("Nothing was written.")
    assert _tree(tmp_path) == before

    # Following the advice once: the directory, the file and the include line.
    directory.mkdir()
    (directory / "q2.bean").write_text("")
    root.write_text(LEDGER + 'include "2024/q2.bean"\n')

    written = runner.invoke(app, command)

    assert written.exit_code == 0, written.output
    assert '"Lunch"' in (directory / "q2.bean").read_text()


def test_the_glob_alternative_lets_bea_create_the_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = _books(tmp_path, monkeypatch)
    command = ["--file", str(root), *ADD, "--into", "2024/q2.bean"]
    assert runner.invoke(app, command).exit_code == 2

    (tmp_path / "2024").mkdir()
    root.write_text(LEDGER + 'include "2024/*.bean"\n')

    written = runner.invoke(app, command)

    assert written.exit_code == 0, written.output
    assert '"Lunch"' in (tmp_path / "2024" / "q2.bean").read_text()


def test_an_existing_unincluded_file_is_not_told_to_be_created(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = _books(tmp_path, monkeypatch)
    (tmp_path / "2024").mkdir()
    (tmp_path / "2024" / "q2.bean").write_text("")
    before = _tree(tmp_path)

    refused = runner.invoke(app, ["--file", str(root), *ADD, "--into", "2024/q2.bean"])

    assert refused.exit_code == 2, refused.output
    assert 'Add include "2024/q2.bean" to the root' in refused.output
    assert "Create it" not in refused.output and "does not exist" not in refused.output
    assert refused.output.rstrip().endswith("Nothing was written.")
    assert _tree(tmp_path) == before


def test_a_directory_is_not_offered_as_an_include(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = _books(tmp_path, monkeypatch)
    (tmp_path / "2024").mkdir()

    refused = runner.invoke(app, ["--file", str(root), *ADD, "--into", "2024"])

    assert refused.exit_code == 2, refused.output
    assert f"{tmp_path.resolve() / '2024'} is a directory, not a file." in refused.output
    assert "include" not in refused.output.replace("the root includes", "")


def test_a_glob_that_covers_the_file_names_only_the_missing_directory(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = _books(tmp_path, monkeypatch, LEDGER + 'include "2024/*.bean"\n')
    before = _tree(tmp_path)
    command = ["--file", str(root), *ADD, "--into", "2024/q2.bean"]

    refused = runner.invoke(app, command)

    assert refused.exit_code == 2, refused.output
    assert "Create it first; bea creates only the file. Nothing was written." in refused.output
    assert "not included" not in refused.output
    assert _tree(tmp_path) == before

    (tmp_path / "2024").mkdir()
    written = runner.invoke(app, command)

    assert written.exit_code == 0, written.output
    assert '"Lunch"' in (tmp_path / "2024" / "q2.bean").read_text()
