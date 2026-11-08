"""Explicit update selection recovers bounded discovery without narrowing validation (w5/1125)."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import pytest

from tests.report_helpers import bea

HEAD = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Other USD
"""
ENTRY = """\
2026-01-02 * "Original"
  ref: "Q1"
  Expenses:Food 10.00 USD
  Assets:Cash -10.00 USD
"""


def _args(path: Path, batch: bool, rows: list[dict[str, str]] | None = None) -> list[str]:
    rows = rows or [{"id": "Q1", "narration": "Reviewed"}]
    if batch:
        mapping = path / "changes.json"
        mapping.write_text(json.dumps(rows))
        return ["update", "transactions", "--from", str(mapping)]
    return ["update", "transaction", *[flag for key, value in rows[0].items() for flag in ("--" + key, value)]]


def _run(cwd: Path, root: Path, args: list[str], *options: str) -> Any:
    return bea(["--json", "--no-input", "--offline", "--file", str(root), *args, *options], cwd)


@pytest.mark.parametrize("batch", [False, True])
@pytest.mark.parametrize("noise", [0, 8300])
def test_explicit_update_selection_recovers_incomplete_discovery(tmp_path: Path, batch: bool, noise: int) -> None:
    subprocess.run(["git", "init", "--quiet", str(tmp_path)], check=True, capture_output=True)
    root = tmp_path / "main.bean"
    original = HEAD + ENTRY
    root.write_text(original)
    for index in range(noise):
        (tmp_path / f"noise-{index:05}.txt").touch()
    args = _args(tmp_path, batch)
    for apply in ([], ["--apply"]):
        automatic = _run(tmp_path, root, args, *apply)
        if noise:
            assert automatic.returncode == 2, automatic.stdout + automatic.stderr
            error = json.loads(automatic.stderr)["error"]
            message = error["message"] + " " + " ".join(error.get("details", []))
            assert "8192-operation" in message and "incomplete" in message
            assert f"update {'transactions' if batch else 'transaction'}" in message
            assert ("--from" if batch else "--id") in message
            assert "--into" in message
            assert root.read_text() == original
        else:
            assert automatic.returncode == 0, automatic.stderr
            assert json.loads(automatic.stdout)["data"]["written"] == int(bool(apply))
            assert root.read_text() == (original.replace('"Original"', '"Reviewed"') if apply else original)
            root.write_text(original)
    for apply in ([], ["--apply"]):
        selected = _run(tmp_path, root, args, "--into", root.name, *apply)
        assert selected.returncode == 0, selected.stderr
        data = json.loads(selected.stdout)["data"]
        assert data["written"] == int(bool(apply))
        assert '-2026-01-02 * "Original"' in data["diff"] and '+2026-01-02 * "Reviewed"' in data["diff"]
        assert root.read_text() == (original.replace('"Original"', '"Reviewed"') if apply else original)
    assert _run(tmp_path, root, ["check"]).returncode == 0
    assert all((tmp_path / f"noise-{index:05}.txt").stat().st_size == 0 for index in range(noise))
    if noise and not batch:
        control = _run(
            tmp_path,
            root,
            ["add", "note", "--date", "2026-01-03", "--account", "Assets:Cash", "--comment", "Control"],
            "--into",
            root.name,
        )
        assert control.returncode == 0, control.stderr
        assert 'ref: "Q1"' in root.read_text() and '"Reviewed"' in root.read_text()


@pytest.mark.parametrize("batch", [False, True])
@pytest.mark.parametrize("selection", ["other", "outside", "noop"])
def test_update_selection_constrains_existing_targets_even_for_noops(
    tmp_path: Path, batch: bool, selection: str
) -> None:
    root, leaf, other = (tmp_path / name for name in ("main.bean", "leaf.bean", "other.bean"))
    root.write_text(HEAD + 'include "leaf.bean"\ninclude "other.bean"\n')
    leaf.write_text(ENTRY)
    other.write_text(ENTRY.replace('"Q1"', '"Q2"'))
    outside = tmp_path / "outside.bean"
    outside.write_text("; not in the selected ledger\n")
    before = {path: path.read_bytes() for path in (root, leaf, other, outside)}
    rows = [{"id": "Q1", "narration": "Original" if selection == "noop" else "Reviewed"}]
    if batch and selection == "other":
        rows.append({"id": "Q2", "narration": "Allowed"})
    args = _args(tmp_path, batch, rows)
    into = outside.name if selection == "outside" else other.name
    for apply in ([], ["--apply"]):
        run = _run(tmp_path, root, args, "--into", into, *apply)
        if batch:
            assert run.returncode == (1 if apply else 0), run.stdout + run.stderr
            payload = json.loads(run.stderr)["error"]["result"] if apply else json.loads(run.stdout)["data"]
            assert payload["rows"][0]["status"] == "rejected"
            message = payload["rows"][0]["reason"]
            assert payload["written"] == (1 if apply and selection == "other" else 0)
        else:
            assert run.returncode == 2, run.stdout + run.stderr
            message = json.loads(run.stderr)["error"]["message"]
        assert "--into" in message and "leaf.bean" in message and into in message
        for path, content in before.items():
            expected = (
                content.replace(b'"Original"', b'"Allowed"')
                if apply and batch and selection == "other" and path == other
                else content
            )
            assert path.read_bytes() == expected


