"""A staged write leaves no pickle-cache sidecar beside the ledger (w3/390).

`bea` stages a write in `.bea-XXXXXXXX.tmp` beside the ledger and loads that
file to validate it. A load slow enough to cross Beancount's one-second
threshold writes a pickle cache next to the file it loaded — and the staged
file is then renamed away, orphaning a full-size copy of the ledger in the
user's own books directory.

Both cleanups rebuilt the sidecar name by hand and both dropped the dot that
`PICKLE_CACHE_FILENAME` *prepends*:

    staged      .bea-acdn4plk.tmp
    beancount  ..bea-acdn4plk.tmp.picklecache   <- two dots
    unlinked    .bea-acdn4plk.tmp.picklecache   <- one dot, never existed
    swept by    .bea-*                          <- cannot match "..bea-*"

So an ordinary successful `add` leaked one full-size file per invocation. The
name test below is the cheap one that would have caught this; the end-to-end
test forces Beancount to cache by dropping its threshold, so a real leak is
proven without needing a multi-second fixture.

The ledger's *own* cache (`.main.bean.picklecache`, one dot) is legitimate and
makes large ledgers usable. Deleting every `*.picklecache` would have "fixed"
the leak by throwing that away, so it is pinned here as a control.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

from bea_engine.ledger.write import candidate_file, pickle_cache_of, sweep_abandoned_candidates

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2019-12-31 open Assets:Cash USD
2019-12-31 open Expenses:Food USD
2019-12-31 open Equity:Opening USD
2019-12-31 * "seed"
  Assets:Cash   10000.00 USD
  Equity:Opening
"""

ENTRY = '\n2026-01-01 * "single"\n  Expenses:Food   1.00 USD\n  Assets:Cash\n'


def test_the_sidecar_name_is_beancounts_own(tmp_path: Path) -> None:
    """The one-line check that would have caught this without a slow fixture."""
    from beancount.loader import PICKLE_CACHE_FILENAME

    candidate = tmp_path / ".bea-acdn4plk.tmp"

    computed = pickle_cache_of(candidate)

    assert computed.name == PICKLE_CACHE_FILENAME.format(filename=candidate.name)
    assert computed.name == "..bea-acdn4plk.tmp.picklecache", "the prepended dot is the whole bug"
    assert computed != Path(str(candidate) + ".picklecache"), "the old, never-matching spelling"
    assert computed.parent == candidate.parent


def test_candidate_file_removes_the_sidecar_it_leaves_behind(tmp_path: Path) -> None:
    """`candidate_file` cleans up on the way out, whatever the caller did."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")

    with candidate_file(ledger, LEDGER + ENTRY) as candidate:
        sidecar = pickle_cache_of(candidate)
        sidecar.write_bytes(b"pretend pickle")  # what a slow load would write
        assert sidecar.exists()

    assert not sidecar.exists(), "the staged file's cache is garbage once it is renamed away"
    assert sorted(p.name for p in tmp_path.iterdir()) == ["main.bean"]


def test_the_sweep_reclaims_previously_abandoned_sidecars(tmp_path: Path) -> None:
    """Orphans already on disk from before the fix must be collectable."""
    old = 1.0  # Comfortably older than the sweep's one-hour cutoff.
    orphans = [tmp_path / "..bea-acdn4plk.tmp.picklecache", tmp_path / ".bea-acdn4plk.tmp"]
    for path in orphans:
        path.write_bytes(b"x")
        os.utime(path, (old, old))
    keep = tmp_path / "main.bean"
    keep.write_text(LEDGER, encoding="utf-8")

    sweep_abandoned_candidates(tmp_path)

    for path in orphans:
        assert not path.exists(), f"{path.name} should have been reclaimed"
    assert keep.exists()


def test_the_sweep_leaves_the_ledgers_own_cache_alone(tmp_path: Path) -> None:
    """The control: a real ledger cache is what makes a large ledger usable."""
    old = 1.0
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    real_cache = tmp_path / ".main.bean.picklecache"
    real_cache.write_bytes(b"a legitimate, working cache")
    os.utime(real_cache, (old, old))

    sweep_abandoned_candidates(tmp_path)

    assert real_cache.exists(), "sweeping every *.picklecache would gut the ledgers that need one"


def test_the_sweep_spares_a_candidate_a_live_write_may_still_own(tmp_path: Path) -> None:
    """Freshness is what makes the sweep safe beside a concurrent `bea`."""
    fresh = tmp_path / "..bea-live.tmp.picklecache"
    fresh.write_bytes(b"x")

    sweep_abandoned_candidates(tmp_path)

    assert fresh.exists()


@pytest.mark.parametrize("apply_write", [True, False], ids=["apply", "validate-only"])
def test_a_real_load_leaves_nothing_behind(tmp_path: Path, apply_write: bool) -> None:
    """End to end, with Beancount's cache threshold dropped so any load caches.

    A preview leaks too — the command writes nothing and says so — so the
    validate-only path is exercised alongside the applied one.
    """
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")

    driver = tmp_path / "driver.py"
    driver.write_text(
        textwrap.dedent(f"""
            import json
            from pathlib import Path
            import beancount.loader as loader

            # Any load now writes a cache, which is what a large ledger does
            # naturally and what makes the orphan appear. `initialize` reads
            # the threshold at call time and rebinds the cached loader, so the
            # constant alone is not enough — patching it without this is how a
            # test here can look green while proving nothing.
            loader.PICKLE_CACHE_THRESHOLD = 0.0
            loader.initialize(use_cache=True)

            from bea_engine.ledger import write

            ledger = Path({str(ledger)!r})
            if {apply_write!r}:
                write.append(ledger, [{ENTRY!r}])
            else:
                write.validate_append(ledger, [{ENTRY!r}])
            print(json.dumps(sorted(p.name for p in ledger.parent.iterdir())))
        """).lstrip(),
        encoding="utf-8",
    )

    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(PYTHONPATH=str(ROOT / "src"))
    done = subprocess.run(
        [sys.executable, str(driver)], env=env, cwd=tmp_path, capture_output=True, text=True, timeout=180
    )
    assert done.returncode == 0, done.stderr

    left = json.loads(done.stdout)
    orphans = [name for name in left if name.startswith("..bea-")]
    assert orphans == [], f"a staged write left {orphans} beside the ledger"
    assert "main.bean" in left
    if apply_write:
        assert "single" in ledger.read_text(encoding="utf-8"), "the write itself must still land"
