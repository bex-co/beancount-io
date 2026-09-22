"""A generated feed never overwrites a copied local file (w3/413).

`export_portable` built two destination maps independently: copied files kept
their paths under the root, and each managed feed went to
`prices/<alias>.beancount`. A ledger that legitimately keeps its own
`prices/BTC-USD.beancount` beside a managed `BTC-USD` feed therefore had the
copy overwritten by the generated file — the manual price vanished, the
snapshot included one file twice, and `list price` on it returned nothing with
a `Duplicate filename parsed` warning. Exit 0 throughout.

Feed destinations are now allocated against the copied files. The copies keep
their relative paths, since that is what makes the export portable, so the
generated file is the one that moves — deterministically, so re-exporting the
same tree produces the same names.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from bea_engine.managed_load import _free_feed_path

ROOT = Path(__file__).resolve().parents[1]

MANAGED_URL = "https://beancount.io/prices/BTC-USD"
LOCAL_PRICE = "2026-01-02 price BTC 100 USD\n"


def _ledger_text(local_name: str) -> str:
    return (
        'option "operating_currency" "USD"\n'
        f'include "prices/{local_name}"\n'
        f'include "{MANAGED_URL}"\n'
        "2026-01-01 open Assets:Crypto BTC\n"
        "2026-01-01 open Equity:Opening BTC\n"
        '2026-01-02 * "Holding"\n'
        "  Assets:Crypto 1 BTC\n"
        "  Equity:Opening\n"
    )


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _books(tmp_path: Path, local_name: str) -> Path:
    root = tmp_path / "books"
    (root / "prices").mkdir(parents=True)
    (root / "main.bean").write_text(_ledger_text(local_name), encoding="utf-8")
    (root / "prices" / local_name).write_text(LOCAL_PRICE, encoding="utf-8")
    return root / "main.bean"


def _export(tmp_path: Path, ledger: Path, destination: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return _bea(
        tmp_path,
        "--json",
        "--offline",
        "--file",
        str(ledger),
        "price",
        "export",
        "--output",
        str(destination),
        *extra,
    )


def _prices(tmp_path: Path, ledger: Path) -> list[tuple[str, str]]:
    done = _bea(tmp_path, "--json", "--offline", "--file", str(ledger), "list", "price", "--allow-errors")
    assert done.returncode == 0, done.stderr
    return [(row["currency"], row["amount"]["number"]) for row in json.loads(done.stdout)["data"]]


class TestFeedPathAllocation:
    def test_the_plain_name_is_used_when_it_is_free(self) -> None:
        assert _free_feed_path(Path("/x/prices"), "BTC-USD", set()) == Path("/x/prices/BTC-USD.beancount")

    def test_a_taken_name_steps_aside_deterministically(self) -> None:
        taken = {Path("/x/prices/BTC-USD.beancount")}

        first = _free_feed_path(Path("/x/prices"), "BTC-USD", taken)

        assert first == Path("/x/prices/BTC-USD-managed.beancount")
        assert _free_feed_path(Path("/x/prices"), "BTC-USD", taken) == first, "same inputs, same answer"

    def test_it_keeps_stepping_while_names_are_taken(self) -> None:
        taken = {
            Path("/x/prices/BTC-USD.beancount"),
            Path("/x/prices/BTC-USD-managed.beancount"),
        }

        assert _free_feed_path(Path("/x/prices"), "BTC-USD", taken) == Path("/x/prices/BTC-USD-managed-2.beancount")


def test_a_colliding_local_price_survives_the_export(tmp_path: Path) -> None:
    ledger = _books(tmp_path, "BTC-USD.beancount")
    destination = tmp_path / "snapshot"

    done = _export(tmp_path, ledger, destination, "--allow-errors")

    assert done.returncode == 0, done.stderr
    assert (destination / "prices" / "BTC-USD.beancount").read_text(encoding="utf-8") == LOCAL_PRICE
    assert _prices(tmp_path, destination / "main.bean") == [("BTC", "100")]


def test_the_two_includes_point_at_different_files(tmp_path: Path) -> None:
    ledger = _books(tmp_path, "BTC-USD.beancount")
    destination = tmp_path / "snapshot"

    _export(tmp_path, ledger, destination, "--allow-errors")

    includes = [
        line for line in (destination / "main.bean").read_text(encoding="utf-8").splitlines() if "include" in line
    ]
    assert len(includes) == 2
    assert len(set(includes)) == 2, includes
    assert 'include "prices/BTC-USD.beancount"' in includes
    assert 'include "prices/BTC-USD-managed.beancount"' in includes


def test_the_reported_files_are_distinct(tmp_path: Path) -> None:
    """The envelope listed the same destination twice."""
    ledger = _books(tmp_path, "BTC-USD.beancount")
    destination = tmp_path / "snapshot"

    done = _export(tmp_path, ledger, destination, "--allow-errors")

    files = json.loads(done.stdout)["data"]["files"]
    assert len(files) == len(set(files)), files


def test_the_snapshot_loads_without_a_duplicate_filename(tmp_path: Path) -> None:
    ledger = _books(tmp_path, "BTC-USD.beancount")
    destination = tmp_path / "snapshot"
    _export(tmp_path, ledger, destination, "--allow-errors")

    listed = _bea(
        tmp_path, "--json", "--offline", "--file", str(destination / "main.bean"), "list", "price", "--allow-errors"
    )
    checked = _bea(tmp_path, "--json", "--offline", "--file", str(destination / "main.bean"), "check")

    assert "Duplicate filename" not in listed.stderr
    assert checked.returncode == 0, checked.stderr
    assert json.loads(checked.stdout)["data"]["valid"] is True


def test_a_non_colliding_name_is_unchanged(tmp_path: Path) -> None:
    """The control: with distinct names the feed keeps its plain destination."""
    ledger = _books(tmp_path, "manual.beancount")
    destination = tmp_path / "snapshot"

    done = _export(tmp_path, ledger, destination, "--allow-errors")

    assert done.returncode == 0, done.stderr
    assert (destination / "prices" / "manual.beancount").read_text(encoding="utf-8") == LOCAL_PRICE
    assert (destination / "prices" / "BTC-USD.beancount").exists(), "no needless suffix"
    assert _prices(tmp_path, destination / "main.bean") == [("BTC", "100")]


def test_an_unavailable_feed_is_still_refused_without_allow_errors(tmp_path: Path) -> None:
    """The documented refusal, and it must happen before anything is written."""
    ledger = _books(tmp_path, "BTC-USD.beancount")
    destination = tmp_path / "snapshot"

    done = _export(tmp_path, ledger, destination)

    assert done.returncode == 2, done.stdout
    assert not destination.exists()