@pytest.mark.parametrize("batch", [False, True])
def test_update_selection_does_not_disambiguate_duplicate_ids(tmp_path: Path, batch: bool) -> None:
    root = tmp_path / "main.bean"
    root.write_text(HEAD + 'include "a.bean"\ninclude "b.bean"\n')
    members = [tmp_path / "a.bean", tmp_path / "b.bean"]
    for member in members:
        member.write_text(ENTRY)
    before = {path: path.read_bytes() for path in (root, *members)}
    run = _run(tmp_path, root, _args(tmp_path, batch), "--into", "a.bean", "--apply")
    assert run.returncode == (1 if batch else 2), run.stdout + run.stderr
    error = json.loads(run.stderr)["error"]
    message = error["result"]["rows"][0]["reason"] if batch else error["message"]
    assert "matches 2 transactions" in message and "a.bean" in message and "b.bean" in message
    assert {path: path.read_bytes() for path in before} == before


@pytest.mark.parametrize("batch", [False, True])
def test_explicit_update_validates_root_assertions_outside_its_target(tmp_path: Path, batch: bool) -> None:
    root, leaf = tmp_path / "main.bean", tmp_path / "leaf.bean"
    leaf.write_text(HEAD + ENTRY)
    root.write_text('include "leaf.bean"\n2026-01-03 balance Expenses:Food 10.00 USD\n')
    assert _run(tmp_path, leaf, ["check"]).returncode == 0
    assert _run(tmp_path, root, ["check"]).returncode == 0
    before = {path: path.read_bytes() for path in (root, leaf)}
    args = _args(tmp_path, batch, [{"id": "Q1", "account": "Expenses:Food=Expenses:Other"}])
    run = _run(tmp_path, root, args, "--into", leaf.name, "--apply")
    assert run.returncode == 1, run.stdout + run.stderr
    assert "balance" in run.stderr.casefold()
    assert {path: path.read_bytes() for path in before} == before


@pytest.mark.parametrize("batch", [False, True])
def test_automatically_inferred_leaf_is_not_an_explicit_update_constraint(tmp_path: Path, batch: bool) -> None:
    (tmp_path / ".git").mkdir()
    root, leaf, other = (tmp_path / name for name in ("main.bean", "leaf.bean", "other.bean"))
    root.write_text(HEAD + 'include "leaf.bean"\ninclude "other.bean"\n')
    leaf.write_text(ENTRY)
    other.write_text(ENTRY.replace('"Q1"', '"Q2"'))
    before = {path: path.read_bytes() for path in (root, leaf, other)}
    run = _run(tmp_path, leaf, _args(tmp_path, batch, [{"id": "Q2", "narration": "Reviewed"}]), "--apply")
    assert run.returncode == 0, run.stderr
    assert json.loads(run.stdout)["data"]["written"] == 1
    assert root.read_bytes() == before[root] and leaf.read_bytes() == before[leaf]
    assert other.read_bytes() == before[other].replace(b'"Original"', b'"Reviewed"')


@pytest.mark.parametrize("batch", [False, True])
def test_update_selection_resolves_aliases_beside_root_not_cwd(tmp_path: Path, batch: bool) -> None:
    books = tmp_path / "books"
    books.mkdir()
    root, leaf, alias = (books / name for name in ("main.bean", "leaf.bean", "alias.bean"))
    root.write_text(HEAD + 'include "leaf.bean"\n')
    leaf.write_text(ENTRY)
    try:
        alias.symlink_to(leaf.name)
    except OSError:
        pytest.skip("filesystem cannot create a symlink")
    decoy = tmp_path / alias.name
    decoy.write_text("; cwd is not the root directory\n")
    before = root.read_bytes()
    run = _run(tmp_path, root, _args(tmp_path, batch), "--into", alias.name, "--apply")
    assert run.returncode == 0, run.stderr
    assert root.read_bytes() == before
    assert leaf.read_text() == ENTRY.replace('"Original"', '"Reviewed"')
    assert alias.read_bytes() == leaf.read_bytes() and decoy.read_text() == "; cwd is not the root directory\n"
