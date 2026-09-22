"""Generated import ids keep exact amounts and commodities apart (w3/m45).

`_hash_base` rendered a single source amount with `.2f` and dropped its
commodity, so `-0.001 ETH` and `-0.002 ETH` shared a base, as did `-1 ETH` and
`-1 BTC`. Occurrence suffixes are assigned in input order to that shared base,
so reversing the rows of an export swapped which row owned which id — and the
exact-id branch then correctly saw different data under a reused id and refused
the whole replay with exit 4. The identity generation was wrong, not the
conflict guard.

The id now carries the exact amount with its commodity, normalized so the
spellings of one value agree. That changes every generated id, so every older
spelling is offered as a lookup-only key — and an older *amount* key is
content-checked before it counts, because that form was lossy enough to give
two different rows one digest.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.importing import _exact_amount

ROOT = Path(__file__).resolve().parents[1]

LEDGER = "2026-01-01 open Assets:Cash\n2026-01-01 open Expenses:Food\n"
HEADER = "Date,Amount,Currency,Description\n"
MAPPING = "date=Date,amount=Amount,currency=Currency,narration=Description"


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


def _import(tmp_path: Path, ledger: Path, source: Path, *extra: str) -> tuple[int, dict]:
    done = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        MAPPING,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        *extra,
        "--apply",
    )
    if done.returncode == 0:
        return 0, json.loads(done.stdout)["data"]
    return done.returncode, json.loads(done.stderr)["error"]["result"]


def _counts(payload: dict) -> dict[str, int]:
    return {key: payload[key] for key in ("written", "duplicates", "conflicts")}


def _books(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    return ledger


def _csv(tmp_path: Path, name: str, rows: list[str]) -> Path:
    path = tmp_path / name
    path.write_text(HEADER + "".join(rows), encoding="utf-8")
    return path


class TestExactAmount:
    """The rendering alone: this is the published identity format."""

    @pytest.mark.parametrize(
        ("number", "currency", "rendered"),
        [
            pytest.param("-54.20", "USD", "-54.2 USD", id="trailing-zero-stripped"),
            pytest.param("-54.2", "USD", "-54.2 USD", id="already-minimal"),
            pytest.param("-54.200", "USD", "-54.2 USD", id="more-trailing-zeros"),
            pytest.param("-0.001", "ETH", "-0.001 ETH", id="sub-cent-kept"),
            pytest.param("-0.002", "ETH", "-0.002 ETH", id="other-sub-cent"),
            pytest.param("100", "USD", "100 USD", id="never-scientific-notation"),
            pytest.param("0.00", "USD", "0 USD", id="zero"),
        ],
    )
    def test_rendering(self, number: str, currency: str, rendered: str) -> None:
        from decimal import Decimal

        assert _exact_amount(Decimal(number), currency) == rendered

    def test_equal_values_render_alike_and_different_ones_do_not(self) -> None:
        from decimal import Decimal

        assert _exact_amount(Decimal("1.50"), "USD") == _exact_amount(Decimal("1.5"), "USD")
        assert _exact_amount(Decimal("-0.001"), "ETH") != _exact_amount(Decimal("-0.002"), "ETH")
        assert _exact_amount(Decimal("1"), "ETH") != _exact_amount(Decimal("1"), "BTC")


@pytest.mark.parametrize(
    ("first", "second"),
    [
        pytest.param("2026-01-02,-0.001,ETH,Reward\n", "2026-01-02,-0.002,ETH,Reward\n", id="sub-cent-amounts"),
        pytest.param("2026-01-02,-1,ETH,Reward\n", "2026-01-02,-1,BTC,Reward\n", id="distinct-commodities"),
        pytest.param("2026-01-02,-1.01,USD,Reward\n", "2026-01-02,-1.02,USD,Reward\n", id="distinct-cents-control"),
    ],
)
def test_reordering_an_export_does_not_invent_conflicts(tmp_path: Path, first: str, second: str) -> None:
    """The reported defect, plus the cents case that always worked, as a control."""
    ledger = _books(tmp_path)
    forward = _csv(tmp_path, "first.csv", [first, second])
    backward = _csv(tmp_path, "reversed.csv", [second, first])

    assert _counts(_import(tmp_path, ledger, forward)[1]) == {"written": 2, "duplicates": 0, "conflicts": 0}

    before = ledger.read_bytes()
    status, replay = _import(tmp_path, ledger, forward)
    assert status == 0
    assert _counts(replay) == {"written": 0, "duplicates": 2, "conflicts": 0}

    status, reversed_replay = _import(tmp_path, ledger, backward)
    assert status == 0, reversed_replay
    assert _counts(reversed_replay) == {"written": 0, "duplicates": 2, "conflicts": 0}
    assert ledger.read_bytes() == before, "a refused or duplicate replay writes nothing"


def test_distinct_rows_get_distinct_ids(tmp_path: Path) -> None:
    ledger = _books(tmp_path)
    source = _csv(tmp_path, "a.csv", ["2026-01-02,-0.001,ETH,Reward\n", "2026-01-02,-0.002,ETH,Reward\n"])

    _import(tmp_path, ledger, source)

    ids = [line.split('"')[1] for line in ledger.read_text(encoding="utf-8").splitlines() if "import-id" in line]
    assert len(ids) == 2
    assert len(set(ids)) == 2, "sub-cent amounts must not share a generated identity"


def test_n_identical_rows_stay_n_entries_and_replay_idempotently(tmp_path: Path) -> None:
    """The occurrence guarantee the milestone says to preserve."""
    ledger = _books(tmp_path)
    row = "2026-01-02,-5,USD,Same\n"
    source = _csv(tmp_path, "same.csv", [row, row, row])

    status, applied = _import(tmp_path, ledger, source, "--duplicates", "include")
    assert status == 0
    assert applied["written"] == 3

    ids = [line.split('"')[1] for line in ledger.read_text(encoding="utf-8").splitlines() if "import-id" in line]
    assert len(set(ids)) == 3, "each occurrence needs its own id"

    before = ledger.read_bytes()
    status, replay = _import(tmp_path, ledger, source, "--duplicates", "include")
    assert status == 0
    assert _counts(replay) == {"written": 0, "duplicates": 3, "conflicts": 0}
    assert ledger.read_bytes() == before


def _seeded_with_legacy_id(tmp_path: Path, identifier: str) -> Path:
    """A ledger holding an entry written under an older identity format."""
    ledger = _books(tmp_path)
    ledger.write_text(
        ledger.read_text(encoding="utf-8") + f'2026-01-02 * "Coffee"\n  import-id: "{identifier}"\n'
        "  Assets:Cash  -1.25 USD\n  Expenses:Food   1.25 USD\n",
        encoding="utf-8",
    )
    return ledger


def _digest(base: str) -> str:
    return "csv:sha256:" + hashlib.sha256(base.encode("utf-8")).hexdigest()[:16]


def test_an_id_written_before_the_exact_amount_form_still_dedupes(tmp_path: Path) -> None:
    """The pre-exact digest: two decimals, no commodity. It must still match."""
    ledger = _seeded_with_legacy_id(tmp_path, _digest("2026-01-02|-1.25|COFFEE|Assets:Cash"))
    source = _csv(tmp_path, "a.csv", ["2026-01-02,-1.25,USD,Coffee\n"])
    before = ledger.read_bytes()

    status, payload = _import(tmp_path, ledger, source)

    assert status == 0, payload
    assert _counts(payload) == {"written": 0, "duplicates": 1, "conflicts": 0}
    assert ledger.read_bytes() == before, "recognizing an old id must not rewrite history"


def test_a_lossy_legacy_collision_is_not_a_duplicate_and_not_a_conflict(tmp_path: Path) -> None:
    """The reason legacy amount ids are content-checked rather than trusted.

    `-0.002 ETH` hashes, under the old lossy form, to the same digest as the
    `-0.001 ETH` row already in the ledger. Trusting that would silently drop a
    real row; calling it a conflict would block a valid import. It is neither:
    the hit is ignored and the row imports as new.
    """
    ledger = _books(tmp_path)
    ledger.write_text(
        ledger.read_text(encoding="utf-8")
        + f'2026-01-02 * "Reward"\n  import-id: "{_digest("2026-01-02|-0.00|REWARD|Assets:Cash")}"\n'
        "  Assets:Cash  -0.001 ETH\n  Expenses:Food   0.001 ETH\n",
        encoding="utf-8",
    )
    source = _csv(tmp_path, "a.csv", ["2026-01-02,-0.002,ETH,Reward\n"])

    status, payload = _import(tmp_path, ledger, source)

    assert status == 0, payload
    assert _counts(payload) == {"written": 1, "duplicates": 0, "conflicts": 0}


def test_a_reused_native_bank_id_with_changed_data_is_still_a_conflict(tmp_path: Path) -> None:
    """The guard the milestone insists on keeping."""
    ledger = _books(tmp_path)
    header = "Date,Amount,Currency,Description,BankID\n"
    first = tmp_path / "with-id.csv"
    first.write_text(header + "2026-01-02,-5.25,USD,Coffee,bank-1\n", encoding="utf-8")
    changed = tmp_path / "changed.csv"
    changed.write_text(header + "2026-01-02,-99.99,USD,Coffee,bank-1\n", encoding="utf-8")
    mapping = MAPPING + ",id=BankID"

    def run(path: Path) -> tuple[int, dict]:
        done = _bea(
            tmp_path,
            "--json",
            "--no-input",
            "--file",
            str(ledger),
            "import",
            str(path),
            "--csv",
            mapping,
            "--account",
            "Assets:Cash",
            "--default-account",
            "Expenses:Food",
            "--apply",
        )
        if done.returncode == 0:
            return 0, json.loads(done.stdout)["data"]
        return done.returncode, json.loads(done.stderr)["error"]["result"]

    assert run(first)[1]["written"] == 1
    before = ledger.read_bytes()

    status, payload = run(changed)

    assert status == 4, payload
    assert payload["conflicts"] == 1
    assert ledger.read_bytes() == before


def test_equivalent_decimal_spellings_share_an_identity(tmp_path: Path) -> None:
    """`-1.50` and `-1.5` are one amount and must not import twice."""
    ledger = _books(tmp_path)
    padded = _csv(tmp_path, "padded.csv", ["2026-01-02,-1.50,USD,Coffee\n"])
    bare = _csv(tmp_path, "bare.csv", ["2026-01-02,-1.5,USD,Coffee\n"])

    assert _import(tmp_path, ledger, padded)[1]["written"] == 1
    before = ledger.read_bytes()

    status, payload = _import(tmp_path, ledger, bare)

    assert status == 0, payload
    assert _counts(payload) == {"written": 0, "duplicates": 1, "conflicts": 0}
    assert ledger.read_bytes() == before
