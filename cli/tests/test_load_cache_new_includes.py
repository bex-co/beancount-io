"""Beancount's pickle cache must not hide files that newly join the include closure (w1/083).

Upstream keys the cache on the mtime and size of the files the cached load
read. A file that newly matches an include glob, or a missing include that
now exists, is not among them, so a warm cache kept serving the old ledger:
reads missed the file and `bea import` re-wrote entries it should have
skipped as exact duplicates. The cache threshold is dropped to zero so a tiny
fixture caches the way a large ledger does.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest

from bea_engine import managed_load
from bea_engine.ledger.write import pickle_cache_of

TXN = '{date} * "{name}"\n  Expenses:Food  1 USD\n  Assets:Bank\n'
OPENS = "2000-01-01 open Assets:Bank USD\n2000-01-01 open Expenses:Food USD\n"


@pytest.fixture(autouse=True)
def _always_cache(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    from beancount import loader

    monkeypatch.delenv("BEANCOUNT_DISABLE_LOAD_CACHE", raising=False)
    monkeypatch.delenv("BEANCOUNT_LOAD_CACHE_FILENAME", raising=False)
    # `initialize` binds the threshold when it builds the cached loader, so the
    # constant alone would leave the test proving nothing.
    monkeypatch.setattr(loader, "PICKLE_CACHE_THRESHOLD", 0.0)
    loader.initialize(use_cache=True)
    try:
        yield
    finally:
        monkeypatch.undo()
        loader.initialize(os.getenv("BEANCOUNT_DISABLE_LOAD_CACHE") is None)


def _narrations(root: Path) -> list[str]:
    entries, _errors, _options = managed_load.load_file(root)
    return sorted(getattr(entry, "narration", "") for entry in entries if hasattr(entry, "narration"))


def test_a_file_newly_matching_a_glob_is_read_despite_a_warm_cache(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS + 'include "txns/*.bean"\n', encoding="utf-8")
    (tmp_path / "txns").mkdir()
    (tmp_path / "txns" / "old.bean").write_text(TXN.format(date="2021-01-01", name="old"), encoding="utf-8")

    assert _narrations(root) == ["old"]
    assert pickle_cache_of(root).exists(), "the warm cache is the precondition"

    (tmp_path / "txns" / "jan.bean").write_text(TXN.format(date="2021-01-02", name="fresh"), encoding="utf-8")

    assert _narrations(root) == ["fresh", "old"]


def test_a_glob_that_matched_nothing_when_cached_is_read_once_it_matches(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS + 'include "txns/*.bean"\n', encoding="utf-8")
    (tmp_path / "txns").mkdir()
    _entries, errors, _options = managed_load.load_file(root)
    assert any("does not match any files" in error.message for error in errors)

    (tmp_path / "txns" / "jan.bean").write_text(TXN.format(date="2021-01-02", name="fresh"), encoding="utf-8")

    _entries, errors, _options = managed_load.load_file(root)
    assert errors == []
    assert _narrations(root) == ["fresh"]


def test_a_missing_include_is_read_once_it_is_created(tmp_path: Path) -> None:
    root = tmp_path / "main.bean"
    root.write_text(OPENS + 'include "later.bean"\n', encoding="utf-8")
    managed_load.load_file(root)
    assert pickle_cache_of(root).exists()

    (tmp_path / "later.bean").write_text(TXN.format(date="2021-01-02", name="later"), encoding="utf-8")

    _entries, errors, _options = managed_load.load_file(root)
    assert errors == []
    assert _narrations(root) == ["later"]


def test_an_unchanged_closure_still_hits_the_cache(tmp_path: Path) -> None:
    """The control: large ledgers depend on the cache, so a clean hit must stay a hit."""
    root = tmp_path / "main.bean"
    root.write_text(OPENS + 'include "txns/*.bean"\n', encoding="utf-8")
    (tmp_path / "txns").mkdir()
    (tmp_path / "txns" / "old.bean").write_text(TXN.format(date="2021-01-01", name="old"), encoding="utf-8")
    managed_load.load_file(root)
    cache = pickle_cache_of(root)
    before = cache.stat().st_mtime_ns
    os.utime(cache, ns=(before - 10**9, before - 10**9))
    aged = cache.stat().st_mtime_ns

    assert _narrations(root) == ["old"]
    assert cache.stat().st_mtime_ns == aged, "a hit must not rewrite the cache"
