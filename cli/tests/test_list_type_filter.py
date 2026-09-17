"""list event/custom --type filters by directive type (w3/350)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-03-01 event "location" "Paris"
2020-03-02 event "employer" "Acme"
2020-04-01 custom "budget" Assets:Cash 100.00 USD
2020-04-02 custom "fava-option" "theme" "dark"
"""


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
        timeout=60,
    )


def test_list_event_and_custom_type_filter(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    help_text = _bea(tmp_path, "list", "event", "--help")
    assert help_text.returncode == 0
    assert "--type" in help_text.stdout

    events = _bea(tmp_path, "--json", "--file", str(ledger), "list", "event", "--type", "Location")
    assert events.returncode == 0, events.stderr or events.stdout
    rows = json.loads(events.stdout)["data"]
    assert len(rows) == 1
    assert rows[0]["type"] == "location"

    customs = _bea(tmp_path, "--json", "--file", str(ledger), "list", "custom", "--type", "budget")
    assert customs.returncode == 0, customs.stderr or customs.stdout
    crow = json.loads(customs.stdout)["data"]
    assert len(crow) == 1
    assert crow[0]["type"] == "budget"
