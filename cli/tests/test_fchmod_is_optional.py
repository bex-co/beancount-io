"""Writing an export or the ask history does not need ``os.fchmod``.

Windows has no ``os.fchmod``: ``bea price export`` failed there with
``AttributeError: module 'os' has no attribute 'fchmod'`` on the installed-artifact
CI matrix, after the earlier Windows failures were fixed. These tests delete it
from ``os`` and check both writers still give the file its mode by name.
"""

from __future__ import annotations

import os
import stat
from contextlib import ExitStack
from pathlib import Path

import pytest

from bea_engine.managed_load import _stage_export


def _mode(path: Path) -> int:
    return stat.S_IMODE(path.stat().st_mode)


def test_export_staging_gives_the_staged_copy_its_mode_without_fchmod(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.delattr(os, "fchmod")
    with ExitStack() as copies:
        staged, final = _stage_export(tmp_path / "out" / "main.bean", b"; ledger\n", 0o640, [], copies)
        assert staged.read_bytes() == b"; ledger\n"
        assert _mode(staged) == 0o640
        assert final == tmp_path / "out" / "main.bean"


def test_export_staging_still_uses_fchmod_where_it_exists(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[int] = []
    real = os.fchmod
    monkeypatch.setattr(os, "fchmod", lambda fd, mode: (calls.append(mode), real(fd, mode))[1])
    with ExitStack() as copies:
        staged, _ = _stage_export(tmp_path / "out" / "main.bean", b"x\n", 0o600, [], copies)
        assert calls == [0o600]
        assert _mode(staged) == 0o600


def test_ask_history_file_is_owner_only_without_fchmod(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from cli.ask import repl

    history = tmp_path / "config" / "history"
    monkeypatch.setattr(repl, "history_path", lambda: history)
    monkeypatch.delenv("BEA_NO_ASK_HISTORY", raising=False)
    monkeypatch.delattr(os, "fchmod")
    repl._history()
    assert history.is_file()
    assert _mode(history) == 0o600
