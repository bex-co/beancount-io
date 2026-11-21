"""The engine's load-cache helpers match their frontend twins.

A mistyped ``BEANCOUNT_LOAD_CACHE_FILENAME`` deletes the ledger it names, so
both sides refuse a cache path that is one of the ledger's own files, through
symlinks and hard links alike, and both describe a non-cache file in the same
words. The two execution environments cannot import each other; this pins that
the copies agree.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from bea_engine.ledger import write as engine_write
from bea_engine.query import same_file as engine_same_file
from cli import output as frontend_output


def test_the_shared_cache_variable_stays_one_spelling() -> None:
    # The two copies cannot import each other (ADR014), so pin them equal: a
    # rename on one side must land on the other, or the loader and the guard
    # read different environment variables.
    assert engine_write.CACHE_ENV == frontend_output.CACHE_ENV
    assert engine_write.CACHE_ENV == "BEANCOUNT_LOAD_CACHE_FILENAME"


def test_the_twins_agree_whether_paths_name_one_file(tmp_path: Path) -> None:
    first = tmp_path / "first.bean"
    first.write_text("; synthetic ledger\n")
    second = tmp_path / "second.bean"
    second.write_text("; another ledger\n")
    cases = [
        (first, first, True),
        (first, tmp_path / "first.bean", True),
        (first, second, False),
        (first, tmp_path / "missing.bean", False),
    ]
    try:
        linked = tmp_path / "linked.bean"
        os.link(first, linked)
    except OSError:
        pytest.skip("hard links unavailable")
    cases.append((first, linked, True))
    try:
        alias = tmp_path / "alias.bean"
        alias.symlink_to(first)
    except OSError:
        pytest.skip("symlinks unavailable")
    cases.append((first, alias, True))
    for left, right in [(c[0], c[1]) for c in cases]:
        assert engine_same_file(left, right) == frontend_output.same_file(left, right)
    assert {engine_same_file(left, right) for left, right, _ in cases} == {True, False}
    assert {frontend_output.same_file(left, right) for left, right, _ in cases} == {True, False}


def test_the_twins_agree_whether_a_path_is_a_load_cache(tmp_path: Path) -> None:
    note = tmp_path / "note.txt"
    note.write_text("not a cache\n")
    cache = tmp_path / "ledger.picklecache"
    cache.write_bytes(b"\x80")
    missing = tmp_path / "missing.picklecache"
    stale = tmp_path / "stale-dir"
    stale.mkdir()
    for path in (missing, note, cache, stale):
        assert engine_write.not_a_load_cache(path) == frontend_output.not_a_load_cache(path), path
    assert engine_write.not_a_load_cache(missing) is None
    assert engine_write.not_a_load_cache(cache) is None
    assert frontend_output.not_a_load_cache(note) is not None
    assert frontend_output.not_a_load_cache(stale) is not None
