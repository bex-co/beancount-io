"""The CLI's setup-catalog copy must match the canonical backend catalog.

ADR026: one canonical catalog, package-local generated copies with a drift
check. The canonical source lives in backend-v2; when a checkout does not
carry it (a packaged test run), this check skips instead of failing.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT.parent / "backend-cluster" / "backend-v2" / "src" / "features" / "ledger" / "setup"

PAIRS = [
    (ROOT / "src" / "bea_engine" / "setup_catalog.json", CANONICAL / "catalog.json"),
    (ROOT / "src" / "bea_engine" / "setup_currencies.json", CANONICAL / "currencies.json"),
]


@pytest.mark.parametrize(("copy", "canonical"), PAIRS, ids=["catalog", "currencies"])
def test_catalog_copy_matches_canonical(copy: Path, canonical: Path) -> None:
    if not canonical.is_file():
        pytest.skip("canonical backend catalog not present in this checkout")
    assert json.loads(copy.read_text(encoding="utf-8")) == json.loads(canonical.read_text(encoding="utf-8"))


def test_catalog_copy_covers_every_preset() -> None:
    catalog = json.loads((ROOT / "src" / "bea_engine" / "setup_catalog.json").read_text(encoding="utf-8"))
    assert [preset["id"] for preset in catalog["presets"]] == [
        "personal@1",
        "freelance@1",
        "business@1",
        "portfolio@1",
        "rental@1",
        "shared-expenses@1",
        "community@1",
        "blank@1",
    ]
