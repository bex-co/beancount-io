"""Native sources honor the same private default cache policy as other reads."""

from __future__ import annotations

import os
import stat
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal
from tests.report_helpers import bea


@pytest.mark.parametrize("interactive", [False, True])
@pytest.mark.parametrize("uri", [False, True])
def test_slow_native_source_keeps_its_cache_outside_the_ledger(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, interactive: bool, uri: bool
) -> None:
    monkeypatch.delenv("BEANCOUNT_LOAD_CACHE_FILENAME", raising=False)
    monkeypatch.delenv("BEANCOUNT_DISABLE_LOAD_CACHE", raising=False)
    root, plugin = tmp_path / "main.bean", tmp_path / "slow_load.py"
    plugin.write_text(
        "import time\n"
        "__plugins__ = ('delay',)\n"
        "def delay(entries, options):\n"
        "    time.sleep(1.1)\n"  # Beancount caches a load taking at least one second.
        "    return entries, []\n"
    )
    root.write_text(
        'option "insert_pythonpath" "TRUE"\nplugin "slow_load"\n'
        "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening USD\n"
        '2026-01-02 * "Fixture"\n  Assets:Cash 1 USD\n  Equity:Opening -1 USD\n'
    )
    before = {path: path.read_bytes() for path in (root, plugin)}
    source = f"beancount:{root}" if uri else str(root)
    args = ["query", "--source", source]
    query = "SELECT 73 AS n LIMIT 1"
    if interactive:
        with QueryTerminal(tmp_path, args) as shell:
            shell.read("beanquery>")
            shell.send(query)
            assert "\n73\n" in shell.read("beanquery>")
            shell.send(".reload")
            shell.read("beanquery>")
            shell.send(query)
            assert "\n73\n" in shell.read("beanquery>")
            assert shell.finish() == 0
    else:
        result = bea([*args, query], tmp_path)
        assert result.returncode == 0, result.stderr
        assert "73" in result.stdout
    assert {path: path.read_bytes() for path in before} == before
    assert not list(tmp_path.glob("*.picklecache")), "the ledger directory must not receive a load cache"
    private = tmp_path / "cache" / "bea" / "load-cache"
    assert len(list(private.glob("*.picklecache"))) == 1, "the slow load should still be cached"
    if os.name != "nt":
        assert stat.S_IMODE(private.stat().st_mode) & 0o077 == 0
