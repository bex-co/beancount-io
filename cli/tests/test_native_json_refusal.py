"""Native pass-throughs must reject --json with a parseable usage error (w3/221)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str, stdin: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        input=stdin,
        capture_output=True,
        text=True,
        timeout=30,
    )


def _assert_json_refusal(result: subprocess.CompletedProcess[str], command: str) -> None:
    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert f"bea {command} has no JSON output" in error["message"]


def test_json_doctor_refuses_instead_of_forwarding_click_help(tmp_path: Path) -> None:
    _assert_json_refusal(_bea(tmp_path, "--json", "doctor", "context"), "doctor")


def test_json_example_refuses_instead_of_raw_sample(tmp_path: Path) -> None:
    _assert_json_refusal(_bea(tmp_path, "--json", "example"), "example")


def test_json_treeify_refuses_instead_of_ascii_tree(tmp_path: Path) -> None:
    tree_in = "Assets:Bank:Checking               100\nAssets:Cash                       25\n"
    _assert_json_refusal(_bea(tmp_path, "--json", "treeify", stdin=tree_in), "treeify")


def test_json_price_refuses_instead_of_upstream_text(tmp_path: Path) -> None:
    _assert_json_refusal(_bea(tmp_path, "--json", "price", "-n", "-e", "USD:yahoo/AAPL"), "price")


def test_json_ingest_refuses_instead_of_beangulp_text(tmp_path: Path) -> None:
    script = tmp_path / "ingest.py"
    script.write_text("from beangulp import Ingest\nIngest([])()\n")
    (tmp_path / "bank.csv").write_text("a\n")
    _assert_json_refusal(_bea(tmp_path, "--json", "ingest", "identify", "--config", str(script), "bank.csv"), "ingest")
