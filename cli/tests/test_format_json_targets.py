"""Formatter targets preserve individual paths in machine-readable output."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_format_preserves_strings import _bea


@pytest.mark.parametrize("mode", ["--check", "--dry-run", "--in-place"])
@pytest.mark.parametrize("selection", ["include", "named"])
def test_multi_file_target_is_an_array(tmp_path: Path, mode: str, selection: str) -> None:
    root = tmp_path / "main.bean"
    child = tmp_path / "sub" / "a, b.bean"
    child.parent.mkdir()
    child.write_text('2024-02-01 note Assets:Bank "hi"\n')
    root.write_text('include "sub/a, b.bean"\n2024-01-01 open Assets:Bank USD\n')
    originals = {path: path.read_bytes() for path in (root, child)}
    paths = [str(root)] if selection == "include" else [str(child), str(root), str(child)]

    result = _bea(tmp_path, "--json", "format", mode, *paths)

    assert result.returncode == 0, result.stderr
    envelope = json.loads(result.stdout)
    assert envelope["target"] == {"files": sorted(str(path) for path in originals)}
    assert envelope["data"]["scanned"] == 2
    assert {path: path.read_bytes() for path in originals} == originals


@pytest.mark.parametrize("selection", ["file", "directory", "stdin"])
def test_other_target_shapes_stay_explicit(tmp_path: Path, selection: str) -> None:
    root = tmp_path / "main.bean"
    root.write_text("2024-01-01 open Assets:Bank USD\n")
    if selection == "stdin":
        result = _bea(tmp_path, "--json", "format", "-o", str(tmp_path / "out.bean"), stdin=root.read_bytes())
        expected = {"stdin": "-"}
    else:
        path = root if selection == "file" else tmp_path
        result = _bea(tmp_path, "--json", "format", "--check", str(path))
        expected = {selection: str(path)}

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["target"] == expected
