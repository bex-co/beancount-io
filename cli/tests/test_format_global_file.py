"""Format accepts a global entry file; recursive directory selection is positional."""

from __future__ import annotations

import json
import shlex
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
MISALIGNED = (
    "2024-01-01 open Assets:Cash USD\n"
    "2024-01-01 open Equity:Opening USD\n"
    '2024-01-02 * "Stored ledger"\n'
    "    Assets:Cash 1 USD\n"
    "    Equity:Opening -1 USD\n"
)


def _make_tree(directory: Path) -> Path:
    (directory / "sub").mkdir(parents=True)
    (directory / "main.bean").write_text(MISALIGNED)
    (directory / "sub" / "other.beancount").write_text(MISALIGNED)
    return directory


def _tree(directory: Path) -> dict[str, bytes | None]:
    return {
        str(path.relative_to(directory)): path.read_bytes() if path.is_file() else None for path in directory.rglob("*")
    }


@pytest.mark.parametrize("mode", ["--check", "--dry-run", "-i"])
@pytest.mark.parametrize("as_json", [False, True], ids=["human", "json"])
def test_global_file_directory_is_refused_before_any_formatting(tmp_path: Path, mode: str, as_json: bool) -> None:
    directory = _make_tree(tmp_path / "books tree")
    before = _tree(directory)

    result = runner.invoke(app, [*(["--json"] if as_json else []), "--file", str(directory), "format", mode])

    assert result.exit_code == 2, result.output
    if as_json:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == "usage"
        message = error["message"]
    else:
        message = result.stderr
    assert f"Ledger path '{directory}' (from --file) is a directory; expected a ledger file." in message
    assert shlex.join(["bea", "format", "-i", str(directory)]) in message
    assert _tree(directory) == before


def test_global_file_scans_and_formats_only_the_named_file(tmp_path: Path) -> None:
    directory = _make_tree(tmp_path / "books")
    ledger = directory / "main.bean"
    before = _tree(directory)

    checked = runner.invoke(app, ["--json", "--file", str(ledger), "format", "--check"])

    assert checked.exit_code == 1, checked.output
    data = json.loads(checked.stderr)["error"]["result"]
    assert data["scanned"] == 1
    assert data["formatted"] == [str(ledger)]
    assert _tree(directory) == before

    applied = runner.invoke(app, ["--json", "--file", str(ledger), "format", "-i"])

    assert applied.exit_code == 0, applied.output
    assert json.loads(applied.stdout)["data"]["formatted"] == [str(ledger)]
    assert ledger.read_text() != MISALIGNED
    assert _tree(directory) == {**before, "main.bean": ledger.read_bytes()}
    again = runner.invoke(app, ["--file", str(ledger), "format", "--check"])
    assert again.exit_code == 0, again.output


@pytest.mark.parametrize("selection", ["file", "directory"])
def test_positional_target_wins_over_a_directory_in_global_file(tmp_path: Path, selection: str) -> None:
    unused = _make_tree(tmp_path / "global")
    selected = _make_tree(tmp_path / "selected")
    before_unused = _tree(unused)
    before_selected = _tree(selected)
    target = selected / "main.bean" if selection == "file" else selected
    expected = [str(selected / "main.bean")]
    if selection == "directory":
        expected.append(str(selected / "sub" / "other.beancount"))

    result = runner.invoke(app, ["--json", "--file", str(unused), "format", "-i", str(target)])

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["scanned"] == len(expected)
    assert data["formatted"] == expected
    assert _tree(unused) == before_unused
    for filename in expected:
        assert Path(filename).read_text() != MISALIGNED
        before_selected[str(Path(filename).relative_to(selected))] = Path(filename).read_bytes()
    assert _tree(selected) == before_selected


@pytest.mark.parametrize("set_environment_file", [False, True], ids=["cwd-only", "environment-and-cwd"])
def test_bare_format_check_ignores_environment_and_cwd_discovery(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, set_environment_file: bool
) -> None:
    directory = _make_tree(tmp_path / "cwd")
    elsewhere = _make_tree(tmp_path / "environment")
    monkeypatch.chdir(directory)
    if set_environment_file:
        monkeypatch.setenv("BEA_FILE", str(elsewhere / "main.bean"))
    before = _tree(tmp_path)

    result = runner.invoke(app, ["--json", "format", "--check"])

    assert result.exit_code == 2, result.output
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "Name the files to format: reading stdin has nothing to compare or rewrite." in error["message"]
    assert _tree(tmp_path) == before


@pytest.mark.parametrize("explicit_stdin", [False, True], ids=["bare-stdin", "stdin-over-global-directory"])
def test_stdin_still_formats_without_selecting_a_discoverable_ledger(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, explicit_stdin: bool
) -> None:
    directory = _make_tree(tmp_path / "cwd")
    monkeypatch.chdir(directory)
    monkeypatch.setenv("BEA_FILE", str(directory / "main.bean"))
    before = _tree(directory)
    text = '2024-01-02 * "From stdin"\n Assets:Cash 1 USD\n Equity:Opening -1 USD\n'
    expected = '2024-01-02 * "From stdin"\n  Assets:Cash      1 USD\n  Equity:Opening  -1 USD\n'
    args = ["--file", str(directory), "format", "-"] if explicit_stdin else ["format"]

    result = runner.invoke(app, args, input=text)

    assert result.exit_code == 0, result.output
    assert result.stdout == expected
    assert _tree(directory) == before
